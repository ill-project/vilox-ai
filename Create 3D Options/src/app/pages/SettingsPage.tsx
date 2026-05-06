import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, updateUserProfile, getKycStatus, submitKyc, upsertReferral } from '../lib/db';
import { supabase } from '../lib/supabase';
import { 
  User, ShieldCheck, Lock, Laptop, CreditCard, Bell, Sliders, Gift, 
  Camera, CheckCircle2, AlertTriangle, ChevronRight, AlertCircle,
  Eye, EyeOff, ShieldAlert, Fingerprint, UploadCloud,
  Check, Mail, Copy, LogOut, Activity, X, Plus, Building2, Info,
} from 'lucide-react';

const SECTIONS = [
  { id: 'profile', icon: User, label: 'Profile Settings' },
  { id: 'kyc', icon: ShieldCheck, label: 'Identity Verification' },
  { id: 'security', icon: Lock, label: 'Security Settings' },
  { id: 'sessions', icon: Laptop, label: 'Session Management' },
  { id: 'payments', icon: CreditCard, label: 'Payment Methods' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'preferences', icon: Sliders, label: 'Trading Preferences' },
  { id: 'referrals', icon: Gift, label: 'Referral & Rewards' },
];

export const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('profile');
  const [mobileView, setMobileView] = useState<'menu' | 'content'>('menu');

  const handleSectionSelect = (id: string) => {
    setActiveSection(id);
    if (window.innerWidth < 768) {
      setMobileView('content');
    }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile': return <ProfileSection />;
      case 'kyc': return <KYCSection />;
      case 'security': return <SecuritySection />;
      case 'sessions': return <SessionsSection />;
      case 'payments': return <PaymentsSection />;
      case 'notifications': return <NotificationsSection />;
      case 'preferences': return <PreferencesSection />;
      case 'referrals': return <ReferralsSection />;
      default: return null;
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
          <Sliders className="w-8 h-8 text-[#4C6FFF]" /> Settings
        </h1>
        <p className="text-sm text-white/50">Manage your Vilox AI account, security, and trading preferences.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-8 relative">
        {/* Sidebar (Hidden on mobile if viewing content) */}
        <aside className={`w-full md:w-64 shrink-0 space-y-2 md:sticky md:top-24 ${mobileView === 'content' ? 'hidden md:block' : 'block'}`}>
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => handleSectionSelect(section.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all border ${
                  isActive 
                    ? 'bg-[#4C6FFF]/15 border-[#4C6FFF]/30 text-[#4C6FFF] shadow-[0_0_15px_rgba(76,111,255,0.1)]' 
                    : 'bg-white/[0.02] border-white/5 text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#4C6FFF]' : 'text-white/40'}`} />
                  <span className="font-medium text-sm">{section.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 hidden md:block" />}
              </button>
            );
          })}
        </aside>

        {/* Content Area */}
        <section className={`flex-1 min-w-0 ${mobileView === 'menu' ? 'hidden md:block' : 'block'}`}>
          {/* Mobile Back Button */}
          <div className="md:hidden mb-6">
            <button 
              onClick={() => setMobileView('menu')}
              className="flex items-center gap-2 text-white/50 hover:text-white"
            >
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to Menu
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderSectionContent()}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
};

// --- SECTION COMPONENTS ---

const ProfileSection = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneSavedAt, setPhoneSavedAt] = useState<string | null>(null);
  const [plan, setPlan] = useState('starter');

  // How many hours remain in the 24h phone lock
  const phoneLockedHoursLeft = (() => {
    if (!phoneSavedAt) return 0;
    const elapsed = (Date.now() - new Date(phoneSavedAt).getTime()) / 1000 / 3600;
    return Math.max(0, Math.ceil(24 - elapsed));
  })();
  const phoneLocked = phoneLockedHoursLeft > 0;

  // Mask phone: show last 4 digits only
  const maskedPhone = phone
    ? phone.replace(/\d(?=\d{4})/g, '•')
    : '';

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    getUserProfile(user.id)
      .then(data => {
        if (data) {
          setFullName(data.full_name ?? '');
          setPhone(data.phone ?? '');
          setPhoneSavedAt(data.phone_saved_at ?? null);
          setPlan(data.plan ?? 'starter');
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const updates: Record<string, unknown> = { full_name: fullName };
      // Only update phone if not locked
      if (!phoneLocked) {
        updates.phone = phone;
        if (phone) {
          updates.phone_saved_at = new Date().toISOString();
          setPhoneSavedAt(new Date().toISOString());
        }
      }
      // Update profiles table AND sync Supabase Auth metadata so dashboard name matches
      await Promise.all([
        updateUserProfile(user.id, updates),
        supabase.auth.updateUser({ data: { full_name: fullName } }),
      ]);
      setSaveStatus('success');
      // Keep the checkmark — don't auto-hide
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const initials = fullName
    ? fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.slice(0, 2).toUpperCase() ?? 'VX');

  return (
    <div className="space-y-6">
      <div className="bg-[#0F111A] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#4C6FFF]/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#4C6FFF]/30 to-[#4C6FFF]/10 border-2 border-white/10 group-hover:border-[#4C6FFF]/50 transition-colors flex items-center justify-center text-2xl font-bold text-[#4C6FFF]">
              {isLoading ? <span className="animate-pulse">…</span> : initials}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#4C6FFF] flex items-center justify-center border-2 border-[#0F111A] hover:bg-[#3d5acc] transition-colors shadow-lg">
              <Camera className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="text-center sm:text-left flex-1">
            {isLoading ? (
              <div className="space-y-2">
                <div className="animate-pulse h-7 bg-white/10 rounded-lg w-44" />
                <div className="animate-pulse h-4 bg-white/5 rounded w-32 mt-1" />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  {fullName || user?.email?.split('@')[0] || 'Your Name'}
                  {saveStatus === 'success' && (
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                  )}
                </h2>
                <p className="text-white/50 text-sm font-mono mt-1">{user?.email ?? ''}</p>
              </>
            )}
            <div className="flex items-center gap-2 justify-center sm:justify-start mt-3">
              <span className="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-bold uppercase tracking-widest capitalize">
                {plan} Plan
              </span>
            </div>
          </div>
        </div>

        <form className="space-y-6 max-w-2xl" onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs text-white/50 uppercase tracking-widest">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => { setFullName(e.target.value); setSaveStatus('idle'); }}
                placeholder="Your full name"
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:border-[#4C6FFF] focus:ring-1 focus:ring-[#4C6FFF] transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/50 uppercase tracking-widest">Email Address</label>
              <input
                type="email"
                value={user?.email ?? ''}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white/50 transition-all outline-none cursor-not-allowed"
                disabled
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs text-white/50 uppercase tracking-widest flex items-center gap-2">
                Phone Number
                {phoneLocked && (
                  <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase tracking-widest">
                    Locked {phoneLockedHoursLeft}h
                  </span>
                )}
              </label>
              {phoneLocked ? (
                <div className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 flex items-center gap-3 cursor-not-allowed">
                  <Lock className="w-4 h-4 text-white/30 shrink-0" />
                  <span className="text-white/50 font-mono">{maskedPhone}</span>
                  <span className="ml-auto text-xs text-white/30">Editable in {phoneLockedHoursLeft}h</span>
                </div>
              ) : (
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:border-[#4C6FFF] focus:ring-1 focus:ring-[#4C6FFF] transition-all outline-none"
                />
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-[#4C6FFF] text-white font-semibold hover:bg-[#3d5acc] transition-colors shadow-[0_0_15px_rgba(76,111,255,0.3)] disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
            {saveStatus === 'success' && (
              <span className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Saved successfully
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-red-400 text-sm font-medium">
                <AlertTriangle className="w-4 h-4" /> Failed to save
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

const KYC_STATUS_MAP = {
  unverified: { label: 'Unverified', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  pending:    { label: 'Pending',    color: 'text-blue-400',   bg: 'bg-blue-500/20',   border: 'border-blue-500/30' },
  verified:   { label: 'Approved',   color: 'text-green-400',  bg: 'bg-green-500/20',  border: 'border-green-500/30' },
  rejected:   { label: 'Rejected',   color: 'text-red-400',    bg: 'bg-red-500/20',    border: 'border-red-500/30' },
} as const;

type KycStatusKey = keyof typeof KYC_STATUS_MAP;

const KYCSection = () => {
  const { user } = useAuth();
  const [kycStatus, setKycStatus] = useState<KycStatusKey>('unverified');
  const [docType, setDocType] = useState<'passport' | 'drivers_license' | 'national_id'>('passport');
  const [docFrontFile, setDocFrontFile] = useState<File | null>(null);
  const [docBackFile, setDocBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');

  // Phone verification state
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // Format local phone number as (XXX) XXX-XXXX while typing
  const formatLocalPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const e164Phone = `${countryCode}${phoneInput.replace(/\D/g, '')}`;

  const COUNTRY_CODES = [
    { code: '+1',  flag: '🇺🇸', label: 'US/CA' },
    { code: '+44', flag: '🇬🇧', label: 'UK' },
    { code: '+61', flag: '🇦🇺', label: 'AU' },
    { code: '+91', flag: '🇮🇳', label: 'IN' },
    { code: '+49', flag: '🇩🇪', label: 'DE' },
    { code: '+33', flag: '🇫🇷', label: 'FR' },
    { code: '+55', flag: '🇧🇷', label: 'BR' },
    { code: '+234', flag: '🇳🇬', label: 'NG' },
    { code: '+27', flag: '🇿🇦', label: 'ZA' },
    { code: '+971', flag: '🇦🇪', label: 'AE' },
  ];

  useEffect(() => {
    if (!user) return;
    getKycStatus(user.id)
      .then(data => {
        if (data?.status) setKycStatus(data.status as KycStatusKey);
        if (data?.phone_verified) setPhoneVerified(true);
      })
      .catch(() => {});
    getUserProfile(user.id)
      .then(data => { if (data?.phone) setPhoneInput(data.phone); })
      .catch(() => {});
  }, [user]);

  const handleSendOtp = async () => {
    const digits = phoneInput.replace(/\D/g, '');
    if (!digits || digits.length < 7) { setPhoneError('Enter a valid phone number.'); return; }
    setPhoneError('');
    // Find enrolled TOTP factor
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp?.find(f => f.status === 'verified');
    if (!factor) {
      setPhoneError('Google Authenticator not set up. Please enable it in Security Settings first.');
      return;
    }
    setTotpFactorId(factor.id);
    setOtpSent(true);
  };

  const handleVerifyOtp = async () => {
    if (!totpFactorId) return;
    setPhoneVerifying(true);
    setPhoneError('');
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totpFactorId, code: otpInput });
      if (error) throw new Error('Invalid or expired code. Please try again.');
      // Save phone to profile + mark phone_verified in kyc row
      await updateUserProfile(user!.id, { phone: e164Phone });
      const now = new Date().toISOString();
      const { error: kycErr } = await supabase.from('kyc').upsert(
        { user_id: user!.id, phone_verified: true, phone: e164Phone, status: 'unverified', updated_at: now },
        { onConflict: 'user_id' }
      );
      if (kycErr) throw new Error(kycErr.message);
      setPhoneVerified(true);
      setOtpSent(false);
      setOtpInput('');
    } catch (e) {
      setPhoneError((e as Error).message);
    } finally {
      setPhoneVerifying(false);
    }
  };

  const uploadFile = async (file: File, path: string, stepMsg: string): Promise<string> => {
    setProgressMsg(stepMsg);
    // Convert file to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data URL prefix (e.g. "data:image/jpeg;base64,")
        resolve(result.split(',')[1]);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kyc-upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ path, contentType: file.type || 'image/jpeg', data: base64 }),
      }
    );
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Upload failed');
    return json.publicUrl as string;
  };

  // Camera helpers
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Stop stream when component unmounts
  useEffect(() => {
    return () => { cameraStream?.getTracks().forEach(t => t.stop()); };
  }, [cameraStream]);

  const openCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      setCameraStream(stream);
      setCameraOpen(true);
    } catch {
      setCameraError('Camera access denied. Please allow camera permissions or upload a photo instead.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (blob) setSelfieFile(new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setCameraOpen(false);
  };

  const closeCamera = () => {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setCameraOpen(false);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMsg('');
    setProgressMsg('');
    try {
      let docUrl: string | undefined;
      let selfieUrl: string | undefined;
      if (docFrontFile) {
        docUrl = await uploadFile(docFrontFile, `${user.id}/doc-front-${Date.now()}`, 'Uploading documents... 1/3');
      }
      if (selfieFile) {
        selfieUrl = await uploadFile(selfieFile, `${user.id}/selfie-${Date.now()}`, 'Uploading selfie... 2/3');
      }
      setProgressMsg('Submitting verification... 3/3');
      await submitKyc(user.id, { doc_type: docType, doc_url: docUrl, selfie_url: selfieUrl });
      setKycStatus('pending');
      setSubmitStatus('success');
      setProgressMsg('Submitted! We will review within 24 hours');
    } catch (e) {
      setErrorMsg((e as Error).message);
      setSubmitStatus('error');
      setProgressMsg('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const badge = KYC_STATUS_MAP[kycStatus];
  const isApproved = kycStatus === 'verified';

  const progressPct = isApproved ? 100 : (kycStatus === 'pending' ? 66 : phoneVerified ? 66 : 33);

  return (
    <div className="space-y-6">
      {isSubmitting && progressMsg && (
        <div className="mb-4 p-3 rounded-lg bg-blue-900/60 border border-blue-500/30 text-blue-200 text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 animate-spin" />
          {progressMsg}
        </div>
      )}
      {submitStatus === 'success' && progressMsg && (
        <div className="mb-4 p-3 rounded-lg bg-green-900/60 border border-green-500/30 text-green-200 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {progressMsg}
        </div>
      )}
      {submitStatus === 'error' && errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/60 border border-red-500/30 text-red-200 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}
      <div className="bg-[#0F111A] border border-[#4C6FFF]/30 rounded-2xl p-6 relative shadow-[0_0_30px_rgba(76,111,255,0.05)]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white">Identity Verification</h2>
          <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest border ${badge.bg} ${badge.color} ${badge.border}`}>{badge.label}</span>
        </div>
        <p className="text-sm text-white/50 mb-8">Verification is required to unlock withdrawals and higher trading limits.</p>

        {/* Progress Bar */}
        <div className="relative mb-12">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-white/10 -translate-y-1/2 rounded-full" />
          <div
            className="absolute top-1/2 left-0 h-1 bg-[#4C6FFF] -translate-y-1/2 rounded-full shadow-[0_0_10px_#4C6FFF] transition-all"
            style={{ width: `${progressPct}%` }}
          />
          <div className="relative flex justify-between">
            {[
              { label: 'Email', done: true },
              { label: 'Phone', done: phoneVerified || isApproved },
              { label: 'Identity', done: isApproved },
            ].map((step, idx) => (
              <div key={step.label} className="flex flex-col items-center gap-2 bg-[#0F111A] px-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step.done ? 'bg-[#4C6FFF] border-[#4C6FFF] text-white' : 'bg-white/5 border-white/20 text-white/30'
                }`}>
                  {step.done ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                </div>
                <span className={`text-xs font-bold uppercase tracking-widest ${step.done ? 'text-white' : 'text-white/30'}`}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* Level 1 — Email */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center gap-3 justify-between opacity-60">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0"><Mail className="w-5 h-5 text-green-400" /></div>
              <div className="min-w-0">
                <h3 className="text-white font-semibold">Level 1 — Email Verification</h3>
                <p className="text-white/50 text-xs truncate">{user?.email ?? ''}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded bg-green-500/20 text-green-400 text-xs font-bold uppercase tracking-widest border border-green-500/30 shrink-0">Verified</span>
          </div>

          {/* Level 2 — Phone */}
          <div className={`rounded-xl p-5 border transition-all ${phoneVerified ? 'bg-white/5 border-white/10 opacity-70' : 'bg-[#4C6FFF]/5 border-[#4C6FFF]/20'}`}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${phoneVerified ? 'bg-green-500/20' : 'bg-[#4C6FFF]/20 border border-[#4C6FFF]/40'}`}>
                  {phoneVerified
                    ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                    : <Activity className="w-5 h-5 text-[#4C6FFF]" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold">Level 2 — Phone Verification</h3>
                  <p className="text-white/50 text-xs truncate">{phoneVerified ? e164Phone : 'Verify your mobile number'}</p>
                </div>
              </div>
              {phoneVerified
                ? <span className="px-3 py-1 rounded bg-green-500/20 text-green-400 text-xs font-bold uppercase tracking-widest border border-green-500/30 shrink-0">Verified</span>
                : <span className="px-3 py-1 rounded bg-yellow-500/10 text-yellow-400 text-xs font-bold uppercase tracking-widest border border-yellow-500/20 shrink-0">Pending</span>}
            </div>

            {!phoneVerified && (
              <div className="space-y-3 mt-2">
                {!otpSent ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={e => setCountryCode(e.target.value)}
                        className="h-11 bg-white/5 border border-white/10 rounded-xl px-2 text-white text-sm focus:border-[#4C6FFF] outline-none transition-all shrink-0"
                      >
                        {COUNTRY_CODES.map(c => (
                          <option key={c.code} value={c.code} className="bg-[#0F111A]">
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={e => { setPhoneInput(formatLocalPhone(e.target.value)); setPhoneError(''); }}
                        placeholder="(555) 000-0000"
                        className="flex-1 h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:border-[#4C6FFF] outline-none transition-all text-sm placeholder:text-white/30 min-w-0"
                      />
                    </div>
                    <button
                      onClick={handleSendOtp}
                      className="w-full h-11 rounded-xl bg-[#4C6FFF] text-white font-semibold text-sm hover:bg-[#3d5acc] transition-colors"
                    >
                      Verify with Authenticator
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-white/50">Open <span className="text-white font-medium">Google Authenticator</span> and enter the 6-digit code for <span className="text-white font-medium">Vilox Authenticator</span>. It refreshes every 30 seconds.</p>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={otpInput}
                        onChange={e => { setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6)); setPhoneError(''); }}
                        placeholder="000000"
                        maxLength={6}
                        className="flex-1 h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-mono tracking-[0.3em] focus:border-[#4C6FFF] outline-none transition-all text-sm"
                      />
                      <button
                        onClick={handleVerifyOtp}
                        disabled={otpInput.length < 6 || phoneVerifying}
                        className="px-5 h-11 rounded-xl bg-[#4C6FFF] text-white font-semibold text-sm hover:bg-[#3d5acc] transition-colors disabled:opacity-60"
                      >
                        {phoneVerifying ? 'Verifying…' : 'Verify'}
                      </button>
                    </div>
                    <button
                      onClick={() => { setOtpSent(false); setOtpInput(''); }}
                      className="text-xs text-white/30 hover:text-white/60 transition-colors"
                    >Change number</button>
                  </div>
                )}
                {phoneError && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{phoneError}</p>
                )}
              </div>
            )}
          </div>

          {/* Level 3 — upload form */}
          {!isApproved && (
            <div className="bg-[#4C6FFF]/5 border border-[#4C6FFF]/30 rounded-xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#4C6FFF]/20 flex items-center justify-center border border-[#4C6FFF]/50 shrink-0">
                    <ShieldAlert className="w-5 h-5 text-[#4C6FFF]" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Level 3 — Identity Verification</h3>
                    <p className="text-white/60 text-sm">Upload a government-issued ID and selfie</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest border shrink-0 ${badge.bg} ${badge.color} ${badge.border}`}>{badge.label}</span>
              </div>

              {kycStatus === 'pending' ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
                  <p className="text-sm text-blue-300">Your documents are under review. We'll notify you within 24-48 hours.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 uppercase tracking-widest">Document Type</label>
                    <select
                      value={docType}
                      onChange={e => setDocType(e.target.value as typeof docType)}
                      className="w-full sm:w-64 h-12 bg-[#0F111A] border border-white/10 rounded-xl px-4 text-white focus:border-[#4C6FFF] transition-all outline-none appearance-none"
                    >
                      <option value="passport">Passport</option>
                      <option value="national_id">National ID</option>
                      <option value="drivers_license">Driver's License</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Front */}
                    <div
                      onClick={() => frontRef.current?.click()}
                      className="h-40 border-2 border-dashed border-white/20 rounded-xl bg-white/5 flex flex-col items-center justify-center hover:bg-white/10 hover:border-[#4C6FFF]/50 transition-all cursor-pointer group"
                    >
                      <input ref={frontRef} type="file" accept="image/*" className="hidden" onChange={e => setDocFrontFile(e.target.files?.[0] ?? null)} />
                      {docFrontFile ? (
                        <><CheckCircle2 className="w-8 h-8 text-green-400 mb-2" /><span className="text-xs text-green-400 text-center px-2 truncate max-w-full">{docFrontFile.name}</span></>
                      ) : (
                        <><UploadCloud className="w-8 h-8 text-white/40 group-hover:text-[#4C6FFF] mb-3 transition-colors" /><span className="text-sm text-white font-medium">Front of Document</span><span className="text-xs text-white/40 mt-1">PNG, JPG up to 10MB</span></>
                      )}
                    </div>
                    {/* Back */}
                    <div
                      onClick={() => backRef.current?.click()}
                      className="h-40 border-2 border-dashed border-white/20 rounded-xl bg-white/5 flex flex-col items-center justify-center hover:bg-white/10 hover:border-[#4C6FFF]/50 transition-all cursor-pointer group"
                    >
                      <input ref={backRef} type="file" accept="image/*" className="hidden" onChange={e => setDocBackFile(e.target.files?.[0] ?? null)} />
                      {docBackFile ? (
                        <><CheckCircle2 className="w-8 h-8 text-green-400 mb-2" /><span className="text-xs text-green-400 text-center px-2 truncate max-w-full">{docBackFile.name}</span></>
                      ) : (
                        <><UploadCloud className="w-8 h-8 text-white/40 group-hover:text-[#4C6FFF] mb-3 transition-colors" /><span className="text-sm text-white font-medium">Back of Document</span><span className="text-xs text-white/40 mt-1">PNG, JPG up to 10MB</span></>
                      )}
                    </div>
                  </div>

                  {/* Selfie */}
                  <div className={`h-48 border-2 border-dashed rounded-xl bg-white/5 flex flex-col items-center justify-center relative overflow-hidden transition-all ${cameraOpen ? 'border-[#4C6FFF]/60' : 'border-white/20 hover:border-[#4C6FFF]/50'}`}>
                    <input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => setSelfieFile(e.target.files?.[0] ?? null)} />
                    <canvas ref={canvasRef} className="hidden" />

                    {cameraOpen ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
                        <video ref={videoRef} autoPlay playsInline muted className="rounded-lg max-h-28 w-auto object-cover" />
                        <div className="flex gap-2">
                          <button type="button" onClick={capturePhoto} className="px-4 py-1.5 rounded-lg bg-[#4C6FFF] text-white text-xs font-semibold hover:bg-[#3d5acc] transition-colors">
                            Capture
                          </button>
                          <button type="button" onClick={closeCamera} className="px-4 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : selfieFile ? (
                      <div className="flex flex-col items-center gap-2 p-3 w-full h-full justify-center">
                        <img src={URL.createObjectURL(selfieFile)} alt="Selfie preview" className="max-h-28 rounded-lg object-cover" />
                        <button type="button" onClick={() => setSelfieFile(null)} className="text-xs text-white/40 hover:text-white/70 transition-colors">
                          Retake
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                          <div className="w-20 h-28 border-2 border-white rounded-[40px]" />
                        </div>
                        <Camera className="w-7 h-7 text-white/40 mb-2 relative z-10" />
                        <span className="text-sm text-white font-medium mb-3 relative z-10">Selfie</span>
                        <div className="flex gap-2 relative z-10">
                          <button
                            type="button"
                            onClick={openCamera}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4C6FFF]/80 text-white text-xs font-semibold hover:bg-[#4C6FFF] transition-colors"
                          >
                            <Camera className="w-3.5 h-3.5" /> Use Camera
                          </button>
                          <button
                            type="button"
                            onClick={() => selfieRef.current?.click()}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors"
                          >
                            <UploadCloud className="w-3.5 h-3.5" /> Upload
                          </button>
                        </div>
                        {cameraError && <p className="text-xs text-red-400 mt-2 px-4 text-center relative z-10">{cameraError}</p>}
                      </>
                    )}
                  </div>

                  {submitStatus === 'success' && (
                    <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircle2 className="w-4 h-4" /> Documents submitted — under review.</div>
                  )}
                  {submitStatus === 'error' && (
                    <div className="flex items-center gap-2 text-red-400 text-sm"><AlertTriangle className="w-4 h-4" /> {errorMsg || 'Upload failed. Try again.'}</div>
                  )}

                  <button
                    type="button"
                    disabled={isSubmitting || (!docFrontFile && !selfieFile)}
                    onClick={handleSubmit}
                    className="w-full py-4 rounded-xl bg-[#4C6FFF] text-white font-bold tracking-wide hover:bg-[#3d5acc] transition-colors shadow-[0_0_20px_rgba(76,111,255,0.4)] disabled:opacity-60"
                  >
                    {isSubmitting ? 'Uploading…' : 'Submit Documents'}
                  </button>
                </div>
              )}
            </div>
          )}

          {isApproved && (
            <div className="flex items-center gap-3 p-5 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
              <div>
                <p className="text-white font-semibold">Identity Verified</p>
                <p className="text-sm text-white/50">Your account is fully unlocked.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SecuritySection = () => {
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwStatus, setPwStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [pwError, setPwError] = useState('');

  // TOTP / Google Authenticator
  const [totpEnrolled, setTotpEnrolled] = useState(false);
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [totpLoading, setTotpLoading] = useState(true);
  const [enrollData, setEnrollData] = useState<{ qrCode: string; secret: string; factorId: string } | null>(null);
  const [enrollCode, setEnrollCode] = useState('');
  const [enrollStatus, setEnrollStatus] = useState<'idle' | 'confirming' | 'success' | 'error'>('idle');
  const [enrollError, setEnrollError] = useState('');
  const [unenrolling, setUnenrolling] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = data?.totp?.find(f => f.status === 'verified');
      setTotpEnrolled(!!verified);
      setTotpFactorId(verified?.id ?? null);
      setTotpLoading(false);
    });
  }, []);

  const handleStartEnroll = async () => {
    setEnrollError('');
    setEnrollCode('');
    setEnrollStatus('idle');
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Vilox Authenticator' });
    if (error || !data) { setEnrollError(error?.message ?? 'Failed to start setup'); return; }
    setEnrollData({ qrCode: data.totp.qr_code, secret: data.totp.secret, factorId: data.id });
  };

  const handleConfirmEnroll = async () => {
    if (!enrollData || enrollCode.length < 6) return;
    setEnrollStatus('confirming');
    setEnrollError('');
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.factorId });
      if (chErr || !ch) throw new Error(chErr?.message ?? 'Challenge failed');
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: enrollData.factorId, challengeId: ch.id, code: enrollCode });
      if (vErr) throw new Error('Invalid code. Try again.');
      setTotpEnrolled(true);
      setTotpFactorId(enrollData.factorId);
      setEnrollData(null);
      setEnrollCode('');
      setEnrollStatus('success');
    } catch (e: unknown) {
      setEnrollError((e as Error).message);
      setEnrollStatus('error');
    }
  };

  const handleUnenroll = async () => {
    if (!totpFactorId) return;
    setUnenrolling(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactorId });
    if (!error) { setTotpEnrolled(false); setTotpFactorId(null); setEnrollStatus('idle'); }
    setUnenrolling(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwNew !== pwConfirm) { setPwStatus('error'); setPwError('Passwords do not match.'); return; }
    if (pwNew.length < 8) { setPwStatus('error'); setPwError('Password must be at least 8 characters.'); return; }
    setPwStatus('saving');
    setPwError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: pwNew });
      if (error) throw error;
      setPwStatus('success');
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
      setTimeout(() => setPwStatus('idle'), 4000);
    } catch (e) {
      setPwStatus('error');
      setPwError((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0F111A] border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Security Settings</h2>
        
        <div className="space-y-8 max-w-2xl">
          {/* Change Password */}
          <div className="pb-8 border-b border-white/10">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-white/50" /> Change Password
            </h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={pwCurrent}
                  onChange={e => setPwCurrent(e.target.value)}
                  placeholder="Current Password"
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 pr-12 text-white focus:border-[#4C6FFF] transition-all outline-none placeholder:text-white/30"
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2">
                  {showCurrent ? <Eye className="w-4 h-4 text-white/30" /> : <EyeOff className="w-4 h-4 text-white/30" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={pwNew}
                  onChange={e => setPwNew(e.target.value)}
                  placeholder="New Password"
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 pr-12 text-white focus:border-[#4C6FFF] transition-all outline-none placeholder:text-white/30"
                />
                <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2">
                  {showNew ? <Eye className="w-4 h-4 text-white/30" /> : <EyeOff className="w-4 h-4 text-white/30" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={pwConfirm}
                  onChange={e => setPwConfirm(e.target.value)}
                  placeholder="Confirm New Password"
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 pr-12 text-white focus:border-[#4C6FFF] transition-all outline-none placeholder:text-white/30"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2">
                  {showConfirm ? <Eye className="w-4 h-4 text-white/30" /> : <EyeOff className="w-4 h-4 text-white/30" />}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={pwStatus === 'saving' || !pwNew}
                  className="px-6 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors border border-white/10 disabled:opacity-60"
                >
                  {pwStatus === 'saving' ? 'Updating…' : 'Update Password'}
                </button>
                {pwStatus === 'success' && <span className="flex items-center gap-1.5 text-green-400 text-sm"><CheckCircle2 className="w-4 h-4" /> Password updated</span>}
                {pwStatus === 'error' && <span className="flex items-center gap-1.5 text-red-400 text-sm"><AlertTriangle className="w-4 h-4" /> {pwError}</span>}
              </div>
            </form>
          </div>

          {/* 2FA */}
          <div className="pb-8 border-b border-white/10">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-white/50" /> Two-Factor Authentication (2FA)
            </h3>
            {totpLoading ? (
              <div className="h-16 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
            ) : totpEnrolled ? (
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <div className="font-medium text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" /> Google Authenticator
                  </div>
                  <div className="text-xs text-green-400/80 mt-0.5">Active — required for withdrawals</div>
                </div>
                <button
                  onClick={handleUnenroll}
                  disabled={unenrolling}
                  className="px-4 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  {unenrolling ? 'Removing…' : 'Remove'}
                </button>
              </div>
            ) : enrollData ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-white">Step 1 — Scan with Google Authenticator</p>
                  <p className="text-sm text-white/60">Open the Google Authenticator app on your phone, tap <span className="text-white font-medium">+</span> → <span className="text-white font-medium">Scan QR code</span>, then point your camera at the code below.</p>
                </div>
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-xl inline-block">
                    <img src={enrollData.qrCode} alt="TOTP QR Code" className="w-44 h-44" />
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-xs text-white/50 shrink-0">Manual key:</span>
                  <code className="text-xs text-[#4C6FFF] font-mono flex-1 break-all">{enrollData.secret}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(enrollData.secret); setCopiedSecret(true); setTimeout(() => setCopiedSecret(false), 2000); }}
                    className="shrink-0 text-white/50 hover:text-white transition-colors"
                    title="Copy secret"
                  >
                    {copiedSecret ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-white">Step 2 — Enter the 6-digit code</p>
                  <p className="text-sm text-white/60">Open Google Authenticator and type the 6-digit code shown for <span className="text-white font-medium">Vilox Authenticator</span>. It refreshes every 30 seconds.</p>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={enrollCode}
                  onChange={e => setEnrollCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-center text-xl font-mono tracking-[0.5em] focus:border-[#4C6FFF] transition-all outline-none placeholder:text-white/20"
                />
                {enrollError && <p className="text-red-400 text-sm text-center">{enrollError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => setEnrollData(null)}
                    className="flex-1 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmEnroll}
                    disabled={enrollCode.length < 6 || enrollStatus === 'confirming'}
                    className="flex-1 h-10 rounded-xl bg-[#4C6FFF] text-white text-sm font-semibold hover:bg-[#3d5acc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {enrollStatus === 'confirming' ? 'Verifying…' : 'Confirm Setup'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <div className="font-medium text-white">Google Authenticator</div>
                    <div className="text-xs text-white/50">Required for withdrawals. Not yet set up.</div>
                  </div>
                  <button
                    onClick={handleStartEnroll}
                    className="px-4 py-1.5 rounded-lg bg-[#4C6FFF]/20 text-[#4C6FFF] text-xs font-bold uppercase tracking-widest border border-[#4C6FFF]/30 hover:bg-[#4C6FFF]/30 transition-colors"
                  >
                    Set Up
                  </button>
                </div>
                {enrollError && <p className="text-red-400 text-sm">{enrollError}</p>}
              </div>
            )}
          </div>

          {/* Anti-phishing */}
          <div>
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-white/50" /> Anti-Phishing Code
            </h3>
            <p className="text-sm text-white/60 mb-4">Set a custom phrase that will appear in all official Vilox AI emails to verify their authenticity.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="text" defaultValue="VILOX-SAFE" className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-mono focus:border-[#4C6FFF] transition-all outline-none min-w-0" />
              <button className="h-12 px-6 rounded-xl bg-[#4C6FFF] text-white font-semibold hover:bg-[#3d5acc] transition-colors shrink-0">Update</button>
            </div>
            <div className="mt-4 p-4 rounded-xl bg-[#4C6FFF]/5 border border-[#4C6FFF]/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#4C6FFF] shrink-0 mt-0.5" />
              <div>
                <span className="text-sm text-white/80">Preview of official email footer:</span>
                <div className="mt-2 text-xs font-mono text-[#4C6FFF] opacity-80 border-l-2 border-[#4C6FFF] pl-3 py-1">
                  Security Phrase: VILOX-SAFE<br/>
                  Always check this phrase before clicking links.
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const SessionsSection = () => {
  // admin.listUserSessions / admin.signOut require a service-role key which must
  // never be exposed on the client. We show the current session only and let
  // the user sign out of all other sessions via supabase.auth.signOut({ scope: 'global' }).
  const { user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOutAll = async () => {
    setIsSigningOut(true);
    await supabase.auth.signOut({ scope: 'global' });
    // Auth redirect handled by AuthContext
  };

  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString()
    : 'Unknown';

  return (
    <div className="space-y-6">
      <div className="bg-[#0F111A] border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-bold text-white">Active Sessions</h2>
          <button
            onClick={handleSignOutAll}
            disabled={isSigningOut}
            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            <LogOut className="w-4 h-4" /> {isSigningOut ? 'Signing out…' : 'Log Out All Devices'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/40 uppercase tracking-widest">
                <th className="py-4 font-medium">Account</th>
                <th className="py-4 font-medium">Provider</th>
                <th className="py-4 font-medium">Last Active</th>
                <th className="py-4 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="group">
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                      <Laptop className="w-5 h-5 text-white/60" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{user?.email ?? '—'}</div>
                      <div className="text-xs text-white/50 font-mono">{user?.id?.slice(0, 16) ?? ''}…</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 text-sm text-white/70 capitalize">{user?.app_metadata?.provider ?? 'email'}</td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm text-green-400 font-medium">{lastSignIn}</span>
                  </div>
                </td>
                <td className="py-4 text-right">
                  <span className="px-3 py-1 rounded bg-green-500/20 text-green-400 text-xs font-bold uppercase tracking-widest border border-green-500/30">Current</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-white/30">Session management via admin API requires a server-side endpoint. Use "Log Out All Devices" to invalidate all tokens.</p>
      </div>
    </div>
  );
};

const PaymentsSection = () => {
  const { user } = useAuth();

  type PaymentMethod = {
    id: string;
    type: 'card' | 'bank';
    label: string;
    last4: string;
    brand?: string;        // VISA / MC / AMEX / DISC
    expiry?: string;
    holderName?: string;
    bankName?: string;
    accountType?: string;  // checking / savings
    isPrimary: boolean;
  };

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // â”€â”€ Card form fields (raw, never persisted) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [formType, setFormType] = useState<'card' | 'bank'>('card');
  // card
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [showCvv, setShowCvv] = useState(false);
  // bank
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [routingNum, setRoutingNum] = useState('');
  const [accountNum, setAccountNum] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    getUserProfile(user.id)
      .then(data => {
        if (data?.payment_methods && Array.isArray(data.payment_methods)) {
          setMethods(data.payment_methods as PaymentMethod[]);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user]);

  const persist = async (updated: PaymentMethod[]) => {
    if (!user) return;
    await updateUserProfile(user.id, { payment_methods: updated });
    setMethods(updated);
  };

  // Format card number with spaces: 4-4-4-4
  const formatCardDisplay = (val: string) =>
    val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  // Detect card brand from first digits
  const detectBrand = (num: string): string => {
    const n = num.replace(/\s/g, '');
    if (/^4/.test(n)) return 'VISA';
    if (/^5[1-5]|^2[2-7]/.test(n)) return 'MC';
    if (/^3[47]/.test(n)) return 'AMEX';
    if (/^6(?:011|5)/.test(n)) return 'DISC';
    return '—';
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const resetForm = () => {
    setCardNumber(''); setCardExpiry(''); setCardCvv(''); setCardHolder('');
    setBankName(''); setAccountHolder(''); setRoutingNum(''); setAccountNum('');
    setAccountType('checking'); setShowCvv(false);
  };

  const isCardValid = () => {
    const digits = cardNumber.replace(/\s/g, '');
    return digits.length === 16 && cardExpiry.length === 5 && (cardCvv.length === 3 || cardCvv.length === 4) && cardHolder.trim().length >= 2;
  };

  const isBankValid = () =>
    bankName.trim().length >= 2 && accountHolder.trim().length >= 2 &&
    routingNum.replace(/\D/g, '').length >= 8 && accountNum.replace(/\D/g, '').length >= 4;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      let newMethod: PaymentMethod;
      if (formType === 'card') {
        const digits = cardNumber.replace(/\s/g, '');
        newMethod = {
          id: crypto.randomUUID(),
          type: 'card',
          label: cardHolder.trim(),
          last4: digits.slice(-4),
          brand: detectBrand(digits),
          expiry: cardExpiry,
          holderName: cardHolder.trim(),
          isPrimary: methods.length === 0,
        };
      } else {
        const acctDigits = accountNum.replace(/\D/g, '');
        newMethod = {
          id: crypto.randomUUID(),
          type: 'bank',
          label: bankName.trim(),
          last4: acctDigits.slice(-4),
          bankName: bankName.trim(),
          holderName: accountHolder.trim(),
          accountType,
          isPrimary: methods.length === 0,
        };
      }
      await persist([...methods, newMethod]);
      setSaveStatus('success');
      setShowForm(false);
      resetForm();
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    const updated = methods.filter(m => m.id !== id);
    if (updated.length > 0 && !updated.some(m => m.isPrimary)) updated[0].isPrimary = true;
    await persist(updated).catch(() => {});
  };

  const handleSetPrimary = async (id: string) => {
    await persist(methods.map(m => ({ ...m, isPrimary: m.id === id }))).catch(() => {});
  };

  const brandColors: Record<string, string> = {
    VISA: 'bg-[#1A1F71]', MC: 'bg-[#EB001B]/80', AMEX: 'bg-[#007BC1]', DISC: 'bg-[#FF6600]',
  };

  const inputCls = 'w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:border-[#4C6FFF] outline-none transition-all text-sm placeholder:text-white/30';
  const labelCls = 'block text-xs text-white/40 uppercase tracking-widest mb-1.5';

  return (
    <div className="space-y-6">
      <div className="bg-[#0F111A] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-white">Payment Methods</h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4C6FFF]/10 border border-[#4C6FFF]/30 text-[#4C6FFF] text-sm font-semibold hover:bg-[#4C6FFF]/20 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Method
            </button>
          )}
        </div>
        <p className="text-xs text-white/30 mb-6">Used to purchase crypto and fund your Vilox AI wallet.</p>

        {isLoading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 animate-pulse bg-white/5 rounded-xl" />)}</div>
        ) : (
          <div className="space-y-3">
            {methods.length === 0 && !showForm && (
              <div className="text-center py-12 text-white/30">
                <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No payment methods yet</p>
                <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 text-sm border border-white/10 transition-colors">
                  Add your first method
                </button>
              </div>
            )}

            {methods.map(m => (
              <div key={m.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-9 rounded-lg flex items-center justify-center font-bold text-[10px] tracking-wider ${m.type === 'card' ? (brandColors[m.brand ?? ''] ?? 'bg-blue-600') : 'bg-indigo-600'} text-white`}>
                    {m.type === 'card' ? (m.brand ?? 'CARD') : 'BANK'}
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">{m.holderName ?? m.label} •••• {m.last4}</div>
                    <div className="text-xs text-white/40 mt-0.5">
                      {m.type === 'card' ? `Expires ${m.expiry ?? '—'}` : `${m.bankName} · ${m.accountType ?? 'Account'}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.isPrimary ? (
                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-green-500/10 text-green-400 border border-green-500/20">Primary</span>
                  ) : (
                    <button onClick={() => handleSetPrimary(m.id)} className="px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-widest bg-white/5 text-white/40 border border-white/10 hover:text-white hover:bg-white/10 transition-colors">
                      Set Primary
                    </button>
                  )}
                  <button onClick={() => handleRemove(m.id)} className="w-7 h-7 rounded flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* â”€â”€ Add method form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {showForm && (
              <motion.form
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleAdd}
                className="p-5 rounded-xl bg-[#4C6FFF]/5 border border-[#4C6FFF]/20 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">Add Payment Method</h3>
                  <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
                </div>

                {/* Type toggle */}
                <div className="flex gap-2 bg-black/30 p-1 rounded-xl">
                  {(['card', 'bank'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setFormType(t)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${formType === t ? 'bg-[#4C6FFF]/20 text-[#4C6FFF] border border-[#4C6FFF]/30' : 'text-white/40 hover:text-white'}`}
                    >
                      {t === 'card' ? <CreditCard className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                      {t === 'card' ? 'Credit / Debit Card' : 'Bank Account'}
                    </button>
                  ))}
                </div>

                {formType === 'card' ? (
                  <div className="space-y-4">
                    {/* Card number with live brand badge */}
                    <div>
                      <label className={labelCls}>Card Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatCardDisplay(cardNumber.replace(/\s/g, ''))}
                          onChange={e => setCardNumber(e.target.value.replace(/\s/g, '').replace(/\D/g, '').slice(0, 16))}
                          placeholder="0000 0000 0000 0000"
                          required
                          className={`${inputCls} font-mono pr-16`}
                        />
                        {cardNumber.replace(/\s/g, '').length >= 1 && (
                          <span className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-bold text-white ${brandColors[detectBrand(cardNumber)] ?? 'bg-white/20'}`}>
                            {detectBrand(cardNumber)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cardholder Name */}
                    <div>
                      <label className={labelCls}>Cardholder Name</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={e => setCardHolder(e.target.value)}
                        placeholder="Name as it appears on card"
                        required
                        className={inputCls}
                        autoComplete="cc-name"
                      />
                    </div>

                    {/* Expiry + CVV side by side */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Expiry Date</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={cardExpiry}
                          onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                          placeholder="MM/YY"
                          maxLength={5}
                          required
                          className={`${inputCls} font-mono`}
                          autoComplete="cc-exp"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>CVV / CVC</label>
                        <div className="relative">
                          <input
                            type={showCvv ? 'text' : 'password'}
                            inputMode="numeric"
                            value={cardCvv}
                            onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="•••"
                            maxLength={4}
                            required
                            className={`${inputCls} font-mono pr-10`}
                            autoComplete="cc-csc"
                          />
                          <button type="button" onClick={() => setShowCvv(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                            {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-white/30 bg-white/5 rounded-xl p-3">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#4C6FFF]/60" />
                      Your card details are used solely to purchase crypto on your behalf. Only the last 4 digits and expiry are stored — CVV is never saved.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Bank name */}
                    <div>
                      <label className={labelCls}>Bank Name</label>
                      <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Chase, Wells Fargo, HSBC" required className={inputCls} />
                    </div>

                    {/* Account holder */}
                    <div>
                      <label className={labelCls}>Account Holder Name</label>
                      <input type="text" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} placeholder="Full name on account" required className={inputCls} autoComplete="name" />
                    </div>

                    {/* Account type */}
                    <div>
                      <label className={labelCls}>Account Type</label>
                      <div className="flex gap-2 bg-black/30 p-1 rounded-lg">
                        {(['checking', 'savings'] as const).map(t => (
                          <button key={t} type="button" onClick={() => setAccountType(t)}
                            className={`flex-1 py-2 rounded-md text-sm font-semibold capitalize transition-all ${accountType === t ? 'bg-[#4C6FFF]/20 text-[#4C6FFF] border border-[#4C6FFF]/30' : 'text-white/40 hover:text-white'}`}
                          >{t}</button>
                        ))}
                      </div>
                    </div>

                    {/* Routing number */}
                    <div>
                      <label className={labelCls}>Routing Number (ABA / Sort Code / SWIFT)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={routingNum}
                        onChange={e => setRoutingNum(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        placeholder="e.g. 021000021"
                        required
                        className={`${inputCls} font-mono`}
                      />
                    </div>

                    {/* Account number */}
                    <div>
                      <label className={labelCls}>Account Number / IBAN</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={accountNum}
                        onChange={e => setAccountNum(e.target.value.replace(/[^0-9A-Za-z]/g, '').slice(0, 34))}
                        placeholder="e.g. 000123456789"
                        required
                        className={`${inputCls} font-mono`}
                      />
                    </div>

                    <div className="flex items-start gap-2 text-xs text-white/30 bg-white/5 rounded-xl p-3">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#4C6FFF]/60" />
                      Only the last 4 digits of your account number are stored. Bank details are used only to initiate crypto purchase transfers.
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={isSaving || (formType === 'card' ? !isCardValid() : !isBankValid())}
                    className="px-6 py-2.5 rounded-xl bg-[#4C6FFF] text-white font-semibold hover:bg-[#3d5acc] transition-colors text-sm disabled:opacity-60 flex items-center gap-2"
                  >
                    {isSaving ? 'Saving…' : <><Plus className="w-4 h-4" /> Add Method</>}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 hover:text-white border border-white/10 text-sm transition-colors">
                    Cancel
                  </button>
                  {saveStatus === 'success' && <span className="text-green-400 text-sm flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Added</span>}
                  {saveStatus === 'error' && <span className="text-red-400 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Failed</span>}
                </div>
              </motion.form>
            )}
          </div>
        )}

        <div className="mt-6 flex items-start gap-2 text-xs text-white/20">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/20" />
          <span>CVV and full card/account numbers are never stored on Vilox AI servers. All payment data is encrypted in transit.</span>
        </div>
      </div>
    </div>
  );
};

const DEFAULT_NOTIF_PREFS = {
  trade_alerts:      { email: true,  push: true,  sms: false },
  ai_signals:        { email: true,  push: true,  sms: false },
  price_alerts:      { email: true,  push: false, sms: false },
  security_alerts:   { email: true,  push: true,  sms: true  },
  portfolio_updates: { email: true,  push: false, sms: false },
  marketing_emails:  { email: false, push: false, sms: false },
};

type NotifKey = keyof typeof DEFAULT_NOTIF_PREFS;
type NotifChannel = 'email' | 'push' | 'sms';

const NOTIF_LABELS: Record<NotifKey, string> = {
  trade_alerts:      'Trade Alerts',
  ai_signals:        'AI Signals',
  price_alerts:      'Price Alerts',
  security_alerts:   'Security Alerts',
  portfolio_updates: 'Portfolio Updates',
  marketing_emails:  'Marketing Emails',
};

const NotificationsSection = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({ ...DEFAULT_NOTIF_PREFS });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.id)
      .then(data => {
        if (data?.notification_prefs && Object.keys(data.notification_prefs).length > 0) {
          setPrefs({ ...DEFAULT_NOTIF_PREFS, ...(data.notification_prefs as typeof DEFAULT_NOTIF_PREFS) });
        }
      })
      .catch(() => {});
  }, [user]);

  const toggle = (key: NotifKey, channel: NotifChannel) => {
    setPrefs(prev => ({ ...prev, [key]: { ...prev[key], [channel]: !prev[key][channel] } }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await updateUserProfile(user.id, { notification_prefs: prefs });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0F111A] border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Notification Settings</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/40 uppercase tracking-widest">
                <th className="py-4 font-medium w-1/2">Notification Type</th>
                <th className="py-4 font-medium text-center">Email</th>
                <th className="py-4 font-medium text-center">Push</th>
                <th className="py-4 font-medium text-center">SMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(Object.keys(prefs) as NotifKey[]).map(key => (
                <tr key={key}>
                  <td className="py-4 font-medium text-white/80">{NOTIF_LABELS[key]}</td>
                  {(['email', 'push', 'sms'] as NotifChannel[]).map(ch => (
                    <td key={ch} className="py-4 text-center">
                      <input
                        type="checkbox"
                        checked={prefs[key][ch]}
                        onChange={() => toggle(key, ch)}
                        className="w-4 h-4 accent-[#4C6FFF] rounded border-white/20 bg-white/5 cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-[#4C6FFF] text-white font-semibold hover:bg-[#3d5acc] transition-colors shadow-[0_0_15px_rgba(76,111,255,0.3)] disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save Preferences'}
          </button>
          {saveStatus === 'success' && <span className="flex items-center gap-1.5 text-green-400 text-sm"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
          {saveStatus === 'error' && <span className="flex items-center gap-1.5 text-red-400 text-sm"><AlertTriangle className="w-4 h-4" /> Failed</span>}
        </div>
      </div>
    </div>
  );
};

const DEFAULT_TRADING_PREFS = {
  default_currency: 'USD',
  order_type: 'market',
  risk_tolerance: 'moderate' as 'conservative' | 'moderate' | 'aggressive',
  auto_trade: false,
  daily_limit: 5000,
};

const PreferencesSection = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({ ...DEFAULT_TRADING_PREFS });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.id)
      .then(data => {
        if (data?.trading_prefs && Object.keys(data.trading_prefs).length > 0) {
          setPrefs({ ...DEFAULT_TRADING_PREFS, ...(data.trading_prefs as typeof DEFAULT_TRADING_PREFS) });
        }
      })
      .catch(() => {});
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await updateUserProfile(user.id, { trading_prefs: prefs });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const RISK_OPTIONS = [
    { value: 'conservative' as const, label: 'Conservative', color: 'emerald', desc: 'Focus on capital preservation over aggressive gains.' },
    { value: 'moderate' as const,     label: 'Moderate',     color: 'blue',    desc: 'Balanced approach for steady portfolio growth.' },
    { value: 'aggressive' as const,   label: 'Aggressive',   color: 'rose',    desc: 'High volatility tolerance for maximum ROI.' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[#0F111A] border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Trading Preferences</h2>
        
        <div className="space-y-8 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs text-white/50 uppercase tracking-widest">Default Currency</label>
              <select
                value={prefs.default_currency}
                onChange={e => setPrefs(p => ({ ...p, default_currency: e.target.value }))}
                className="w-full h-12 bg-[#0F111A] border border-white/10 rounded-xl px-4 text-white focus:border-[#4C6FFF] transition-all outline-none appearance-none"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="BTC">BTC - Bitcoin</option>
                <option value="USDT">USDT - Tether</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/50 uppercase tracking-widest">Default Order Type</label>
              <select
                value={prefs.order_type}
                onChange={e => setPrefs(p => ({ ...p, order_type: e.target.value }))}
                className="w-full h-12 bg-[#0F111A] border border-white/10 rounded-xl px-4 text-white focus:border-[#4C6FFF] transition-all outline-none appearance-none"
              >
                <option value="market">Market Order</option>
                <option value="limit">Limit Order</option>
                <option value="stop_loss">Stop-Loss Order</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs text-white/50 uppercase tracking-widest block">Risk Tolerance Level</label>
            <div className="grid grid-cols-3 gap-4">
              {RISK_OPTIONS.map(opt => {
                const isSelected = prefs.risk_tolerance === opt.value;
                const colorMap: Record<string, string> = {
                  emerald: 'text-emerald-400 border-emerald-500/50',
                  blue: 'text-[#4C6FFF] border-[#4C6FFF]/50 bg-[#4C6FFF]/10',
                  rose: 'text-rose-400 border-rose-500/50',
                };
                return (
                  <div
                    key={opt.value}
                    onClick={() => setPrefs(p => ({ ...p, risk_tolerance: opt.value }))}
                    className={`p-4 rounded-xl border cursor-pointer transition-all relative ${
                      isSelected ? colorMap[opt.color] + ' shadow-[0_0_15px_rgba(76,111,255,0.1)]' : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    {isSelected && <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#4C6FFF] rounded-full flex items-center justify-center shadow-lg"><Check className="w-3 h-3 text-white" /></div>}
                    <div className={`font-semibold mb-1 text-sm ${isSelected ? colorMap[opt.color].split(' ')[0] : 'text-white/70'}`}>{opt.label}</div>
                    <div className="text-xs text-white/50 leading-relaxed">{opt.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-6 border-t border-white/10">
            <div className="flex items-start justify-between gap-4 p-5 rounded-xl bg-[#4C6FFF]/5 border border-[#4C6FFF]/20">
              <div>
                <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#4C6FFF]" /> AI Auto-Trade Execution
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">Let Vilox AI execute trades automatically based on your risk profile and active strategies.</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-xs text-white/50 uppercase tracking-widest">Max Daily Limit</span>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                    <input
                      type="number"
                      value={prefs.daily_limit}
                      onChange={e => setPrefs(p => ({ ...p, daily_limit: Number(e.target.value) }))}
                      className="w-full h-8 bg-black/40 border border-white/10 rounded px-6 text-sm text-white font-mono focus:border-[#4C6FFF] outline-none"
                    />
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={prefs.auto_trade}
                  onChange={e => setPrefs(p => ({ ...p, auto_trade: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4C6FFF]"></div>
              </label>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-[#4C6FFF] text-white font-semibold hover:bg-[#3d5acc] transition-colors shadow-[0_0_15px_rgba(76,111,255,0.3)] disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Save Trading Preferences'}
            </button>
            {saveStatus === 'success' && <span className="flex items-center gap-1.5 text-green-400 text-sm"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
            {saveStatus === 'error' && <span className="flex items-center gap-1.5 text-red-400 text-sm"><AlertTriangle className="w-4 h-4" /> Failed</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

const ReferralsSection = () => {
  const { user } = useAuth();
  const [referral, setReferral] = useState<{ referral_code: string; total_referred: number; rewards_usd: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    upsertReferral(user.id)
      .then(data => {
        if (data) setReferral({ referral_code: data.referral_code, total_referred: Number(data.total_referred), rewards_usd: Number(data.rewards_usd) });
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user]);

  const referralLink = referral ? `https://vilox.ai/ref/${referral.referral_code}` : '';

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0F111A] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <h2 className="text-xl font-bold text-white mb-2">Referral & Rewards</h2>
        <p className="text-sm text-white/60 mb-8 max-w-lg">Invite friends to Vilox AI and earn rewards. When they deposit their first $100, you both get a $25 bonus directly into your wallets.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Friends Invited</div>
            {isLoading
              ? <div className="animate-pulse h-8 bg-white/10 rounded w-16" />
              : <div className="text-3xl font-mono text-white font-bold">{referral?.total_referred ?? 0}</div>}
          </div>
          <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Total Earned</div>
            {isLoading
              ? <div className="animate-pulse h-8 bg-white/10 rounded w-24" />
              : <div className="text-3xl font-mono text-green-400 font-bold">${(referral?.rewards_usd ?? 0).toFixed(2)}</div>}
          </div>
        </div>

        <div className="mb-10">
          <label className="text-xs text-white/50 uppercase tracking-widest block mb-2">Your Referral Link</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 h-14 bg-black/40 border border-[#4C6FFF]/30 rounded-xl px-4 flex items-center font-mono text-white/80 text-sm shadow-[0_0_15px_rgba(76,111,255,0.1)] overflow-hidden">
              {isLoading
                ? <div className="animate-pulse h-4 bg-white/10 rounded w-64" />
                : <span className="truncate">{referralLink || '—'}</span>}
            </div>
            <button
              onClick={handleCopy}
              disabled={!referralLink}
              className="h-14 px-6 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-40"
            >
              {copied ? <><Check className="w-4 h-4 text-green-400" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
            </button>
          </div>
        </div>

        <p className="text-xs text-white/30">Reward history and referred-user details are managed server-side. Contact support for a full breakdown.</p>
      </div>
    </div>
  );
};