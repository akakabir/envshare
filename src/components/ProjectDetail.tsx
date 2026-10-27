import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  db,
  emailToKey,
  arrayUnion,
  arrayRemove,
  handleFirestoreError,
  OperationType,
} from '../firebase.ts';
import { Project, Environment, EnvVariable, UserLookup } from '../types.ts';
import { encryptSensitiveValue, decryptSensitiveValue } from '../crypto.ts';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Crown,
  Trash2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Edit2,
  Search,
  Layers,
  MoreVertical,
  X,
  ExternalLink,
} from 'lucide-react';

interface ProjectDetailProps {
  projectId: string;
  user: FirebaseUser;
  onBack: () => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  projectId,
  user,
  onBack,
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);

  // Active sub-tab in project: 'variables' or 'members'
  const [activeTab, setActiveTab] = useState<'variables' | 'members'>('variables');

  // Environments
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [envLoading, setEnvLoading] = useState(true);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [envModalMode, setEnvModalMode] = useState<'create' | 'rename'>('create');
  const [envNameInput, setEnvNameInput] = useState('');
  const [envActionLoading, setEnvActionLoading] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);

  // Variables
  const [variables, setVariables] = useState<EnvVariable[]>([]);
  const [varLoading, setVarLoading] = useState(false);
  const [varSearch, setVarSearch] = useState('');
  const [isVarModalOpen, setIsVarModalOpen] = useState(false);
  const [editingVar, setEditingVar] = useState<EnvVariable | null>(null);
  const [varKeyInput, setVarKeyInput] = useState('');
  const [varValInput, setVarValInput] = useState('');
  const [varSensitiveInput, setVarSensitiveInput] = useState(false);
  const [varActionLoading, setVarActionLoading] = useState(false);
  const [varError, setVarError] = useState<string | null>(null);

  // Decrypted values cache: { [variableId]: plainText }
  const [revealedValues, setRevealedValues] = useState<{ [id: string]: string }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Member invite state
  const [memberEmail, setMemberEmail] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [memberMessage, setMemberMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // 1. Listen to Project Document
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'projects', projectId),
      (snap) => {
        if (snap.exists()) {
          setProject({ id: snap.id, ...(snap.data() as Omit<Project, 'id'>) });
        } else {
          setProject(null);
        }
        setProjectLoading(false);
      },
      (error) => {
        setProjectLoading(false);
        handleFirestoreError(error, OperationType.GET, `projects/${projectId}`);
      }
    );
    return () => unsub();
  }, [projectId]);

  // 2. Listen to Environments Subcollection
  useEffect(() => {
    const envColRef = collection(db, 'projects', projectId, 'environments');
    const unsub = onSnapshot(
      envColRef,
      (snapshot) => {
        const list: Environment[] = [];
        snapshot.forEach((snap) => {
          list.push({ id: snap.id, ...(snap.data() as Omit<Environment, 'id'>) });
        });
        // Sort: Development, Staging, Production first, then custom alphabetically
        const priorityOrder: { [k: string]: number } = {
          development: 1,
          dev: 1,
          staging: 2,
          stage: 2,
          production: 3,
          prod: 3,
        };
        list.sort((a, b) => {
          const pA = priorityOrder[a.name.toLowerCase()] || 10;
          const pB = priorityOrder[b.name.toLowerCase()] || 10;
          if (pA !== pB) return pA - pB;
          return a.name.localeCompare(b.name);
        });

        setEnvironments(list);
        setEnvLoading(false);

        // Select first environment by default if none selected or if active was deleted
        if (list.length > 0) {
          setActiveEnvId((current) => {
            if (current && list.some((e) => e.id === current)) {
              return current;
            }
            return list[0].id;
          });
        } else {
          setActiveEnvId(null);
        }
      },
      (error) => {
        setEnvLoading(false);
        handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/environments`);
      }
    );

    return () => unsub();
  }, [projectId]);

  // 3. Listen to Variables for Active Environment
  useEffect(() => {
    if (!activeEnvId) {
      setVariables([]);
      setVarLoading(false);
      return;
    }

    setVarLoading(true);
    const varColRef = collection(db, 'projects', projectId, 'environments', activeEnvId, 'variables');
    const unsub = onSnapshot(
      varColRef,
      (snapshot) => {
        const list: EnvVariable[] = [];
        snapshot.forEach((snap) => {
          list.push({ id: snap.id, ...(snap.data() as Omit<EnvVariable, 'id'>) });
        });
        list.sort((a, b) => a.key.localeCompare(b.key));
        setVariables(list);
        setVarLoading(false);
      },
      (error) => {
        setVarLoading(false);
        handleFirestoreError(
          error,
          OperationType.LIST,
          `projects/${projectId}/environments/${activeEnvId}/variables`
        );
      }
    );

    return () => unsub();
  }, [projectId, activeEnvId]);

  // Quick Seed Environment Helper
  const handleQuickCreateEnv = async (name: string) => {
    if (!project) return;
    const envId = 'env_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();
    const envData: Environment = {
      id: envId,
      name,
      projectId,
      memberUids: project.memberUids,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await setDoc(doc(db, 'projects', projectId, 'environments', envId), envData);
      setActiveEnvId(envId);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `projects/${projectId}/environments/${envId}`);
    }
  };

  // Environment Create / Rename
  const handleSaveEnvironment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    const trimmed = envNameInput.trim();
    if (!trimmed) {
      setEnvError('Environment name is required.');
      return;
    }

    // Check duplicate environment name
    const exists = environments.some(
      (env) =>
        env.name.toLowerCase() === trimmed.toLowerCase() &&
        (envModalMode === 'create' || env.id !== activeEnvId)
    );
    if (exists) {
      setEnvError(`An environment named "${trimmed}" already exists.`);
      return;
    }

    setEnvActionLoading(true);
    setEnvError(null);

    try {
      if (envModalMode === 'create') {
        const envId = 'env_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        const now = new Date().toISOString();
        const envData: Environment = {
          id: envId,
          name: trimmed,
          projectId,
          memberUids: project.memberUids,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(doc(db, 'projects', projectId, 'environments', envId), envData);
        setActiveEnvId(envId);
      } else if (envModalMode === 'rename' && activeEnvId) {
        await updateDoc(doc(db, 'projects', projectId, 'environments', activeEnvId), {
          name: trimmed,
          updatedAt: new Date().toISOString(),
        });
      }
      setIsEnvModalOpen(false);
      setEnvNameInput('');
    } catch (err: any) {
      setEnvError(err.message || 'Operation failed');
    } finally {
      setEnvActionLoading(false);
    }
  };

  // Delete Environment
  const handleDeleteEnvironment = async () => {
    if (!activeEnvId) return;
    const envToDelete = environments.find((e) => e.id === activeEnvId);
    if (!envToDelete) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the "${envToDelete.name}" environment? All variables inside it will be permanently deleted.`
    );
    if (!confirmed) return;

    try {
      // Delete all variables inside this environment first
      for (const v of variables) {
        await deleteDoc(
          doc(db, 'projects', projectId, 'environments', activeEnvId, 'variables', v.id)
        );
      }
      // Delete environment document
      await deleteDoc(doc(db, 'projects', projectId, 'environments', activeEnvId));
    } catch (err: any) {
      alert('Failed to delete environment: ' + err.message);
    }
  };

  // Open Variable Modal
  const openCreateVarModal = () => {
    setEditingVar(null);
    setVarKeyInput('');
    setVarValInput('');
    setVarSensitiveInput(false);
    setVarError(null);
    setIsVarModalOpen(true);
  };

  const openEditVarModal = async (v: EnvVariable) => {
    setEditingVar(v);
    setVarKeyInput(v.key);
    setVarSensitiveInput(v.isSensitive);
    setVarError(null);

    // If sensitive, prefill with decrypted value if available or decrypt
    if (v.isSensitive) {
      if (revealedValues[v.id]) {
        setVarValInput(revealedValues[v.id]);
      } else {
        try {
          const decrypted = await decryptSensitiveValue(v.value);
          setVarValInput(decrypted);
          setRevealedValues((prev) => ({ ...prev, [v.id]: decrypted }));
        } catch {
          setVarValInput('');
        }
      }
    } else {
      setVarValInput(v.value);
    }

    setIsVarModalOpen(true);
  };

  // Save Variable (Add or Edit)
  const handleSaveVariable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !activeEnvId) return;

    const rawKey = varKeyInput.trim();
    if (!rawKey) {
      setVarError('Key name is required.');
      return;
    }

    // Letters, numbers, underscores only
    const keyRegex = /^[A-Za-z0-9_]+$/;
    if (!keyRegex.test(rawKey)) {
      setVarError('Invalid key name: only letters, numbers, and underscores are allowed (e.g. DATABASE_PORT).');
      return;
    }

    // Check duplicate key
    const duplicate = variables.some(
      (v) => v.key.toUpperCase() === rawKey.toUpperCase() && (!editingVar || v.id !== editingVar.id)
    );
    if (duplicate) {
      setVarError('This key already exists in this environment.');
      return;
    }

    setVarActionLoading(true);
    setVarError(null);

    try {
      let finalValue = varValInput;
      if (varSensitiveInput) {
        // Encrypt sensitive value using Web Crypto AES-256-GCM + PBKDF2
        finalValue = await encryptSensitiveValue(varValInput);
      }

      const now = new Date().toISOString();

      if (editingVar) {
        // Update existing variable
        const varRef = doc(
          db,
          'projects',
          projectId,
          'environments',
          activeEnvId,
          'variables',
          editingVar.id
        );
        await updateDoc(varRef, {
          key: rawKey,
          value: finalValue,
          isSensitive: varSensitiveInput,
          updatedAt: now,
          updatedBy: user.email || user.uid,
        });

        // Update revealed cache
        if (varSensitiveInput) {
          setRevealedValues((prev) => ({ ...prev, [editingVar.id]: varValInput }));
        } else {
          setRevealedValues((prev) => {
            const next = { ...prev };
            delete next[editingVar.id];
            return next;
          });
        }
      } else {
        // Create new variable
        const varId = 'var_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        const newVarData: EnvVariable = {
          id: varId,
          key: rawKey,
          value: finalValue,
          isSensitive: varSensitiveInput,
          environmentId: activeEnvId,
          projectId,
          memberUids: project.memberUids,
          createdAt: now,
          updatedAt: now,
          updatedBy: user.email || user.uid,
        };

        await setDoc(
          doc(db, 'projects', projectId, 'environments', activeEnvId, 'variables', varId),
          newVarData
        );

        if (varSensitiveInput) {
          setRevealedValues((prev) => ({ ...prev, [varId]: varValInput }));
        }
      }

      setIsVarModalOpen(false);
    } catch (err: any) {
      setVarError(err.message || 'Failed to save variable.');
    } finally {
      setVarActionLoading(false);
    }
  };

  // Toggle Variable Sensitivity Directly
  const handleToggleSensitivity = async (v: EnvVariable) => {
    if (!activeEnvId) return;

    try {
      let newIsSensitive = !v.isSensitive;
      let newValue = v.value;

      if (newIsSensitive) {
        // Switching to sensitive: encrypt plain text
        newValue = await encryptSensitiveValue(v.value);
        setRevealedValues((prev) => ({ ...prev, [v.id]: v.value }));
      } else {
        // Switching to standard: decrypt back to plain text
        const plain = revealedValues[v.id] || (await decryptSensitiveValue(v.value));
        newValue = plain;
        setRevealedValues((prev) => {
          const next = { ...prev };
          delete next[v.id];
          return next;
        });
      }

      const varRef = doc(
        db,
        'projects',
        projectId,
        'environments',
        activeEnvId,
        'variables',
        v.id
      );
      await updateDoc(varRef, {
        isSensitive: newIsSensitive,
        value: newValue,
        updatedAt: new Date().toISOString(),
        updatedBy: user.email || user.uid,
      });
    } catch (err: any) {
      alert('Failed to switch variable type: ' + err.message);
    }
  };

  // Delete Variable
  const handleDeleteVariable = async (v: EnvVariable) => {
    if (!activeEnvId) return;
    const confirmed = window.confirm(`Delete variable "${v.key}"?`);
    if (!confirmed) return;

    try {
      await deleteDoc(
        doc(db, 'projects', projectId, 'environments', activeEnvId, 'variables', v.id)
      );
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[v.id];
        return next;
      });
    } catch (err: any) {
      alert('Failed to delete variable: ' + err.message);
    }
  };

  // Reveal / Hide Sensitive Value
  const handleToggleReveal = async (v: EnvVariable) => {
    if (revealedValues[v.id] !== undefined) {
      // Hide
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[v.id];
        return next;
      });
    } else {
      // Reveal: decrypt
      try {
        const decrypted = await decryptSensitiveValue(v.value);
        setRevealedValues((prev) => ({ ...prev, [v.id]: decrypted }));
      } catch (err: any) {
        alert('Could not decrypt value: ' + err.message);
      }
    }
  };

  // Copy Value
  const handleCopyValue = async (v: EnvVariable) => {
    try {
      let textToCopy = v.value;
      if (v.isSensitive) {
        if (revealedValues[v.id]) {
          textToCopy = revealedValues[v.id];
        } else {
          textToCopy = await decryptSensitiveValue(v.value);
        }
      }
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(v.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy value:', err);
    }
  };

  // Add Member to Project
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberMessage(null);

    const emailTrimmed = memberEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      setMemberMessage({ type: 'error', text: 'Please enter an email address.' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setMemberMessage({ type: 'error', text: 'Invalid email address format.' });
      return;
    }
    if (!project) return;
    if (emailTrimmed === project.ownerEmail.toLowerCase()) {
      setMemberMessage({ type: 'error', text: 'This user is already the project creator.' });
      return;
    }
    if (project.memberEmails.map((m) => m.toLowerCase()).includes(emailTrimmed)) {
      setMemberMessage({ type: 'error', text: 'This user is already a member of this project.' });
      return;
    }

    setAddLoading(true);

    try {
      const lookupKey = emailToKey(emailTrimmed);
      const lookupRef = doc(db, 'userLookup', lookupKey);
      const lookupSnap = await getDoc(lookupRef);

      if (!lookupSnap.exists()) {
        setMemberMessage({
          type: 'error',
          text: `No registered user found with email "${emailTrimmed}". They must sign up for EnvShare first before being invited.`,
        });
        setAddLoading(false);
        return;
      }

      const foundUserData = lookupSnap.data() as UserLookup;
      const projectRef = doc(db, 'projects', projectId);

      // Update project member list
      await updateDoc(projectRef, {
        memberUids: arrayUnion(foundUserData.uid),
        memberEmails: arrayUnion(emailTrimmed),
        updatedAt: new Date().toISOString(),
      });

      // Also update environments & variables memberUids so new member has immediate read access
      for (const env of environments) {
        await updateDoc(doc(db, 'projects', projectId, 'environments', env.id), {
          memberUids: arrayUnion(foundUserData.uid),
        });
      }

      setMemberMessage({ type: 'success', text: `Added ${emailTrimmed} to project successfully.` });
      setMemberEmail('');
    } catch (err: any) {
      setMemberMessage({ type: 'error', text: err.message || 'Failed to add member.' });
    } finally {
      setAddLoading(false);
    }
  };

  // Remove Member
  const handleRemoveMember = async (emailToRemove: string) => {
    if (!project) return;
    if (emailToRemove === project.ownerEmail) return;

    const confirmed = window.confirm(
      `Remove ${emailToRemove} from this project? They will lose access to its environment variables.`
    );
    if (!confirmed) return;

    setMemberMessage(null);

    try {
      const lookupKey = emailToKey(emailToRemove);
      const lookupRef = doc(db, 'userLookup', lookupKey);
      const lookupSnap = await getDoc(lookupRef);
      const memberUid = lookupSnap.exists() ? (lookupSnap.data() as UserLookup).uid : null;

      const projectRef = doc(db, 'projects', projectId);
      const updates: any = {
        memberEmails: arrayRemove(emailToRemove),
        updatedAt: new Date().toISOString(),
      };
      if (memberUid) {
        updates.memberUids = arrayRemove(memberUid);
      }

      await updateDoc(projectRef, updates);

      // Remove from environments
      if (memberUid) {
        for (const env of environments) {
          await updateDoc(doc(db, 'projects', projectId, 'environments', env.id), {
            memberUids: arrayRemove(memberUid),
          });
        }
      }

      setMemberMessage({ type: 'success', text: `Removed ${emailToRemove} from project.` });
    } catch (err: any) {
      setMemberMessage({ type: 'error', text: err.message || 'Failed to remove member.' });
    }
  };

  if (projectLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 rounded w-1/4" />
        <div className="h-28 bg-white rounded-xl border border-slate-200" />
        <div className="h-64 bg-white rounded-xl border border-slate-200" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Project Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">
          This project may have been deleted or you do not have permission to view it.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>
    );
  }

  const isOwner = project.ownerId === user.uid;
  const activeEnv = environments.find((e) => e.id === activeEnvId);

  const filteredVariables = variables.filter((v) =>
    v.key.toLowerCase().includes(varSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-5 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Projects</span>
      </button>

      {/* Project Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {project.name}
              </h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                  isOwner
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {isOwner ? 'Creator' : 'Collaborator'}
              </span>
            </div>
            <p className="text-sm text-slate-500 max-w-2xl">
              {project.description || 'No project description provided.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400 text-right hidden sm:block">
              <div>Creator: <span className="text-slate-600 font-medium">{project.ownerEmail}</span></div>
              <div className="mt-0.5">Updated {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Variables vs Members) */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('variables')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === 'variables'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Variables & Environments</span>
            {variables.length > 0 && activeTab === 'variables' && (
              <span className="bg-slate-700 text-slate-200 px-1.5 py-0.2 rounded text-[10px]">
                {variables.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === 'members'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Members</span>
            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded text-[10px]">
              {project.memberEmails.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: ENVIRONMENTS & VARIABLES */}
      {activeTab === 'variables' && (
        <div className="space-y-6">
          {/* Environments Tab Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {environments.map((env) => {
                const isActive = env.id === activeEnvId;
                return (
                  <button
                    key={env.id}
                    onClick={() => setActiveEnvId(env.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{env.name}</span>
                  </button>
                );
              })}

              {/* Add Environment Button */}
              <button
                onClick={() => {
                  setEnvModalMode('create');
                  setEnvNameInput('');
                  setEnvError(null);
                  setIsEnvModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-dashed border-slate-300 transition cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Environment</span>
              </button>
            </div>

            {/* Active Environment Actions (Rename / Delete) */}
            {activeEnv && (
              <div className="flex items-center gap-2 self-end sm:self-auto ml-auto">
                <button
                  onClick={() => {
                    setEnvModalMode('rename');
                    setEnvNameInput(activeEnv.name);
                    setEnvError(null);
                    setIsEnvModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  title="Rename Environment"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Rename</span>
                </button>

                <button
                  onClick={handleDeleteEnvironment}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  title="Delete Environment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            )}
          </div>

          {/* If No Environments Exist: Quick Setup Callout */}
          {environments.length === 0 && !envLoading ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                No Environments Configured
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Create an environment to organize your variables for different deployment targets.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => handleQuickCreateEnv('Development')}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                >
                  + Add Development
                </button>
                <button
                  onClick={() => handleQuickCreateEnv('Staging')}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                >
                  + Add Staging
                </button>
                <button
                  onClick={() => handleQuickCreateEnv('Production')}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                >
                  + Add Production
                </button>
              </div>
            </div>
          ) : activeEnv ? (
            /* Variables Management Section */
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Header / Actions toolbar */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={varSearch}
                      onChange={(e) => setVarSearch(e.target.value)}
                      placeholder="Search variables by key..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    {variables.length} {variables.length === 1 ? 'variable' : 'variables'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={openCreateVarModal}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Variable</span>
                  </button>
                </div>
              </div>

              {/* Variables Table / List */}
              {varLoading ? (
                <div className="p-8 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredVariables.length === 0 ? (
                <div className="p-12 text-center">
                  <KeyRound className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    {varSearch ? 'No matching variables found' : 'No variables in this environment'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    {varSearch
                      ? 'Try clearing your search term'
                      : 'Add your first environment variable key-value pair.'}
                  </p>
                  {!varSearch && (
                    <button
                      onClick={openCreateVarModal}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Variable</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Key</th>
                        <th className="py-3 px-4">Value</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredVariables.map((v) => {
                        const isRevealed = revealedValues[v.id] !== undefined;
                        const isCopied = copiedId === v.id;

                        return (
                          <tr key={v.id} className="hover:bg-slate-50/80 transition-colors group">
                            {/* Key Column */}
                            <td className="py-3 px-4 font-mono font-semibold text-slate-900 select-all max-w-[200px] truncate">
                              {v.key}
                            </td>

                            {/* Value Column */}
                            <td className="py-3 px-4 font-mono text-slate-700 max-w-[340px]">
                              {v.isSensitive ? (
                                <div className="flex items-center gap-2">
                                  {isRevealed ? (
                                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 break-all select-all">
                                      {revealedValues[v.id]}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 tracking-widest select-none">
                                      ••••••••••••••••
                                    </span>
                                  )}

                                  <button
                                    onClick={() => handleToggleReveal(v)}
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                                    title={isRevealed ? 'Mask value' : 'Reveal sensitive value'}
                                  >
                                    {isRevealed ? (
                                      <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-600" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="select-all break-all text-slate-800">
                                  {v.value || <span className="text-slate-400 italic font-sans">empty</span>}
                                </span>
                              )}
                            </td>

                            {/* Type Column (Toggleable Standard vs Sensitive) */}
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleToggleSensitivity(v)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                                  v.isSensitive
                                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                }`}
                                title="Click to switch between Standard and AES-256-GCM Sensitive"
                              >
                                {v.isSensitive ? (
                                  <>
                                    <Lock className="w-3 h-3 text-amber-600" />
                                    <span>Sensitive</span>
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="w-3 h-3 text-slate-400" />
                                    <span>Standard</span>
                                  </>
                                )}
                              </button>
                            </td>

                            {/* Actions Column */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* Copy Button */}
                                <button
                                  onClick={() => handleCopyValue(v)}
                                  className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                                    isCopied
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                  title="Copy variable value"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-[10px] font-semibold text-emerald-700">Copied</span>
                                    </>
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                {/* Edit Button */}
                                <button
                                  onClick={() => openEditVarModal(v)}
                                  className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
                                  title="Edit variable"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Button */}
                                <button
                                  onClick={() => handleDeleteVariable(v)}
                                  className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition cursor-pointer"
                                  title="Delete variable"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 2: TEAM MEMBERS (Step 1 requirement preserved and enhanced) */}
      {activeTab === 'members' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">Project Members</h2>
                </div>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {project.memberEmails.length} {project.memberEmails.length === 1 ? 'member' : 'members'}
                </span>
              </div>

              <p className="text-xs text-slate-500 mb-6">
                Only authenticated members can view, copy, decrypt, or update variables in this project.
              </p>

              {memberMessage && (
                <div
                  className={`mb-5 rounded-lg p-3.5 flex items-start gap-2.5 text-xs ${
                    memberMessage.type === 'error'
                      ? 'bg-rose-50 border border-rose-200 text-rose-800'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  }`}
                >
                  {memberMessage.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <span>{memberMessage.text}</span>
                </div>
              )}

              {isOwner ? (
                <form onSubmit={handleAddMember} className="mb-6 pb-6 border-b border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Invite registered user by email
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="teammate@company.com"
                      disabled={addLoading}
                      className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
                    />
                    <button
                      type="submit"
                      disabled={addLoading || !memberEmail.trim()}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 shadow-sm transition cursor-pointer"
                    >
                      {addLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Add Member</span>
                        </>
                      )}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1.5 block">
                    User must already have signed up for EnvShare.
                  </span>
                </form>
              ) : (
                <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>You have collaborator access. Only the project creator can invite or remove members.</span>
                </div>
              )}

              {/* Members List */}
              <div className="divide-y divide-slate-100">
                {project.memberEmails.map((email) => {
                  const isProjectOwner = email.toLowerCase() === project.ownerEmail.toLowerCase();
                  const isSelf = email.toLowerCase() === user.email?.toLowerCase();

                  return (
                    <div key={email} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                            isProjectOwner ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isProjectOwner ? <Crown className="w-4 h-4 text-amber-600" /> : email.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 truncate">{email}</p>
                            {isSelf && (
                              <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                                you
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {isProjectOwner ? 'Project Creator' : 'Collaborator'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            isProjectOwner
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {isProjectOwner ? 'Owner' : 'Editor'}
                        </span>

                        {isOwner && !isProjectOwner && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(email)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title={`Remove ${email}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Security Architecture
              </h3>
              <ul className="text-xs text-slate-600 space-y-2.5">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span>
                    <strong>PBKDF2 Key Derivation:</strong> Derived with SHA-256 and 310,000 iterations per standard.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span>
                    <strong>AES-256-GCM:</strong> Sensitive values are encrypted in the client browser with random 16B salt and 12B IV.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span>
                    <strong>Zero Plaintext Storage:</strong> Firestore stores only combined Base64 ciphertext for sensitive variables.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ENVIRONMENT MODAL (CREATE / RENAME) */}
      {isEnvModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {envModalMode === 'create' ? 'Create Environment' : 'Rename Environment'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {envModalMode === 'create'
                ? 'Name this deployment stage (e.g. Development, Staging, QA).'
                : 'Enter the new name for this environment.'}
            </p>

            {envError && (
              <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                {envError}
              </div>
            )}

            <form onSubmit={handleSaveEnvironment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Environment Name
                </label>
                <input
                  type="text"
                  value={envNameInput}
                  onChange={(e) => setEnvNameInput(e.target.value)}
                  placeholder="e.g. Staging"
                  required
                  autoFocus
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEnvModalOpen(false)}
                  disabled={envActionLoading}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={envActionLoading || !envNameInput.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition cursor-pointer"
                >
                  {envActionLoading ? 'Saving...' : envModalMode === 'create' ? 'Create' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VARIABLE MODAL (ADD / EDIT) */}
      {isVarModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-900">
                {editingVar ? 'Edit Environment Variable' : 'Add Environment Variable'}
              </h3>
              <button
                onClick={() => setIsVarModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Target environment: <span className="font-semibold text-slate-700">{activeEnv?.name}</span>
            </p>

            {varError && (
              <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{varError}</span>
              </div>
            )}

            <form onSubmit={handleSaveVariable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Key Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={varKeyInput}
                  onChange={(e) => setVarKeyInput(e.target.value.toUpperCase())}
                  placeholder="e.g. DATABASE_PORT"
                  required
                  autoFocus
                  maxLength={150}
                  className="w-full px-3.5 py-2 font-mono text-xs rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Letters, numbers, and underscores only.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Value
                </label>
                <textarea
                  value={varValInput}
                  onChange={(e) => setVarValInput(e.target.value)}
                  placeholder="e.g. 5432 or postgres://user:pass@host:5432/db"
                  rows={3}
                  className="w-full px-3.5 py-2 font-mono text-xs rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Sensitivity Toggle */}
              <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    {varSensitiveInput ? (
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>Sensitive Variable</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {varSensitiveInput
                      ? 'Encrypted with AES-256-GCM. Stored as ciphertext, masked by default.'
                      : 'Stored in plain text. Recommended for non-secret configuration.'}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                  <input
                    type="checkbox"
                    checked={varSensitiveInput}
                    onChange={(e) => setVarSensitiveInput(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVarModalOpen(false)}
                  disabled={varActionLoading}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={varActionLoading || !varKeyInput.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition cursor-pointer"
                >
                  {varActionLoading ? 'Saving...' : editingVar ? 'Update Variable' : 'Save Variable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
