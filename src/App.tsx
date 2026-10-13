import React, { useState, useEffect, useId } from 'react';
import {
  Send,
  User,
  Mail,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  CornerDownRight,
  Database,
  Settings,
  Check,
  Copy,
  ExternalLink,
  X,
  RefreshCw,
  Server
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  insertMessageToSupabase,
  testSupabaseConnection,
  SUPABASE_SQL_SETUP,
  getSupabaseClient
} from './lib/supabase';

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

const SAMPLE_PRESETS = [
  {
    label: 'General Inquiry',
    data: {
      name: 'Alex Rivera',
      email: 'alex.rivera@example.com',
      message: 'Hello! I would love to learn more about your services and available project timelines. Could you please send over your portfolio overview?',
    },
  },
  {
    label: 'Project Collaboration',
    data: {
      name: 'Elena Rostova',
      email: 'elena@designstudio.io',
      message: 'Hi team, we are planning a website redesign and are looking for an experienced engineering partner for Q3. Let us schedule a discovery call.',
    },
  },
  {
    label: 'Quick Feedback',
    data: {
      name: 'Marcus Chen',
      email: 'marcus.chen@techcorp.net',
      message: 'Great work on the latest product update! The performance improvements and clean UI have made a huge difference to our daily workflow.',
    },
  },
];

