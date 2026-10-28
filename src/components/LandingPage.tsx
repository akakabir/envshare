import React, { useState } from 'react';
import {
  Sprout,
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
  RotateCcw,
  Sparkles,
  Unlock,
  AlertCircle,
  Leaf,
  TreePine,
  Trees,
} from 'lucide-react';
import forestRiverBg from '../assets/images/forest_river_bg_1793112345410.jpg';

interface LandingPageProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
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

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onOpenTerms,
  onOpenPrivacy,
}) => {
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
    <div className="relative min-h-screen bg-[#f2f7f4] text-stone-900 font-sans selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden">
      {/* Homescreen Background: Lush Forest River with Atmospheric Mist & Greenery */}
      <div className="absolute top-0 left-0 right-0 h-[1000px] sm:h-[1100px] z-0 overflow-hidden pointer-events-none bg-gradient-to-b from-[#1b261f] via-[#223127] to-[#f2f7f4]">
        <img
          src={forestRiverBg}
          alt=""
          role="presentation"
          aria-hidden="true"
          onError={(e) => {
            // Graceful fallback to prevent broken alt text showing if image asset fails
            e.currentTarget.style.display = 'none';
          }}
          className="w-full h-full object-cover object-center filter brightness-[0.88] saturate-[1.15]"
        />
        {/* Atmospheric Forest Gradient Overlay for contrast and natural smooth transition into light greenish white #f2f7f4 */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/75 via-stone-900/60 via-55% to-[#f2f7f4]" />
        <div className="absolute inset-0 bg-radial-[circle_at_top] from-emerald-950/35 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* FLOATING PILL MODERN NAVBAR */}
      <header className="sticky top-4 z-40 px-4 sm:px-6 max-w-4xl mx-auto w-full animate-slow-fade-in">
        <div className="bg-stone-950/70 hover:bg-stone-950/80 backdrop-blur-xl rounded-full border border-white/20 shadow-xl shadow-stone-950/20 px-4 sm:px-6 py-2.5 flex items-center justify-between transition-all">
          {/* Logo with Green and Brown Plant Theme */}
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="EnvShare logo" className="w-8 h-8 object-contain rounded-full bg-white p-0.5" />
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white tracking-tight text-lg">
                EnvShare
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-600/50">
                <Leaf className="w-2.5 h-2.5 text-emerald-400" />
                ECO-VAULT
              </span>
            </div>
          </div>

          {/* 2 Buttons in Pill Navbar */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => onOpenAuth('signin')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-full text-stone-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              Log In
            </button>
            <button
              onClick={() => onOpenAuth('signup')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-sm transition cursor-pointer border border-emerald-400/30"
            >
              <span>Sign Up</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Botanical Pill Badge (Fading in slowly) */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/75 backdrop-blur-md text-emerald-200 border border-emerald-500/40 shadow-lg mb-6 animate-slow-fade-in">
          <Leaf className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cultivate, Encrypt & Share Team Variables • AES-256-GCM</span>
        </div>

        {/* Headline with slow fade-in */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-[1.15] drop-shadow-md animate-slow-fade-in-delayed">
          Modern .env sharing for{' '}
          <span className="text-emerald-300 drop-shadow-sm">Modern devs</span>
        </h1>

        {/* Subtitle with delayed slow fade-in */}
        <p className="mt-5 text-base sm:text-lg text-stone-200 max-w-2xl mx-auto leading-relaxed drop-shadow-sm animate-slow-fade-in-delayed-2">
          Stop tossing unencrypted secrets across Slack channels. Grow your application configs in a fortified, client-encrypted repository with instant environment switching and teammate RBAC.
        </p>

        {/* 2 Main Action Buttons with delayed slow fade-in */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-slow-fade-in-delayed-3">
          <button
            onClick={() => onOpenAuth('signup')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold rounded-full text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition cursor-pointer"
          >
            <Sprout className="w-4 h-4 text-emerald-200" />
            <span>Sign Up Free</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenAuth('signin')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold rounded-full text-stone-900 bg-white/90 hover:bg-white active:bg-stone-100 border border-white/40 shadow-lg backdrop-blur-md transition cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-amber-900" />
            <span>Log In to Workspace</span>
          </button>
        </div>

        {/* Mac Window Interactive Preview with Botanical Accents (Fading in smoothly) */}
        {isClosed ? (
          <div className="mt-12 max-w-md mx-auto p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200 shadow-xl flex items-center justify-between animate-slow-fade-in-delayed-4">
            <div className="flex items-center gap-2 text-xs text-stone-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Demo Sandbox Closed</span>
            </div>
            <button
              onClick={() => {
                setIsClosed(false);
                setIsMinimized(false);
              }}
              className="px-4 py-1.5 text-xs font-semibold rounded-full text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
            >
              Reopen Demo Window
            </button>
          </div>
        ) : (
          <div
            className={`mt-14 mx-auto bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl shadow-stone-950/40 border border-stone-200/90 overflow-hidden text-left transition-all duration-300 animate-slow-fade-in-delayed-4 ${
              isExpanded ? 'max-w-6xl' : 'max-w-4xl'
            }`}
          >
            {/* macOS Window Title Bar */}
            <div className="bg-stone-100/90 px-4 py-3 border-b border-stone-200 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsClosed(true)}
                  className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition flex items-center justify-center group cursor-pointer"
                  title="Close window"
                >
                  <span className="text-[9px] text-rose-950 font-bold opacity-0 group-hover:opacity-100 leading-none">
                    ×
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-500 transition flex items-center justify-center group cursor-pointer"
                  title={isMinimized ? 'Restore window' : 'Minimize window'}
                >
                  <span className="text-[9px] text-amber-950 font-bold opacity-0 group-hover:opacity-100 leading-none">
                    −
                  </span>
                </button>

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

                <span className="ml-2 font-mono text-xs text-stone-600 font-semibold flex items-center gap-1.5">
                  <span className="text-emerald-700">envshare</span>
                  <span className="text-stone-400">/</span>
                  <span className="text-amber-900">billing-api</span>
                  <span className="text-stone-400">/</span>
                  <span className="text-emerald-800 underline decoration-emerald-400 font-bold">
                    {activeEnv.toLowerCase()}
                  </span>
                </span>
              </div>

              {/* Titlebar right badges */}
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <Lock className="w-3 h-3 text-emerald-600" /> AES-256-GCM Encrypted
                </span>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="p-1 text-stone-400 hover:text-stone-700 rounded transition"
                  title="Reset sandbox data"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Window Content */}
            {!isMinimized && (
              <div>
                {/* Environment Tabs */}
                <div className="bg-stone-50 px-4 py-2 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
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
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                            isActive
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                          }`}
                        >
                          {env}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => {
                        const envName = prompt('Enter new stage name (e.g. QA, Testing):');
                        if (envName && envName.trim()) {
                          const trimmed = envName.trim();
                          if (!demoEnvs.includes(trimmed)) {
                            setDemoEnvs([...demoEnvs, trimmed]);
                            setActiveEnv(trimmed);
                          }
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-full text-xs font-medium text-amber-900 hover:text-emerald-700 hover:bg-emerald-50 border border-dashed border-amber-800/40 transition cursor-pointer"
                    >
                      + Add Stage
                    </button>
                  </div>

                  {/* Search and Add Controls */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search keys..."
                        className="w-36 sm:w-44 pl-8 pr-2.5 py-1 text-xs rounded-full border border-stone-300 bg-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>

                    <button
                      onClick={() => setIsAdding(!isAdding)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
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
                    className="p-3.5 bg-emerald-50/50 border-b border-emerald-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs"
                  >
                    <input
                      type="text"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                      placeholder="KEY_NAME"
                      autoFocus
                      required
                      className="w-full sm:w-48 px-3 py-1.5 font-mono text-xs rounded-md border border-stone-300 bg-white"
                    />
                    <input
                      type="text"
                      value={newVal}
                      onChange={(e) => setNewVal(e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-3 py-1.5 font-mono text-xs rounded-md border border-stone-300 bg-white"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-stone-700 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newIsSensitive}
                        onChange={(e) => setNewIsSensitive(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Sensitive</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAdding(false);
                          setDemoError(null);
                        }}
                        className="px-3 py-1.5 rounded-full bg-white text-stone-600 hover:bg-stone-100 border border-stone-200 transition cursor-pointer"
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
                <div className="divide-y divide-stone-100 text-xs font-mono max-h-[380px] overflow-y-auto">
                  {currentVariables.length === 0 ? (
                    <div className="p-8 text-center text-stone-400 font-sans">
                      <p>No variables found in {activeEnv}.</p>
                      <button
                        onClick={() => setIsAdding(true)}
                        className="mt-2 text-emerald-700 hover:underline font-semibold"
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
                          className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-emerald-50/20 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="font-semibold text-stone-900 select-all shrink-0">
                              {v.key}
                            </span>
                            <span className="text-stone-400 font-sans">=</span>

                            {v.isSensitive ? (
                              <div className="flex items-center gap-2 min-w-0 truncate">
                                {isRevealed ? (
                                  <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 break-all select-all">
                                    {v.value}
                                  </span>
                                ) : (
                                  <span className="text-stone-400 tracking-widest select-none">
                                    ••••••••••••••••••••••••
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleToggleReveal(v.id)}
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
                              <span className="text-stone-700 truncate select-all">
                                {v.value || <span className="text-stone-400 italic font-sans">empty</span>}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 font-sans shrink-0">
                            {/* Sensitivity badge */}
                            <button
                              type="button"
                              onClick={() => handleToggleSensitivity(v.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border transition cursor-pointer ${
                                v.isSensitive
                                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                                  : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                              }`}
                              title="Click to toggle Sensitive / Standard"
                            >
                              {v.isSensitive ? (
                                <>
                                  <Lock className="w-2.5 h-2.5 text-amber-700" />
                                  <span>Sensitive</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-2.5 h-2.5 text-stone-400" />
                                  <span>Standard</span>
                                </>
                              )}
                            </button>

                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={() => handleCopy(v)}
                              className={`p-1.5 rounded-full transition cursor-pointer flex items-center gap-1 ${
                                isCopied
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
                              }`}
                              title="Copy variable value"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-700" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteVar(v.id)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition cursor-pointer"
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

                {/* Bottom Bar inside sandbox */}
                <div className="p-3 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2 font-sans">
                  <div className="flex items-center gap-2">
                    <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Interactive sandbox — click <strong>eye</strong> to reveal or <strong>sensitive</strong> to test client encryption</span>
                  </div>

                  <button
                    onClick={() => onOpenAuth('signup')}
                    className="inline-flex items-center gap-1.5 font-semibold text-emerald-800 hover:text-emerald-950 transition cursor-pointer shrink-0"
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

      {/* Features Grid Section with Earth & Botanic Theme */}
      <section className="py-20 bg-[#eaf3ec] border-y border-emerald-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-stone-900">
              Cultivated for speed, team trust, and zero leaks
            </h2>
            <p className="mt-3 text-sm text-stone-600">
              A serene, organic environment for engineering configurations with mathematical cryptography.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-[#f7fbf8] border border-emerald-900/10 hover:border-emerald-500/60 shadow-xs hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-2">
                AES-256-GCM Encryption
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Sensitive variables are encrypted server-side (AES-256-GCM, PBKDF2 SHA-256 with 310,000 iterations) using a random 16B salt and 12B IV. The master secret lives in Google Cloud Secret Manager and never reaches your browser.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-[#f7fbf8] border border-emerald-900/10 hover:border-emerald-500/60 shadow-xs hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5 text-amber-800" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-2">
                Multi-Environment Tabs
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Nurture separate deployment stages: Development, Staging, Production, and custom pipelines. Switch, clone, and rename with 1-click ease.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-[#f7fbf8] border border-emerald-900/10 hover:border-emerald-500/60 shadow-xs hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-2">
                Team Access Control
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Invite teammates by registered email to collaborate securely. Only authenticated members hold decrypt and read privileges on project workspaces.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-[#f7fbf8] border border-emerald-900/10 hover:border-emerald-500/60 shadow-xs hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mb-4">
                <Eye className="w-5 h-5 text-amber-800" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-2">
                Mask & Instant Reveal
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Sensitive values are masked by default (••••••••) to shield against shoulder-surfing. Authorized team members decrypt on demand with 1-click reveal.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-[#f7fbf8] border border-emerald-900/10 hover:border-emerald-500/60 shadow-xs hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
                <Copy className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-2">
                Smart .env Paste Import
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Paste raw .env blocks, preview diffs with 🟢 New, 🟡 Update, and ⚪ Unchanged counts, and batch-apply changes with automatic secret re-encryption.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-[#f7fbf8] border border-emerald-900/10 hover:border-emerald-500/60 shadow-xs hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mb-4">
                <Shield className="w-5 h-5 text-amber-800" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-2">
                Immutable Change Audit
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Every variable addition, update, deletion, and sensitivity change is logged in an append-only timeline. Secrets remain permanently masked in history logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Section with Forest & Earth Gradient */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="bg-gradient-to-br from-emerald-950 via-stone-900 to-teal-950 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden border border-emerald-900/60">
          <div className="relative z-10 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-800/60 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-200">
              <Sprout className="w-6 h-6" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ready to cultivate your variables?
            </h2>
            <p className="mt-3 text-sm text-stone-300 leading-relaxed">
              Create an account in seconds with email or Google to launch your first encrypted eco-vault.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => onOpenAuth('signup')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-full text-stone-950 bg-white hover:bg-emerald-50 transition cursor-pointer"
              >
                <span>Sign Up</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onOpenAuth('signin')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-full text-white bg-stone-800 hover:bg-stone-700 border border-stone-700 transition cursor-pointer"
              >
                <span>Log In</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-emerald-900/10 bg-[#e8f2ea]/70 text-center text-xs text-stone-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-700 flex items-center justify-center text-white">
              <Sprout className="w-3 h-3" />
            </div>
            <span className="font-bold text-stone-800">EnvShare</span>
            <span>— Organic Environment Variables Portal</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-stone-500">
            <span>AES-256-GCM encryption</span>
            <span>•</span>
            {onOpenTerms && (
              <button
                type="button"
                onClick={onOpenTerms}
                className="hover:text-emerald-900 transition underline cursor-pointer"
              >
                Terms of Service
              </button>
            )}
            {onOpenTerms && onOpenPrivacy && <span>•</span>}
            {onOpenPrivacy && (
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="hover:text-emerald-900 transition underline cursor-pointer"
              >
                Privacy Policy
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
