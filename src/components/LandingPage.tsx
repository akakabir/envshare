import React, { useState } from 'react';
import {
  KeyRound,
  Shield,
  Lock,
  Layers,
  Users,
  Eye,
  EyeOff,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Plus,
  Trash2,
  Search,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Unlock,
  AlertCircle,
  FolderGit2,
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

interface DemoVar {
  id: string;
  key: string;
  value: string;
  isSensitive: boolean;
}

const INITIAL_DEMO_DATA: { [env: string]: DemoVar[] } = {
  Production: [
    { id: 'p1', key: 'DATABASE_URL', value: 'postgresql://prod_db:5432/main?sslmode=require', isSensitive: true },
    { id: 'p2', key: 'STRIPE_SECRET_KEY', value: 'sk_live_51Nv892x0PqZLa8XkM29L', isSensitive: true },
    { id: 'p3', key: 'REDIS_AUTH_TOKEN', value: 'auth_prod_99812739487291', isSensitive: true },
    { id: 'p4', key: 'PORT', value: '8080', isSensitive: false },
    { id: 'p5', key: 'CORS_ORIGIN', value: 'https://app.envshare.io', isSensitive: false },
  ],
  Staging: [
    { id: 's1', key: 'DATABASE_URL', value: 'postgresql://staging_db:5432/main', isSensitive: true },
    { id: 's2', key: 'STRIPE_SECRET_KEY', value: 'sk_test_51Nv892x0PqZLa8XkM29L_test', isSensitive: true },
    { id: 's3', key: 'DEBUG_LOGGING', value: 'verbose', isSensitive: false },
    { id: 's4', key: 'PORT', value: '3000', isSensitive: false },
  ],
  Development: [
    { id: 'd1', key: 'DATABASE_URL', value: 'postgresql://localhost:5432/local_dev', isSensitive: false },
    { id: 'd2', key: 'API_SECRET', value: 'mock_local_secret_token_123', isSensitive: true },
    { id: 'd3', key: 'NODE_ENV', value: 'development', isSensitive: false },
    { id: 'd4', key: 'PORT', value: '5173', isSensitive: false },
  ],
};

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  // Mac Window Interactive States
  const [isClosed, setIsClosed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Demo environments and variables
  const [demoEnvs, setDemoEnvs] = useState<string[]>(['Production', 'Staging', 'Development']);
  const [activeEnv, setActiveEnv] = useState<string>('Production');
  const [demoData, setDemoData] = useState<{ [env: string]: DemoVar[] }>(INITIAL_DEMO_DATA);

  // Interactions
  const [revealedIds, setRevealedIds] = useState<{ [id: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Add variable in demo
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [newIsSensitive, setNewIsSensitive] = useState(true);
  const [demoError, setDemoError] = useState<string | null>(null);

  const currentVariables = (demoData[activeEnv] || []).filter((v) =>
    v.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = async (v: DemoVar) => {
    try {
      await navigator.clipboard.writeText(v.value);
      setCopiedId(v.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSensitivity = (id: string) => {
    setDemoData((prev) => {
      const currentList = prev[activeEnv] || [];
      return {
        ...prev,
        [activeEnv]: currentList.map((v) =>
          v.id === id ? { ...v, isSensitive: !v.isSensitive } : v
        ),
      };
    });
  };

  const handleDeleteVar = (id: string) => {
    setDemoData((prev) => {
      const currentList = prev[activeEnv] || [];
      return {
        ...prev,
        [activeEnv]: currentList.filter((v) => v.id !== id),
      };
    });
  };

  const handleAddVar = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = newKey.trim().toUpperCase();
    if (!trimmedKey) {
      setDemoError('Key name is required.');
      return;
    }
    if (!/^[A-Z0-9_]+$/.test(trimmedKey)) {
      setDemoError('Key must contain only letters, numbers, and underscores.');
      return;
    }
    const currentList = demoData[activeEnv] || [];
    if (currentList.some((v) => v.key === trimmedKey)) {
      setDemoError('This key already exists in this environment.');
      return;
    }

    const newVar: DemoVar = {
      id: 'demo_' + Date.now(),
      key: trimmedKey,
      value: newVal,
      isSensitive: newIsSensitive,
    };

    setDemoData((prev) => ({
      ...prev,
      [activeEnv]: [...(prev[activeEnv] || []), newVar],
    }));

    setNewKey('');
    setNewVal('');
    setDemoError(null);
    setIsAdding(false);
  };

  const handleResetDemo = () => {
    setDemoData(INITIAL_DEMO_DATA);
    setRevealedIds({});
    setSearchTerm('');
    setIsMinimized(false);
    setIsExpanded(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-lg">EnvShare</span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  SECURE
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenAuth('signin')}
              className="px-4 py-2 text-sm font-medium rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              Log In
            </button>
            <button
              onClick={() => onOpenAuth('signup')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm transition cursor-pointer"
            >
              <span>Sign Up</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80 mb-6">
          <Shield className="w-3.5 h-3.5" />
          <span>AES-256-GCM Client-Side Encryption with PBKDF2</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.15]">
          Secure environment variables for{' '}
          <span className="text-indigo-600">modern engineering teams</span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Stop sharing sensitive credentials over chat or email. Organize deployment environments, encrypt secrets with AES-256-GCM, and collaborate with your team with confidence.
        </p>

        {/* 2 Main Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onOpenAuth('signup')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <span>Sign Up Free</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenAuth('signin')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 shadow-xs transition cursor-pointer"
          >
            <span>Log In to Workspace</span>
          </button>
        </div>

        {/* Mac Window Interactive Preview */}
        {isClosed ? (
          <div className="mt-12 max-w-md mx-auto p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span>Demo Window Closed</span>
            </div>
            <button
              onClick={() => {
                setIsClosed(false);
                setIsMinimized(false);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition cursor-pointer"
            >
              Reopen Demo Window
            </button>
          </div>
        ) : (
          <div
            className={`mt-14 mx-auto bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden text-left transition-all duration-300 ${
              isExpanded ? 'max-w-6xl' : 'max-w-4xl'
            }`}
          >
            {/* macOS Window Title Bar */}
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                {/* Red button: Close / Hide */}
                <button
                  type="button"
                  onClick={() => setIsClosed(true)}
                  className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition flex items-center justify-center group cursor-pointer"
                  title="Close window"
                >
                  <span className="text-[9px] text-rose-900 font-bold opacity-0 group-hover:opacity-100 leading-none">
                    ×
                  </span>
                </button>

                {/* Yellow button: Minimize / Toggle collapse */}
                <button
                  type="button"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-500 transition flex items-center justify-center group cursor-pointer"
                  title={isMinimized ? 'Restore window' : 'Minimize window'}
                >
                  <span className="text-[9px] text-amber-900 font-bold opacity-0 group-hover:opacity-100 leading-none">
                    −
                  </span>
                </button>

                {/* Green button: Fullscreen / Expand width */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMinimized(false);
                    setIsExpanded(!isExpanded);
                  }}
                  className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 transition flex items-center justify-center group cursor-pointer"
                  title={isExpanded ? 'Standard width' : 'Expand window'}
                >
                  <span className="text-[8px] text-emerald-950 font-bold opacity-0 group-hover:opacity-100 leading-none">
                    +
                  </span>
                </button>

                <span className="ml-2 font-mono text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                  <span>envshare</span>
                  <span className="text-slate-400">/</span>
                  <span>billing-api</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-indigo-600">{activeEnv.toLowerCase()}</span>
                </span>
              </div>

              {/* Titlebar right actions */}
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <Lock className="w-3 h-3" /> Encrypted at rest
                </span>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                  title="Reset demo data"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Window Content (Collapsible if minimized) */}
            {!isMinimized && (
              <div>
                {/* Interactive Environment Tabs */}
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                    {demoEnvs.map((env) => {
                      const isActive = env === activeEnv;
                      return (
                        <button
                          key={env}
                          onClick={() => {
                            setActiveEnv(env);
                            setDemoError(null);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {env}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => {
                        const envName = prompt('Enter new environment name (e.g. QA, Testing):');
                        if (envName && envName.trim()) {
                          const trimmed = envName.trim();
                          if (!demoEnvs.includes(trimmed)) {
                            setDemoEnvs([...demoEnvs, trimmed]);
                            setActiveEnv(trimmed);
                          }
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-dashed border-slate-300 transition cursor-pointer"
                    >
                      + Add Stage
                    </button>
                  </div>

                  {/* Search and Add Controls */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search keys..."
                        className="w-36 sm:w-44 pl-8 pr-2.5 py-1 text-xs rounded-md border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <button
                      onClick={() => setIsAdding(!isAdding)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Key</span>
                    </button>
                  </div>
                </div>

                {/* Inline Add Variable Form */}
                {isAdding && (
                  <form
                    onSubmit={handleAddVar}
                    className="p-3.5 bg-indigo-50/50 border-b border-indigo-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs"
                  >
                    <input
                      type="text"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                      placeholder="KEY_NAME"
                      autoFocus
                      required
                      className="w-full sm:w-48 px-2.5 py-1.5 font-mono text-xs rounded border border-slate-300 bg-white"
                    />
                    <input
                      type="text"
                      value={newVal}
                      onChange={(e) => setNewVal(e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-2.5 py-1.5 font-mono text-xs rounded border border-slate-300 bg-white"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newIsSensitive}
                        onChange={(e) => setNewIsSensitive(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Sensitive</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAdding(false);
                          setDemoError(null);
                        }}
                        className="px-2.5 py-1.5 rounded bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {demoError && (
                  <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{demoError}</span>
                  </div>
                )}

                {/* Variables List */}
                <div className="divide-y divide-slate-100 text-xs font-mono max-h-[380px] overflow-y-auto">
                  {currentVariables.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-sans">
                      <p>No variables found in {activeEnv}.</p>
                      <button
                        onClick={() => setIsAdding(true)}
                        className="mt-2 text-indigo-600 hover:underline font-semibold"
                      >
                        + Add a variable now
                      </button>
                    </div>
                  ) : (
                    currentVariables.map((v) => {
                      const isRevealed = revealedIds[v.id];
                      const isCopied = copiedId === v.id;

                      return (
                        <div
                          key={v.id}
                          className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                        >
                          {/* Key & Value */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="font-semibold text-slate-900 select-all shrink-0">
                              {v.key}
                            </span>
                            <span className="text-slate-400 font-sans">=</span>

                            {v.isSensitive ? (
                              <div className="flex items-center gap-2 min-w-0 truncate">
                                {isRevealed ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 break-all select-all">
                                    {v.value}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 tracking-widest select-none">
                                    ••••••••••••••••••••••••
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleToggleReveal(v.id)}
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
                              <span className="text-slate-700 truncate select-all">
                                {v.value || <span className="text-slate-400 italic font-sans">empty</span>}
                              </span>
                            )}
                          </div>

                          {/* Controls */}
                          <div className="flex items-center gap-2 font-sans shrink-0">
                            {/* Sensitivity toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleSensitivity(v.id)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition cursor-pointer ${
                                v.isSensitive
                                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                              }`}
                              title="Click to toggle Sensitive / Standard"
                            >
                              {v.isSensitive ? (
                                <>
                                  <Lock className="w-2.5 h-2.5 text-amber-600" />
                                  <span>Sensitive</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-2.5 h-2.5 text-slate-400" />
                                  <span>Standard</span>
                                </>
                              )}
                            </button>

                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={() => handleCopy(v)}
                              className={`p-1.5 rounded transition cursor-pointer flex items-center gap-1 ${
                                isCopied
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                              }`}
                              title="Copy variable value"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteVar(v.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                              title="Delete from demo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom Bar inside window */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 font-sans">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Interactive sandbox — click <strong>eye</strong> to reveal, <strong>copy</strong> to test clipboard, or <strong>sensitive</strong> to switch encryption</span>
                  </div>

                  <button
                    onClick={() => onOpenAuth('signup')}
                    className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer shrink-0"
                  >
                    <span>Deploy this to your cloud</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Features Grid Section */}
      <section className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Built for speed, team trust, and zero-leak security
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              Everything your team needs to manage environment configurations safely without clunky spreadsheets or unsecured copy-pastes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                AES-256-GCM Encryption
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sensitive variables are encrypted in the client browser with PBKDF2 (SHA-256, 310,000 iterations) using random 16B salt and 12B IV. Plain text never hits the cloud database.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Multi-Environment Tabs
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Organize configurations per project stage: Development, Staging, Production, or custom environments. Easily rename, add, or prune environments in seconds.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Team Access Control
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Invite registered colleagues by email to view and collaborate. Only verified members have decrypt and read privileges on project subcollections.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Mask & Instant Reveal
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sensitive values are masked by default (••••••••) to prevent shoulder-surfing. Authorized team members can toggle reveal to decrypt on the fly.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                <Copy className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                1-Click Clipboard Copy
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Copy variable values directly to your clipboard with immediate visual confirmation. Sensitive values decrypt seamlessly into memory for quick pasting.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Hardened Cloud Rules
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Zero blanket reads, strict regex key validation, duplicate protection, and Master Gate relational integrity enforced by cloud security rules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Section with 2 Buttons */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ready to safeguard your team's variables?
            </h2>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">
              Create an account in seconds with email or Google to set up your first encrypted project.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => onOpenAuth('signup')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg text-slate-900 bg-white hover:bg-slate-100 transition cursor-pointer"
              >
                <span>Sign Up</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onOpenAuth('signin')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
              >
                <span>Log In</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-white">
              <KeyRound className="w-3 h-3" />
            </div>
            <span className="font-semibold text-slate-800">EnvShare</span>
            <span>— Team Environment Variables Portal</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Client-side AES-256-GCM</span>
            <span>•</span>
            <span>Firebase Security</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