export default function App() {
  const nameId = useId();
  const emailId = useId();
  const messageId = useId();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  // Validation & interaction states
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    name: string;
    email: string;
    message: string;
    storedInSupabase: boolean;
    recordId?: string;
  } | null>(null);
  const [flashPreset, setFlashPreset] = useState(false);

  // Supabase Configuration Modal & State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    testing: boolean;
    success?: boolean;
    message?: string;
  }>({ testing: false });
  const [copiedSql, setCopiedSql] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load initial Supabase credentials
  useEffect(() => {
    const config = getStoredSupabaseConfig();
    setSupabaseUrl(config.url);
    setSupabaseAnonKey(config.anonKey);
    setIsConfigured(Boolean(config.url && config.anonKey));
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Field validation logic
  const validateField = (field: 'name' | 'email' | 'message', val: string): string | undefined => {
    if (field === 'name') {
      if (!val.trim()) return 'Name is required';
      if (val.trim().length < 2) return 'Name must be at least 2 characters';
    }
    if (field === 'email') {
      if (!val.trim()) return 'Email address is required';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val.trim())) return 'Please enter a valid email address';
    }
    if (field === 'message') {
      if (!val.trim()) return 'Message cannot be empty';
      if (val.trim().length < 10) return `Message is too short (${val.trim().length}/10 chars min)`;
      if (val.length > 1000) return 'Message exceeds maximum length of 1000 characters';
    }
    return undefined;
  };

  const handleBlur = (field: 'name' | 'email' | 'message') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = field === 'name' ? name : field === 'email' ? email : message;
    const error = validateField(field, val);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (touched.name) {
      setErrors((prev) => ({ ...prev, name: validateField('name', val) }));
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (touched.email) {
      setErrors((prev) => ({ ...prev, email: validateField('email', val) }));
    }
  };

  const handleMessageChange = (val: string) => {
    setMessage(val);
    if (touched.message) {
      setErrors((prev) => ({ ...prev, message: validateField('message', val) }));
    }
  };

  const loadPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setName(preset.data.name);
    setEmail(preset.data.email);
    setMessage(preset.data.message);
    setTouched({ name: true, email: true, message: true });
    setErrors({});
    setIsSuccess(false);
    setFlashPreset(true);
    setTimeout(() => setFlashPreset(false), 500);
    showToast(`Loaded "${preset.label}" sample data`);
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setMessage('');
    setTouched({});
    setErrors({});
    setIsSuccess(false);
    setSubmittedData(null);
    showToast('Form cleared');
  };

  // Handle Supabase Connection Test
  const handleTestConnection = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setTestStatus({
        testing: false,
        success: false,
        message: 'Please provide both Supabase URL and Anon Key.',
      });
      return;
    }

    setTestStatus({ testing: true });
    const res = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setTestStatus({
      testing: false,
      success: res.success,
      message: res.message,
    });
  };

  // Save Supabase Configuration
  const handleSaveConfig = () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      showToast('Please enter both Supabase URL and Key');
      return;
    }

    saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
    setIsConfigured(true);
    setShowConfigModal(false);
    showToast('Supabase connected successfully!');
  };

  const handleDisconnect = () => {
    clearSupabaseConfig();
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setIsConfigured(false);
    setTestStatus({ testing: false });
    showToast('Supabase disconnected');
  };

  const copySqlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
      setCopiedSql(true);
      showToast('SQL setup script copied to clipboard!');
      setTimeout(() => setCopiedSql(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateField('name', name);
    const emailErr = validateField('email', email);
    const messageErr = validateField('message', message);

    setTouched({ name: true, email: true, message: true });
    setErrors({ name: nameErr, email: emailErr, message: messageErr });

    if (nameErr || emailErr || messageErr) {
      showToast('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      let storedInSupabase = false;
      let recordId: string | undefined = undefined;

      // If Supabase is configured, insert directly into the Supabase database
      if (getSupabaseClient()) {
        const result = await insertMessageToSupabase({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          createdAt: new Date().toISOString(),
        });

        if (result.success) {
          storedInSupabase = true;
          if (result.data && result.data[0]?.id) {
            recordId = String(result.data[0].id);
          }
        } else {
          console.warn('Supabase insert warning:', result.error);
          showToast(`Supabase note: ${result.error || 'Saved locally'}`);
        }
      }

      setSubmittedData({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        storedInSupabase,
        recordId,
      });

      setIsSuccess(true);
      showToast(storedInSupabase ? 'Message saved to Supabase store!' : 'Message submitted!');
    } catch (err: any) {
      console.error(err);
      setSubmittedData({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        storedInSupabase: false,
      });
      setIsSuccess(true);
      showToast('Message submitted');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-slate-100 px-4 py-3 rounded-lg shadow-xl text-sm border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Clean Header with Supabase Connection Status */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs">
              <Mail className="w-5 h-5 text-slate-100" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 text-base leading-tight">Contact Form</h1>
              <p className="text-xs text-slate-500">Name, Email & Message</p>
            </div>
          </div>

          {/* Supabase Status & Settings Action */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isConfigured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="Configure Supabase Database"
            >
              <Database className={`w-3.5 h-3.5 ${isConfigured ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span>{isConfigured ? 'Supabase Connected' : 'Connect Supabase'}</span>
              <Settings className="w-3 h-3 ml-0.5 opacity-60" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Centered Form Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-10 flex flex-col justify-center">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-9 relative">
          {/* Header & Presets */}
          <div className="mb-7 pb-6 border-b border-slate-100">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Get in touch</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Leave your details and message below. Submissions are stored directly in your Supabase database.
                </p>
              </div>

              {!isSuccess && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100 shrink-0"
                  title="Clear all fields"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Quick Fill Sample Data */}
            {!isSuccess && (
              <div className="flex items-center gap-2 pt-3 flex-wrap">
                <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Sample data:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => loadPreset(preset)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md transition-colors font-medium"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Success Screen */}
          {isSuccess && submittedData ? (
            <div className="py-8 px-4 text-center rounded-xl bg-emerald-50/50 border border-emerald-200/80 animate-in fade-in duration-300">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-1.5">Message Sent!</h3>
              <p className="text-sm text-emerald-800 max-w-md mx-auto mb-6">
                Thank you, <span className="font-semibold">{submittedData.name}</span>. Your message has been received.
              </p>

              {/* Supabase Storage Confirmation Banner */}
              <div className="max-w-md mx-auto mb-5 p-3 rounded-lg border flex items-center justify-between text-xs text-left bg-white border-emerald-200">
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      {submittedData.storedInSupabase ? 'Stored in Supabase Database' : 'Supabase Not Configured'}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {submittedData.storedInSupabase
                        ? `Table: contact_messages ${submittedData.recordId ? `· ID #${submittedData.recordId}` : ''}`
                        : 'Connect your Supabase URL & Key in top right to store directly in PostgreSQL'}
                    </span>
                  </div>
                </div>
                {!submittedData.storedInSupabase && (
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(true)}
                    className="text-xs text-emerald-700 font-semibold hover:underline shrink-0 ml-2"
                  >
                    Connect
                  </button>
                )}
              </div>

              <div className="text-left bg-white rounded-xl p-5 border border-emerald-200/60 text-xs text-slate-700 max-w-md mx-auto mb-7 space-y-2.5 shadow-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-medium">Name:</span>
                  <span className="font-semibold text-slate-900">{submittedData.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-medium">Email:</span>
                  <span className="font-mono text-slate-900 font-medium">{submittedData.email}</span>
                </div>
                <div className="pt-1">
                  <span className="text-slate-400 font-medium block mb-1">Message:</span>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                    {submittedData.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleReset();
                }}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Another Message</span>
              </button>
            </div>
          ) : (
            /* The Clean 3-Field Contact Form */
            <form
              onSubmit={handleSubmit}
              onKeyDown={handleKeyDown}
              noValidate
              className={`space-y-6 transition-all duration-200 ${
                flashPreset ? 'opacity-70 scale-[0.999]' : 'opacity-100'
              }`}
            >
              {/* Field 1: Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor={nameId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  {touched.name && errors.name && (
                    <span className="text-xs text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.name}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id={nameId}
                    type="text"
                    name="name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onBlur={() => handleBlur('name')}
                    placeholder="e.g. Alex Morgan"
                    autoComplete="name"
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/50 hover:bg-white text-slate-900 text-sm rounded-lg border transition-all outline-none ${
                      touched.name && errors.name
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/20'
                        : 'border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Field 2: Email */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor={emailId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  {touched.email && errors.email && (
                    <span className="text-xs text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.email}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id={emailId}
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={() => handleBlur('email')}
                    placeholder="e.g. alex@example.com"
                    autoComplete="email"
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/50 hover:bg-white text-slate-900 text-sm rounded-lg border transition-all outline-none ${
                      touched.email && errors.email
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/20'
                        : 'border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Field 3: Message */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor={messageId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {touched.message && errors.message && (
                      <span className="text-xs text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.message}
                      </span>
                    )}
                    <span
                      className={`text-xs font-mono ${
                        message.length > 1000
                          ? 'text-red-600 font-bold'
                          : message.length >= 10
                          ? 'text-slate-400'
                          : 'text-amber-600'
                      }`}
                    >
                      {message.length}/1000
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute top-3 left-3.5 pointer-events-none text-slate-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <textarea
                    id={messageId}
                    rows={5}
                    name="message"
                    value={message}
                    onChange={(e) => handleMessageChange(e.target.value)}
                    onBlur={() => handleBlur('message')}
                    placeholder="Write your message here... Describe your project, request, or questions."
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/50 hover:bg-white text-slate-900 text-sm rounded-lg border transition-all outline-none resize-y min-h-[130px] ${
                      touched.message && errors.message
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/20'
                        : 'border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400 order-2 sm:order-1 flex items-center gap-1.5">
                  <CornerDownRight className="w-3.5 h-3.5" />
                  <span>Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono text-slate-600">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono text-slate-600">Enter</kbd> to send</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto order-1 sm:order-2 inline-flex items-center justify-center gap-2 px-7 py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving message...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Supabase Connection Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Connect Supabase Store</h3>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Submissions will be automatically inserted into the <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">contact_messages</code> table in your Supabase project.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  placeholder="https://xyzproject.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Supabase Anon Key (Public)
                </label>
                <textarea
                  rows={2}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-slate-900 font-mono resize-none"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Find both in your Supabase Dashboard under <strong className="text-slate-600">Project Settings → API</strong>.
                </span>
              </div>

              {/* Test status banner */}
              {testStatus.message && (
                <div
                  className={`p-3 rounded-lg text-xs border flex items-start gap-2 ${
                    testStatus.success
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                >
                  {testStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <span>{testStatus.message}</span>
                </div>
              )}

              {/* SQL Setup Helper */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-slate-500" />
                    Supabase SQL Table Schema
                  </span>
                  <button
                    type="button"
                    onClick={copySqlToClipboard}
                    className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 hover:underline"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy SQL</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-slate-500 text-[11px] mb-2">
                  Run this once in your Supabase SQL Editor to create the table and enable RLS policies:
                </p>
                <pre className="bg-slate-900 text-slate-200 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto max-h-28">
                  <code>{SUPABASE_SQL_SETUP}</code>
                </pre>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
                {isConfigured ? (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-xs text-red-600 hover:text-red-700 font-medium py-2 px-1 hover:underline"
                  >
                    Disconnect
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testStatus.testing || !supabaseUrl || !supabaseAnonKey}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    {testStatus.testing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Test Connection</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Save & Connect
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between">
          <span>Contact Form</span>
          <span className="text-slate-400">Name · Email · Message · Supabase Store</span>
        </div>
      </footer>
    </div>
  );
}
