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
import { Project, Environment, EnvVariable, HistoryEntry, UserLookup } from '../types.ts';
import {
  encryptSensitiveValue,
  decryptSensitiveValue,
  generateEncryptionKey,
  getProjectPassphrase,
  setProjectPassphrase,
} from '../crypto.ts';
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
  X,
  History,
  FileText,
  Clock,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Sprout,
  Leaf,
} from 'lucide-react';

interface ProjectDetailProps {
  projectId: string;
  user: FirebaseUser;
  onBack: () => void;
}

export const SENSITIVE_KEY_PATTERN = /(SECRET|PASSWORD|PASSWD|TOKEN|API_KEY|PRIVATE|CREDENTIAL|AUTH|DATABASE_URL|CONNECTION_STRING|SALT|SIGNING|ACCESS_KEY)/i;

interface ParsedImportItem {
  key: string;
  value: string;
  status: 'new' | 'update' | 'unchanged';
  oldValue?: string;
  existingVar?: EnvVariable;
  makeSensitive?: boolean;
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

  // Smart Paste Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStep, setImportStep] = useState<'input' | 'review'>('input');
  const [importParsedItems, setImportParsedItems] = useState<ParsedImportItem[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importParsing, setImportParsing] = useState(false);
  const [importApplying, setImportApplying] = useState(false);

