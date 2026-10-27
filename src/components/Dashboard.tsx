import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase.ts';
import { Project } from '../types.ts';
import {
  Plus,
  Search,
  FolderGit2,
  Users,
  Calendar,
  ArrowRight,
  ShieldAlert,
  Sprout,
  Leaf,
} from 'lucide-react';

interface DashboardProps {
  user: FirebaseUser;
  onSelectProject: (projectId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onSelectProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'owned' | 'shared'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'projects'),
      where('memberUids', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Project[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Project, 'id'>) });
        });
        list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
        setProjects(list);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'projects');
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setCreateError('Project name is required.');
      return;
    }
    if (!user.email) {
      setCreateError('User must have an email associated.');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    const projectId = 'proj_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const now = new Date().toISOString();

    const projectData: Project = {
      id: projectId,
      name: newProjectName.trim(),
      description: newProjectDesc.trim(),
      ownerId: user.uid,
      ownerEmail: user.email.toLowerCase(),
      memberUids: [user.uid],
      memberEmails: [user.email.toLowerCase()],
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'projects', projectId), projectData);
      setNewProjectName('');
      setNewProjectDesc('');
      setIsCreateOpen(false);
      onSelectProject(projectId);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create project.');
      try {
        handleFirestoreError(err, OperationType.CREATE, `projects/${projectId}`);
      } catch {}
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'owned') return p.ownerId === user.uid;
    if (filter === 'shared') return p.ownerId !== user.uid;
    return true;
  });

  const ownedCount = projects.filter((p) => p.ownerId === user.uid).length;
  const sharedCount = projects.length - ownedCount;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      {/* Top Banner / Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Team Workspaces</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <Sprout className="w-3 h-3 text-emerald-600" />
              ECO-VAULT
            </span>
          </div>
          <p className="text-sm text-stone-500">
            Nurture and share encrypted environment variables with team access control
          </p>
        </div>

        <button
          onClick={() => {
            setCreateError(null);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 shadow-sm transition cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter / Stats Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-6 shadow-xs flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-3.5 py-2 rounded-full border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-xs transition"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition cursor-pointer ${
              filter === 'all'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/70'
            }`}
          >
            All ({projects.length})
          </button>
          <button
            onClick={() => setFilter('owned')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition cursor-pointer ${
              filter === 'owned'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/70'
            }`}
          >
            Created by me ({ownedCount})
          </button>
          <button
            onClick={() => setFilter('shared')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition cursor-pointer ${
              filter === 'shared'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/70'
            }`}
          >
            Shared with me ({sharedCount})
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-stone-200 p-6 animate-pulse space-y-4"
            >
              <div className="h-5 bg-stone-200 rounded w-1/2" />
              <div className="h-4 bg-stone-100 rounded w-5/6" />
              <div className="h-4 bg-stone-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-stone-300 p-12 text-center max-w-lg mx-auto my-6">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center mb-4">
            <Sprout className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900 mb-1">
            {search ? 'No matching projects found' : 'No projects cultivated yet'}
          </h3>
          <p className="text-xs text-stone-500 mb-6">
            {search
              ? 'Try adjusting your search query or clear filters.'
              : 'Create your first project workspace to securely store and share encrypted variables.'}
          </p>
          {!search && (
            <button
              onClick={() => {
                setCreateError(null);
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const isOwner = project.ownerId === user.uid;
            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="group bg-white rounded-2xl border border-stone-200 hover:border-emerald-500/70 hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        isOwner
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}
                    >
                      <Leaf className="w-3 h-3" />
                      <span>{isOwner ? 'Creator' : 'Collaborator'}</span>
                    </span>
                    <span className="text-xs text-stone-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(project.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-stone-900 group-hover:text-emerald-800 transition flex items-center justify-between">
                    <span className="truncate">{project.name}</span>
                    <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition shrink-0" />
                  </h3>
                  <p className="text-xs text-stone-500 mt-1.5 line-clamp-2 min-h-[2rem]">
                    {project.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    <span>{project.memberEmails?.length || 1} {project.memberEmails?.length === 1 ? 'member' : 'members'}</span>
                  </div>
                  <span className="text-[11px] text-stone-400 truncate max-w-[140px]">
                    by {isOwner ? 'you' : project.ownerEmail.split('@')[0]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-stone-200 max-w-md w-full p-6">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <Sprout className="w-5 h-5" />
            </div>

            <h3 className="text-lg font-bold text-stone-900 mb-1">Create New Project</h3>
            <p className="text-xs text-stone-500 mb-5">
              Set up a secure environment variables workspace for your team.
            </p>

            {createError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Billing Service API"
                  required
                  maxLength={100}
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-xs shadow-xs transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Description <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="What is this project and which team owns it?"
                  rows={3}
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-xs shadow-xs transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createLoading}
                  className="px-4 py-2 text-xs font-semibold rounded-full text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !newProjectName.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold rounded-full text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition cursor-pointer"
                >
                  {createLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Create Project</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