  // Project Encryption Key State
  const [isPassphraseModalOpen, setIsPassphraseModalOpen] = useState(false);
  const [projectKeyInput, setProjectKeyInput] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);
  const [keySavedMsg, setKeySavedMsg] = useState(false);

  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  // 4. Listen to History for Active Environment
  useEffect(() => {
    if (!activeEnvId || !isHistoryOpen) {
      setHistoryEntries([]);
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);
    const historyColRef = collection(db, 'projects', projectId, 'environments', activeEnvId, 'history');
    const unsub = onSnapshot(
      historyColRef,
      (snapshot) => {
        const list: HistoryEntry[] = [];
        snapshot.forEach((snap) => {
          list.push({ id: snap.id, ...(snap.data() as Omit<HistoryEntry, 'id'>) });
        });
        // Sort newest first
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setHistoryEntries(list);
        setHistoryLoading(false);
      },
      (error) => {
        setHistoryLoading(false);
        handleFirestoreError(
          error,
          OperationType.LIST,
          `projects/${projectId}/environments/${activeEnvId}/history`
        );
      }
    );

    return () => unsub();
  }, [projectId, activeEnvId, isHistoryOpen]);

  // Log Change History Helper (never stores sensitive values in plain text!)
  const recordHistory = async (
    key: string,
    action: 'create' | 'update' | 'delete' | 'toggle_sensitivity' | 'import',
    actionLabel: string,
    isSensitive: boolean,
    oldValue?: string,
    newValue?: string
  ) => {
    if (!project || !activeEnvId) return;
    const historyId = 'hist_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    // Mask sensitive values in history log
    const safeOldValue = isSensitive && oldValue ? '••••••••' : oldValue;
    const safeNewValue = isSensitive && newValue ? '••••••••' : newValue;

    const entry: HistoryEntry = {
      id: historyId,
      projectId,
      environmentId: activeEnvId,
      memberUids: project.memberUids,
      key,
      action,
      actionLabel,
      oldValue: safeOldValue,
      newValue: safeNewValue,
      isSensitive,
      userId: user.uid,
      userEmail: user.email || 'user',
      timestamp: new Date().toISOString(),
    };

    try {
      await setDoc(
        doc(db, 'projects', projectId, 'environments', activeEnvId, 'history', historyId),
        entry
      );
    } catch (err) {
      console.error('Failed to record history log:', err);
    }
  };

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
      for (const v of variables) {
        await deleteDoc(
          doc(db, 'projects', projectId, 'environments', activeEnvId, 'variables', v.id)
        );
      }
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

    if (v.isSensitive) {
      if (revealedValues[v.id]) {
        setVarValInput(revealedValues[v.id]);
      } else {
        try {
          const decrypted = await decryptSensitiveValue(v.value, projectId);
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

    const keyRegex = /^[A-Za-z0-9_]+$/;
    if (!keyRegex.test(rawKey)) {
      setVarError('Invalid key name: only letters, numbers, and underscores are allowed (e.g. DATABASE_PORT).');
      return;
    }

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
        finalValue = await encryptSensitiveValue(varValInput, projectId);
      }

      const now = new Date().toISOString();

      if (editingVar) {
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

        // Record history log
        const oldPlain = editingVar.isSensitive ? (revealedValues[editingVar.id] || '[Sensitive value]') : editingVar.value;
        await recordHistory(
          rawKey,
          'update',
          'Updated variable value',
          varSensitiveInput || editingVar.isSensitive,
          oldPlain,
          varValInput
        );

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

        // Record history log
        await recordHistory(
          rawKey,
          'create',
          'Created variable',
          varSensitiveInput,
          undefined,
          varValInput
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

  // Toggle Variable Sensitivity
  const handleToggleSensitivity = async (v: EnvVariable) => {
    if (!activeEnvId) return;

    try {
      const newIsSensitive = !v.isSensitive;
      let newValue = v.value;
      let oldDisplay = v.value;

      if (newIsSensitive) {
        newValue = await encryptSensitiveValue(v.value, projectId);
        setRevealedValues((prev) => ({ ...prev, [v.id]: v.value }));
      } else {
        const plain = revealedValues[v.id] || (await decryptSensitiveValue(v.value, projectId));
        newValue = plain;
        oldDisplay = plain;
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

      // Record history
      await recordHistory(
        v.key,
        'toggle_sensitivity',
        newIsSensitive ? 'Switched to Sensitive' : 'Switched to Standard',
        true,
        oldDisplay,
        newValue
      );
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

      // Record history
      await recordHistory(
        v.key,
        'delete',
        'Deleted variable',
        v.isSensitive,
        v.isSensitive ? '••••••••' : v.value,
        undefined
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
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[v.id];
        return next;
      });
    } else {
      try {
        const decrypted = await decryptSensitiveValue(v.value, projectId);
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
          textToCopy = await decryptSensitiveValue(v.value, projectId);
        }
      }
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(v.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy value:', err);
    }
  };

  // ==========================================
  // PART 4: SMART PASTE IMPORT LOGIC
  // ==========================================
  const handleParseImport = async () => {
    setImportError(null);
    const text = importText;
    if (!text.trim()) {
      setImportError('Please paste your .env content in the text area.');
      return;
    }

    setImportParsing(true);
    const lines = text.split('\n');
    const parsedMap = new Map<string, { key: string; value: string }>();

    // Parse lines
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      let line = lines[i].trim();

      // Strip leading 'export '
      if (/^export\s+/.test(line)) {
        line = line.replace(/^export\s+/, '').trim();
      }

      // Ignore empty lines and lines starting with #
      if (!line || line.startsWith('#')) {
        continue;
      }

      const eqIndex = line.indexOf('=');
      if (eqIndex === -1) {
        setImportError(`Line ${lineNum}: missing '='`);
        setImportParsing(false);
        return;
      }

      const rawKey = line.slice(0, eqIndex).trim();
      if (!rawKey) {
        setImportError(`Line ${lineNum}: key name cannot be empty before '='`);
        setImportParsing(false);
        return;
      }

      const keyRegex = /^[A-Za-z0-9_]+$/;
      if (!keyRegex.test(rawKey)) {
        setImportError(
          `Line ${lineNum}: invalid key name '${rawKey}'. Keys can only contain letters, numbers, and underscores.`
        );
        setImportParsing(false);
        return;
      }

      let rawValue = line.slice(eqIndex + 1).trim();

      // Handle quoted vs unquoted values
      if (rawValue.startsWith('"') || rawValue.startsWith("'")) {
        const quote = rawValue[0];
        let closingIndex = -1;
        for (let j = 1; j < rawValue.length; j++) {
          if (rawValue[j] === quote && rawValue[j - 1] !== '\\') {
            closingIndex = j;
            break;
          }
        }
        if (closingIndex !== -1) {
          // Inside quotes is the value. Comments outside quotes are ignored.
          rawValue = rawValue.slice(1, closingIndex);
        } else if (rawValue.endsWith(quote) && rawValue.length >= 2) {
          rawValue = rawValue.slice(1, -1);
        }
      } else {
        // Unquoted value: Strip inline comments (` # note`)
        rawValue = rawValue.replace(/\s+#.*$/, '').trim();
      }

      // If the same key appears twice in the pasted block, the last one wins
      parsedMap.set(rawKey.toUpperCase(), { key: rawKey, value: rawValue });
    }

    const parsed = Array.from(parsedMap.values());

    if (parsed.length === 0) {
      setImportError('No valid variable definitions found. Make sure lines follow KEY=VALUE format.');
      setImportParsing(false);
      return;
    }

    // Compare with existing variables
    try {
      const items: ParsedImportItem[] = [];

      for (const item of parsed) {
        const existing = variables.find(
          (v) => v.key.toUpperCase() === item.key.toUpperCase()
        );

        if (!existing) {
          // 🟢 New
          const isSens = SENSITIVE_KEY_PATTERN.test(item.key);
          items.push({
            key: item.key,
            value: item.value,
            status: 'new',
            makeSensitive: isSens,
          });
        } else {
          // Existing: compare value (decrypt if sensitive)
          let currentPlain = existing.value;
          if (existing.isSensitive) {
            try {
              currentPlain = revealedValues[existing.id] || (await decryptSensitiveValue(existing.value, projectId));
            } catch {
              currentPlain = '[Encrypted Value]';
            }
          }

          if (currentPlain === item.value) {
            // ⚪ Unchanged
            items.push({
              key: item.key,
              value: item.value,
              status: 'unchanged',
              oldValue: currentPlain,
              existingVar: existing,
            });
          } else {
            // 🟡 Update
            items.push({
              key: item.key,
              value: item.value,
              status: 'update',
              oldValue: currentPlain,
              existingVar: existing,
            });
          }
        }
      }

      setImportParsedItems(items);
      setImportStep('review');
    } catch (err: any) {
      setImportError('Failed to compare variables: ' + err.message);
    } finally {
      setImportParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!project || !activeEnvId) return;

    setImportApplying(true);
    setImportError(null);

    const now = new Date().toISOString();
    const toApply = importParsedItems.filter(
      (item) => item.status === 'new' || item.status === 'update'
    );

    try {
      for (const item of toApply) {
        if (item.status === 'new') {
          const isSens = !!item.makeSensitive;
          let finalVal = item.value;
          if (isSens) {
            finalVal = await encryptSensitiveValue(item.value, projectId);
          }

          const varId = 'var_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          const newVar: EnvVariable = {
            id: varId,
            key: item.key,
            value: finalVal,
            isSensitive: isSens,
            environmentId: activeEnvId,
            projectId,
            memberUids: project.memberUids,
            createdAt: now,
            updatedAt: now,
            updatedBy: user.email || user.uid,
          };

          await setDoc(
            doc(db, 'projects', projectId, 'environments', activeEnvId, 'variables', varId),
            newVar
          );

          if (isSens) {
            setRevealedValues((prev) => ({ ...prev, [varId]: item.value }));
          }

          // Log history
          await recordHistory(
            item.key,
            'import',
            'Imported new variable (.env)',
            isSens,
            undefined,
            isSens ? '••••••••' : item.value
          );
        } else if (item.status === 'update' && item.existingVar) {
          // Updated variable: keep sensitive status
          const isSens = item.existingVar.isSensitive;
          let finalVal = item.value;
          if (isSens) {
            finalVal = await encryptSensitiveValue(item.value, projectId);
            setRevealedValues((prev) => ({ ...prev, [item.existingVar!.id]: item.value }));
          }

          const varRef = doc(
            db,
            'projects',
            projectId,
            'environments',
            activeEnvId,
            'variables',
            item.existingVar.id
          );
          await updateDoc(varRef, {
            value: finalVal,
            updatedAt: now,
            updatedBy: user.email || user.uid,
          });

          // Log history
          await recordHistory(
            item.key,
            'import',
            'Imported updated value (.env)',
            isSens,
            item.oldValue,
            isSens ? '••••••••' : item.value
          );
        }
      }

      setIsImportModalOpen(false);
      setImportText('');
      setImportStep('input');
      setImportParsedItems([]);
    } catch (err: any) {
      setImportError('Failed to apply import changes: ' + err.message);
    } finally {
      setImportApplying(false);
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

      await updateDoc(projectRef, {
        memberUids: arrayUnion(foundUserData.uid),
        memberEmails: arrayUnion(emailTrimmed),
        updatedAt: new Date().toISOString(),
      });

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
        <div className="h-8 bg-stone-200 rounded-full w-1/4" />
        <div className="h-28 bg-white rounded-2xl border border-stone-200" />
        <div className="h-64 bg-white rounded-2xl border border-stone-200" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">Project Not Found</h2>
        <p className="text-sm text-stone-500 mb-6">
          This project may have been deleted or you do not have permission to view it.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-full text-white bg-emerald-700 hover:bg-emerald-800 transition cursor-pointer"
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

  const newImportCount = importParsedItems.filter((i) => i.status === 'new').length;
  const updateImportCount = importParsedItems.filter((i) => i.status === 'update').length;
  const unchangedImportCount = importParsedItems.filter((i) => i.status === 'unchanged').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 mb-5 transition cursor-pointer px-3 py-1.5 rounded-full hover:bg-stone-100"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Projects</span>
      </button>

      {/* Project Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                {project.name}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  isOwner
                    ? 'bg-amber-900/10 text-amber-900 border-amber-800/30'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {isOwner ? 'Creator' : 'Collaborator'}
              </span>
            </div>
            <p className="text-sm text-stone-500 max-w-2xl">
              {project.description || 'No project description provided.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setProjectKeyInput(getProjectPassphrase(projectId));
                setKeySavedMsg(false);
                setKeyCopied(false);
                setIsPassphraseModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition cursor-pointer"
              title="View encryption details"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-700" />
              <span>Vault Key</span>
            </button>
            <div className="text-xs text-stone-400 text-right hidden sm:block">
              <div>Creator: <span className="text-stone-700 font-medium">{project.ownerEmail}</span></div>
              <div className="mt-0.5">Updated {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Variables vs Members) */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-stone-100">
          <button
            onClick={() => setActiveTab('variables')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition cursor-pointer ${
              activeTab === 'variables'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Variables & Environments</span>
            {variables.length > 0 && activeTab === 'variables' && (
              <span className="bg-stone-700 text-stone-200 px-1.5 py-0.2 rounded-full text-[10px]">
                {variables.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition cursor-pointer ${
              activeTab === 'members'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Members</span>
            <span className="bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded-full text-[10px]">
              {project.memberEmails.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: ENVIRONMENTS & VARIABLES */}
      {activeTab === 'variables' && (
        <div className="space-y-6">
          {/* Environments Tab Bar */}
          <div className="bg-white rounded-2xl border border-stone-200 p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {environments.map((env) => {
                const isActive = env.id === activeEnvId;
                return (
                  <button
                    key={env.id}
                    onClick={() => setActiveEnvId(env.id)}
                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                    }`}
                  >
                    <span>{env.name}</span>
                  </button>
                );
              })}

              <button
                onClick={() => {
                  setEnvModalMode('create');
                  setEnvNameInput('');
                  setEnvError(null);
                  setIsEnvModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 border border-dashed border-stone-300 transition cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Environment</span>
              </button>
            </div>

            {/* Active Environment Actions */}
            {activeEnv && (
              <div className="flex items-center gap-2 self-end sm:self-auto ml-auto">
                {/* History Button (Part 5) */}
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-full shadow-xs transition cursor-pointer"
                  title="View Change History"
                >
                  <History className="w-3.5 h-3.5 text-emerald-700" />
                  <span>History</span>
                </button>

                {/* Import .env Button (Part 4) */}
                <button
                  onClick={() => {
                    setImportText('');
                    setImportStep('input');
                    setImportError(null);
                    setImportParsedItems([]);
                    setIsImportModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-full shadow-xs transition cursor-pointer"
                  title="Import .env file"
                >
                  <FileText className="w-3.5 h-3.5 text-stone-500" />
                  <span>Import .env</span>
                </button>

                {/* Rename */}
                <button
                  onClick={() => {
                    setEnvModalMode('rename');
                    setEnvNameInput(activeEnv.name);
                    setEnvError(null);
                    setIsEnvModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition cursor-pointer"
                  title="Rename Environment"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Rename</span>
                </button>

                {/* Delete */}
                <button
                  onClick={handleDeleteEnvironment}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-full transition cursor-pointer"
                  title="Delete Environment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            )}
          </div>

          {/* If No Environments Exist */}
          {environments.length === 0 && !envLoading ? (
            <div className="bg-white rounded-3xl border border-dashed border-stone-300 p-12 text-center max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-1">
                No Environments Configured
              </h3>
              <p className="text-xs text-stone-500 mb-6">
                Create an environment to organize your variables for different deployment targets.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => handleQuickCreateEnv('Development')}
                  className="px-4 py-2 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                >
                  + Add Development
                </button>
                <button
                  onClick={() => handleQuickCreateEnv('Staging')}
                  className="px-4 py-2 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                >
                  + Add Staging
                </button>
                <button
                  onClick={() => handleQuickCreateEnv('Production')}
                  className="px-4 py-2 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                >
                  + Add Production
                </button>
              </div>
            </div>
          ) : activeEnv ? (
            /* Variables Table Section */
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={varSearch}
                      onChange={(e) => setVarSearch(e.target.value)}
                      placeholder="Search variables by key..."
                      className="w-full pl-9 pr-3.5 py-1.5 rounded-full border border-stone-300 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                    />
                  </div>
                  <span className="text-xs text-stone-400 hidden sm:inline">
                    {variables.length} {variables.length === 1 ? 'variable' : 'variables'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={openCreateVarModal}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 shadow-sm transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Variable</span>
                  </button>
                </div>
              </div>

              {varLoading ? (
                <div className="p-8 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-stone-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredVariables.length === 0 ? (
                <div className="p-12 text-center">
                  <KeyRound className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-stone-700">
                    {varSearch ? 'No matching variables found' : 'No variables in this environment'}
                  </p>
                  <p className="text-xs text-stone-400 mt-1 mb-4">
                    {varSearch
                      ? 'Try clearing your search term'
                      : 'Add your first environment variable or import a .env block.'}
                  </p>
                  {!varSearch && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={openCreateVarModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full text-white bg-emerald-700 hover:bg-emerald-800 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Variable</span>
                      </button>
                      <button
                        onClick={() => {
                          setImportText('');
                          setImportStep('input');
                          setImportError(null);
                          setImportParsedItems([]);
                          setIsImportModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 transition cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-stone-500" />
                        <span>Import .env</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Key</th>
                        <th className="py-3 px-4">Value</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-xs">
                      {filteredVariables.map((v) => {
                        const isRevealed = revealedValues[v.id] !== undefined;
                        const isCopied = copiedId === v.id;

                        return (
                          <tr key={v.id} className="hover:bg-stone-50/80 transition-colors group">
                            <td className="py-3 px-4 font-mono font-semibold text-stone-900 select-all max-w-[200px] truncate">
                              {v.key}
                            </td>

                            <td className="py-3 px-4 font-mono text-stone-700 max-w-[340px]">
                              {v.isSensitive ? (
                                <div className="flex items-center gap-2">
                                  {isRevealed ? (
                                    <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 break-all select-all font-mono">
                                      {revealedValues[v.id]}
                                    </span>
                                  ) : (
                                    <span className="text-stone-400 tracking-widest select-none">
                                      ••••••••••••••••
                                    </span>
                                  )}

                                  <button
                                    onClick={() => handleToggleReveal(v)}
                                    className="p-1 text-stone-400 hover:text-stone-700 rounded transition cursor-pointer"
                                    title={isRevealed ? 'Mask value' : 'Reveal sensitive value'}
                                  >
                                    {isRevealed ? (
                                      <EyeOff className="w-3.5 h-3.5 text-stone-600" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5 text-stone-400 hover:text-emerald-700" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="select-all break-all text-stone-800">
                                  {v.value || <span className="text-stone-400 italic font-sans">empty</span>}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleToggleSensitivity(v)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                                  v.isSensitive
                                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                    : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
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
                                    <Unlock className="w-3 h-3 text-stone-400" />
                                    <span>Standard</span>
                                  </>
                                )}
                              </button>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleCopyValue(v)}
                                  className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                                    isCopied
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-white hover:bg-stone-100 text-stone-600 border-stone-200'
                                  }`}
                                  title="Copy variable value"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-[10px] font-semibold text-emerald-800">Copied</span>
                                    </>
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                <button
                                  onClick={() => openEditVarModal(v)}
                                  className="p-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 transition cursor-pointer"
                                  title="Edit variable"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeleteVariable(v)}
                                  className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-stone-400 hover:text-rose-600 border border-stone-200 hover:border-rose-200 transition cursor-pointer"
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

      {/* TAB 2: TEAM MEMBERS */}
      {activeTab === 'members' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-700" />
                  <h2 className="text-base font-bold text-stone-900">Project Members</h2>
                </div>
                <span className="text-xs font-medium text-stone-600 bg-stone-100 px-3 py-0.5 rounded-full">
                  {project.memberEmails.length} {project.memberEmails.length === 1 ? 'member' : 'members'}
                </span>
              </div>

              <p className="text-xs text-stone-500 mb-6">
                Only authenticated members can view, copy, decrypt, or update variables in this project.
              </p>

              {memberMessage && (
                <div
                  className={`mb-5 rounded-xl p-3.5 flex items-start gap-2.5 text-xs ${
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
                <form onSubmit={handleAddMember} className="mb-6 pb-6 border-b border-stone-100">
                  <label className="block text-xs font-semibold text-stone-700 mb-2">
                    Invite registered user by email
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="teammate@company.com"
                      disabled={addLoading}
                      className="flex-1 px-4 py-2 rounded-full border border-stone-300 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 shadow-xs"
                    />
                    <button
                      type="submit"
                      disabled={addLoading || !memberEmail.trim()}
                      className="inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-full text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 shadow-sm transition cursor-pointer"
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
                  <span className="text-[11px] text-stone-400 mt-1.5 block">
                    User must already have signed up for EnvShare.
                  </span>
                </form>
              ) : (
                <div className="mb-6 p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-stone-500 shrink-0" />
                  <span>You have collaborator access. Only the project creator can invite or remove members.</span>
                </div>
              )}

              {/* Members List */}
              <div className="divide-y divide-stone-100">
                {project.memberEmails.map((email) => {
                  const isProjectOwner = email.toLowerCase() === project.ownerEmail.toLowerCase();
                  const isSelf = email.toLowerCase() === user.email?.toLowerCase();

                  return (
                    <div key={email} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                            isProjectOwner ? 'bg-amber-900/15 text-amber-900' : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {isProjectOwner ? <Crown className="w-4 h-4 text-amber-800" /> : email.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-stone-900 truncate">{email}</p>
                            {isSelf && (
                              <span className="text-[10px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                                you
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-400">
                            {isProjectOwner ? 'Project Creator' : 'Collaborator'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isProjectOwner
                              ? 'bg-amber-900/10 text-amber-900 border border-amber-800/30'
                              : 'bg-stone-50 text-stone-600 border border-stone-200'
                          }`}
                        >
                          {isProjectOwner ? 'Owner' : 'Editor'}
                        </span>

                        {isOwner && !isProjectOwner && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(email)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition cursor-pointer"
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
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Security Architecture
              </h3>
              <ul className="text-xs text-stone-600 space-y-2.5">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <span>
                    <strong>PBKDF2 Key Derivation:</strong> A unique key per project is derived server-side with SHA-256 and 310,000 iterations.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <span>
                    <strong>AES-256-GCM:</strong> Sensitive values are encrypted by a secure server-side function with a random 16B salt and 12B IV before being stored.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <span>
                    <strong>Immutable Audit Trail:</strong> All variable creates, updates, and deletes are permanently logged in history.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* PART 4: SMART PASTE IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-2xl w-full p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-stone-900">
                  {importStep === 'input' ? 'Import .env Block' : 'Review .env Import'}
                </h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-full hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500 mb-4">
              Target environment: <span className="font-semibold text-stone-700">{activeEnv?.name}</span>
            </p>

            {importError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {/* STEP 1: PASTE TEXT */}
            {importStep === 'input' && (
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                <p className="text-xs text-stone-600">
                  Paste the contents of your <code className="bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded font-mono">.env</code> file below. Empty lines and comment lines (<code className="font-mono">#</code>) will be ignored automatically. Surrounding quotes will be stripped.
                </p>

                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`# Database configuration\nDATABASE_URL=postgresql://user:secret@db.example.com:5432/main\nPORT=3000\nAPI_TIMEOUT="5000"`}
                  rows={10}
                  autoFocus
                  className="w-full flex-1 p-3.5 font-mono text-xs rounded-xl border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 shadow-inner"
                />

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium rounded-full text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleParseImport}
                    disabled={importParsing || !importText.trim()}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-full text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 transition cursor-pointer"
                  >
                    {importParsing ? 'Parsing...' : 'Review Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: REVIEW DIFF SCREEN */}
            {importStep === 'review' && (
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                {/* Count Badges */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                    🟢 New: <strong>{newImportCount}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                    🟡 Update: <strong>{updateImportCount}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
                    ⚪ Unchanged: <strong>{unchangedImportCount}</strong>
                  </span>
                </div>

                {/* Diff Table */}
                <div className="flex-1 overflow-y-auto border border-stone-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Key</th>
                        <th className="py-2.5 px-3">Value Diff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-mono">
                      {importParsedItems.map((item, idx) => {
                        const isSens = item.status === 'new'
                          ? !!item.makeSensitive
                          : (item.existingVar?.isSensitive ?? false);
                        const displayOld = isSens ? '••••••••' : item.oldValue;
                        const displayNew = isSens ? '••••••••' : item.value;

                        return (
                          <tr key={idx} className="hover:bg-stone-50">
                            <td className="py-2.5 px-3 font-sans">
                              {item.status === 'new' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                  🟢 New
                                </span>
                              )}
                              {item.status === 'update' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                  🟡 Update
                                </span>
                              )}
                              {item.status === 'unchanged' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-600">
                                  ⚪ Unchanged
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 font-semibold text-stone-900">
                              {item.key}
                            </td>

                            <td className="py-2.5 px-3 text-stone-700">
                              {item.status === 'new' && (
                                <span className="text-emerald-800 font-medium">
                                  {displayNew}{' '}
                                  <span className="text-[10px] text-stone-400 font-sans">
                                    {item.makeSensitive
                                      ? '(will be created as Sensitive & encrypted)'
                                      : '(will be created as Standard)'}
                                  </span>
                                </span>
                              )}
                              {item.status === 'update' && (
                                <div className="space-y-0.5">
                                  <div className="text-rose-600 line-through text-[11px]">
                                    - {displayOld}
                                  </div>
                                  <div className="text-emerald-800 font-medium text-[11px]">
                                    + {displayNew}{' '}
                                    {isSens && (
                                      <span className="text-[10px] text-amber-800 font-sans">
                                        (stays Sensitive & re-encrypted)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {item.status === 'unchanged' && (
                                <span className="text-stone-400">
                                  {displayOld} (no action)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setImportStep('input')}
                    disabled={importApplying}
                    className="px-4 py-2 text-xs font-medium rounded-full text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 transition cursor-pointer"
                  >
                    ← Back to Paste
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(false)}
                      disabled={importApplying}
                      className="px-4 py-2 text-xs font-medium rounded-full text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={importApplying || (newImportCount === 0 && updateImportCount === 0)}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-full text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 transition cursor-pointer"
                    >
                      {importApplying ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Applying changes...</span>
                        </>
                      ) : (
                        <span>Confirm Import ({newImportCount + updateImportCount} changes)</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PART 5: CHANGE HISTORY TIMELINE DRAWER / MODAL */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-2xl w-full p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-stone-900">
                  Change History — {activeEnv?.name}
                </h3>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-full hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500 mt-2 mb-4">
              Audit log of all additions, updates, deletions, and imports in this environment. Sensitive values are permanently masked.
            </p>

            <div className="flex-1 overflow-y-auto pr-1">
              {historyLoading ? (
                <div className="p-8 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-stone-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : historyEntries.length === 0 ? (
                <div className="py-12 text-center text-stone-400">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium">No past changes logged for this environment.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-stone-200 ml-4 space-y-6 my-2">
                  {historyEntries.map((h) => {
                    const date = new Date(h.timestamp);
                    const formattedDate = date.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    const formattedTime = date.toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div key={h.id} className="relative pl-6">
                        {/* Timeline dot */}
                        <div
                          className={`absolute -left-1.5 top-1 w-3 h-3 rounded-full border-2 border-white ${
                            h.action === 'create'
                              ? 'bg-emerald-600'
                              : h.action === 'update'
                              ? 'bg-amber-600'
                              : h.action === 'delete'
                              ? 'bg-rose-500'
                              : h.action === 'toggle_sensitivity'
                              ? 'bg-teal-700'
                              : 'bg-emerald-700'
                          }`}
                        />

                        <div className="bg-stone-50 rounded-xl border border-stone-200/80 p-3.5 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-900">{h.userEmail}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  h.action === 'create'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : h.action === 'update'
                                    ? 'bg-amber-100 text-amber-800'
                                    : h.action === 'delete'
                                    ? 'bg-rose-100 text-rose-800'
                                    : h.action === 'toggle_sensitivity'
                                    ? 'bg-teal-100 text-teal-800'
                                    : 'bg-stone-100 text-stone-800'
                                }`}
                              >
                                {h.actionLabel}
                              </span>
                            </div>

                            <span className="text-[11px] text-stone-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formattedDate} at {formattedTime}
                            </span>
                          </div>

                          <div className="font-mono text-[11px] text-stone-700 mt-2 bg-white rounded-lg p-2.5 border border-stone-200 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-bold text-stone-900">
                              <span>KEY:</span>
                              <span className="text-emerald-800">{h.key}</span>
                              {h.isSensitive && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-sans font-medium px-2 py-0.2 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                  <Lock className="w-2.5 h-2.5" /> Sensitive
                                </span>
                              )}
                            </div>

                            {h.oldValue && (
                              <div className="text-rose-600 line-through break-all">
                                Old: {h.oldValue}
                              </div>
                            )}

                            {h.newValue && (
                              <div className="text-emerald-800 break-all font-semibold">
                                New: {h.newValue}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="px-5 py-2 text-xs font-semibold rounded-full text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 transition cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENVIRONMENT MODAL (CREATE / RENAME) */}
      {isEnvModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              {envModalMode === 'create' ? 'Create Environment' : 'Rename Environment'}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              {envModalMode === 'create'
                ? 'Name this deployment stage (e.g. Development, Staging, QA).'
                : 'Enter the new name for this environment.'}
            </p>

            {envError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                {envError}
              </div>
            )}

            <form onSubmit={handleSaveEnvironment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
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
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEnvModalOpen(false)}
                  disabled={envActionLoading}
                  className="px-4 py-2 text-xs font-medium rounded-full text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={envActionLoading || !envNameInput.trim()}
                  className="px-5 py-2 text-xs font-semibold rounded-full text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-stone-900">
                {editingVar ? 'Edit Environment Variable' : 'Add Environment Variable'}
              </h3>
              <button
                onClick={() => setIsVarModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-full hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-500 mb-5">
              Target environment: <span className="font-semibold text-stone-700">{activeEnv?.name}</span>
            </p>

            {varError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{varError}</span>
              </div>
            )}

            <form onSubmit={handleSaveVariable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
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
                  className="w-full px-3.5 py-2 font-mono text-xs rounded-xl border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">
                  Letters, numbers, and underscores only.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Value
                </label>
                <textarea
                  value={varValInput}
                  onChange={(e) => setVarValInput(e.target.value)}
                  placeholder="e.g. 5432 or postgres://user:pass@host:5432/db"
                  rows={3}
                  className="w-full px-3.5 py-2 font-mono text-xs rounded-xl border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                />
              </div>

              {/* Sensitivity Toggle */}
              <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                    {varSensitiveInput ? (
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-stone-400" />
                    )}
                    <span>Sensitive Variable</span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
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
                  <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsVarModalOpen(false)}
                  disabled={varActionLoading}
                  className="px-4 py-2 text-xs font-medium rounded-full text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={varActionLoading || !varKeyInput.trim()}
                  className="px-5 py-2 text-xs font-semibold rounded-full text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 transition cursor-pointer"
                >
                  {varActionLoading ? 'Saving...' : editingVar ? 'Update Variable' : 'Save Variable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VAULT ENCRYPTION KEY MODAL */}
      {isPassphraseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setIsPassphraseModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-lg relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Project Encryption Key</h3>
                <p className="text-xs text-stone-500">AES-256-GCM · PBKDF2 (310k iter) · Client-Side</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed mb-4">
              Sensitive variables are encrypted directly in your browser before saving.
              You can generate a cryptographically strong 256-bit key or specify your own custom secret key.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Active Encryption Key / Passphrase
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={projectKeyInput}
                    onChange={(e) => {
                      setProjectKeyInput(e.target.value);
                      setKeySavedMsg(false);
                    }}
                    placeholder={`envshare-proj-${projectId}`}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-xs font-mono shadow-xs transition"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (projectKeyInput) {
                        await navigator.clipboard.writeText(projectKeyInput);
                        setKeyCopied(true);
                        setTimeout(() => setKeyCopied(false), 2000);
                      }
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition cursor-pointer"
                    title="Copy key"
                  >
                    {keyCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const newKey = generateEncryptionKey();
                    setProjectKeyInput(newKey);
                    setKeySavedMsg(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Generate Strong 256-Bit Key</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProjectKeyInput(`envshare-proj-${projectId}`);
                    setKeySavedMsg(false);
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 transition cursor-pointer"
                >
                  Reset to Project Default
                </button>
              </div>

              {keySavedMsg && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Encryption key applied and saved for this session!</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsPassphraseModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-full text-stone-600 hover:bg-stone-100 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setProjectPassphrase(projectId, projectKeyInput.trim());
                  setRevealedValues({});
                  setKeySavedMsg(true);
                  setTimeout(() => {
                    setIsPassphraseModalOpen(false);
                    setKeySavedMsg(false);
                  }, 900);
                }}
                className="px-5 py-2 text-xs font-semibold rounded-full text-white bg-emerald-700 hover:bg-emerald-800 transition cursor-pointer"
              >
                Save & Apply Key
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
