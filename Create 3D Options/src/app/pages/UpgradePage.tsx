import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2, Zap, Crown, Shield, ChevronDown, X, Lock, Star, WalletMinimal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, getUserWallet } from '../lib/db';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router';

const PLAN_RANK: Record<string, number> = { starter: 0, pro: 1, elite: 2 };

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 0,
    description: 'Perfect for exploring Vilox AI',
    features: [
      'Basic market data',
      '5 trades per month',
      'Standard AI signals',
      'Email support',
      '1 active strategy',
    ],
    borderClass: 'border-white/10',
    glowColor: null as string | null,
    badge: null as string | null,
    badgeColor: null as string | null,
    icon: Shield,
  },
  {
    id: 'pro',
    name: 'Pro AI',
    monthlyPrice: 500,
    description: 'For serious AI-powered traders',
    features: [
      'Real-time market data',
      'Unlimited trades',
      'Advanced AI signals',
      'Priority 24/7 support',
      '10 active strategies',
      'Portfolio analytics',
      'AI monitoring',
    ],
    borderClass: 'border-[#4C6FFF]/50',
    glowColor: 'rgba(76,111,255,0.28)',
    badge: 'Most Popular',
    badgeColor: '#4C6FFF',
    icon: Zap,
  },
  {
    id: 'elite',
    name: 'Elite AI',
    monthlyPrice: 2000,
    description: 'Institutional-grade trading power',
    features: [
      'Everything in Pro AI',
      'Dedicated account manager',
      'Custom AI strategies',
      'White-glove onboarding',
      'API access',
      'Institutional grade tools',
      'Risk management AI',
    ],
    borderClass: 'border-[#FFD700]/40',
    glowColor: 'rgba(255,215,0,0.22)',
    badge: 'Premium',
    badgeColor: '#FFD700',
    icon: Crown,
  },
] as const;

type Plan = typeof PLANS[number];

const FAQS = [
  {
    q: 'Can I cancel anytime?',
    a: "Yes, you can cancel your subscription anytime from the Settings page. Your plan will remain active until the end of the current billing period.",
  },
  {
    q: 'What happens to my trades if I downgrade?',
    a: "Your existing trades remain open and active. You won't lose any positions. New trades will be subject to the limits of your new plan.",
  },
  {
    q: 'How do I get a refund?',
    a: "We offer refunds within 7 days for annual plans. Please contact our live support team and we'll process your refund within 1–3 business days.",
  },
];

export function UpgradePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [usdBalance, setUsdBalance] = useState<number | null>(null); // null = loading
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [userPlan, setUserPlan] = useState('starter');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Parallel data loading for faster initial render
    Promise.all([
      getUserProfile(user.id),
      getUserWallet(user.id)
    ]).then(([profile, wallet]) => {
      setUserPlan((profile?.plan ?? 'starter').toLowerCase());
      setUsdBalance(wallet?.usd ?? 0);
    }).catch(() => {
      // Fallback values on error
      setUserPlan('starter');
      setUsdBalance(0);
    });
  }, [user]);

  const currentRank = PLAN_RANK[userPlan] ?? 0;

  const getMonthlyRate = (monthlyPrice: number) =>
    billing === 'annual' ? Math.round(monthlyPrice * 0.8) : monthlyPrice;

  // Total charge TODAY: monthly = 1 month, annual = 12 months at discounted rate
  const getTotalCharge = (monthlyPrice: number) => {
    const rate = getMonthlyRate(monthlyPrice);
    return billing === 'annual' ? rate * 12 : rate;
  };

  const openPayment = (plan: Plan) => {
    setSelectedPlan(plan);
    setSuccess(false);
    setSuccessMessage(null);
    setPaymentOpen(true);
  };

  const selectedTotal = selectedPlan ? getTotalCharge(selectedPlan.monthlyPrice) : 0;
  const fee = selectedTotal > 0 ? Math.round(selectedTotal * 0.025) : 0;
  const grandTotal = selectedTotal + fee;
  // null means still loading — treat as insufficient until confirmed
  const noFunds = usdBalance === null || usdBalance < grandTotal;

  const handleConfirmPayment = async () => {
    if (!user || !selectedPlan) return;
    if (noFunds || usdBalance === null || usdBalance < grandTotal) return;
    setProcessing(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/buy-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ plan: selectedPlan.id, price: grandTotal }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Purchase failed');

      // Update local state immediately
      setUserPlan(selectedPlan.id);
      setUsdBalance(prev => (prev !== null ? prev - grandTotal : prev));
      setSuccessMessage(data.message ?? `Welcome to ${selectedPlan.name}! Your account has been upgraded.`);
      // Signal Layout sidebar to re-fetch profile
      window.dispatchEvent(new Event('vilox:planUpgraded'));

      setSuccess(true);
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        setPaymentOpen(false);
        setSuccess(false);
        navigate('/app/dashboard');
      }, 3000);
    } catch (err) {
      let msg = 'Purchase failed. Please try again.';
      if (err instanceof Error) {
        msg = err.message;
        if (msg.includes('Insufficient balance')) msg = 'Insufficient balance. Please add funds to your account.';
      }
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  // (selectedTotal, fee, grandTotal computed above near noFunds)

  return (
    <div className="max-w-6xl mx-auto px-4 pb-20 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Page Header ── */}
      <div className="text-center pt-4 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4C6FFF]/10 border border-[#4C6FFF]/20 text-[#4C6FFF] text-xs font-semibold mb-4">
          <Zap className="w-3 h-3" /> Upgrade Your Plan
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">Choose Your Trading Power</h1>
        <p className="text-[#9CA3AF] text-lg">Unlock advanced AI tools and maximize your portfolio performance</p>
      </div>

      {/* ── Current Plan Banner ── */}
      {(() => {
        const bannerPlan = PLANS.find(p => p.id === userPlan) ?? PLANS[0];
        const BannerIcon = bannerPlan.icon;
        const bannerColor =
          userPlan === 'elite' ? '#FFD700' : userPlan === 'pro' ? '#4C6FFF' : '#9CA3AF';
        const bannerBg =
          userPlan === 'elite' ? 'rgba(255,215,0,0.08)' : userPlan === 'pro' ? 'rgba(76,111,255,0.08)' : 'rgba(255,255,255,0.04)';
        const bannerBorder =
          userPlan === 'elite' ? 'rgba(255,215,0,0.2)' : userPlan === 'pro' ? 'rgba(76,111,255,0.2)' : 'rgba(255,255,255,0.1)';
        return (
          <div className="mb-8 px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: bannerBg, border: `1px solid ${bannerBorder}` }}
            >
              <BannerIcon className="w-5 h-5" style={{ color: bannerColor }} />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">
                Current plan:{' '}
                <span className="font-bold capitalize" style={{ color: bannerColor }}>{bannerPlan.name}</span>
                {userPlan !== 'starter' && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: bannerBg, color: bannerColor, border: `1px solid ${bannerBorder}` }}>
                    Active
                  </span>
                )}
              </p>
              <p className="text-[#9CA3AF] text-sm">
                {userPlan === 'elite'
                  ? "You're on our highest tier — all features unlocked."
                  : userPlan === 'pro'
                  ? 'Upgrade to Elite AI for institutional-grade tools and a dedicated account manager.'
                  : 'Upgrade below to unlock more powerful trading features.'}
              </p>
            </div>
            {usdBalance !== null && (
              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-xs text-[#6B7280]">Balance</p>
                <p className="text-white font-semibold text-sm">${usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Billing Toggle ── */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex items-center bg-[#111827] border border-[#1F2937] rounded-full p-1">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              billing === 'monthly'
                ? 'bg-[#4C6FFF] text-white shadow-[0_0_15px_rgba(76,111,255,0.4)]'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              billing === 'annual'
                ? 'bg-[#4C6FFF] text-white shadow-[0_0_15px_rgba(76,111,255,0.4)]'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            Annual
            <span className="px-1.5 py-0.5 rounded-full bg-[#00FFA3]/20 text-[#00FFA3] text-xs font-bold leading-none">
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* ── Plan Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        {PLANS.map((plan) => {
          const planRank = PLAN_RANK[plan.id] ?? 0;
          const isCurrentPlan = plan.id === userPlan;
          const isUpgrade = planRank > currentRank;
          const monthlyRate = getMonthlyRate(plan.monthlyPrice);
          const annualTotal = monthlyRate * 12;
          const PlanIcon = plan.icon;

          const iconColor =
            plan.id === 'elite' ? '#FFD700' : plan.id === 'pro' ? '#4C6FFF' : '#9CA3AF';
          const iconBg =
            plan.id === 'elite'
              ? 'rgba(255,215,0,0.08)'
              : plan.id === 'pro'
              ? 'rgba(76,111,255,0.08)'
              : 'rgba(255,255,255,0.04)';
          const iconBorder =
            plan.id === 'elite'
              ? 'rgba(255,215,0,0.2)'
              : plan.id === 'pro'
              ? 'rgba(76,111,255,0.2)'
              : 'rgba(255,255,255,0.1)';

          return (
            <motion.div
              key={plan.id}
              whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 22 } }}
              className={`relative rounded-2xl border p-6 flex flex-col bg-[#111827]/90 backdrop-blur-sm ${plan.borderClass}`}
              style={
                plan.glowColor
                  ? { boxShadow: `0 0 32px ${plan.glowColor}, inset 0 1px 0 rgba(255,255,255,0.04)` }
                  : { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }
              }
            >
              {/* Popular / Premium badge */}
              {plan.badge && (
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                  style={{
                    backgroundColor: plan.badgeColor!,
                    color: plan.id === 'elite' ? '#0F111A' : '#fff',
                    boxShadow: `0 0 12px ${plan.glowColor ?? 'transparent'}`,
                  }}
                >
                  {plan.id === 'elite' && <Star className="inline w-3 h-3 mr-1 -mt-0.5" />}
                  {plan.badge}
                </div>
              )}

              {/* Icon + Name + Description */}
              <div className="mb-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: iconBg, border: `1px solid ${iconBorder}` }}
                >
                  <PlanIcon className="w-6 h-6" style={{ color: iconColor }} />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-[#9CA3AF] text-sm mb-4">{plan.description}</p>

                {/* Price */}
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-white">${monthlyRate.toLocaleString()}</span>
                  <span className="text-[#9CA3AF] text-sm mb-1.5">/mo</span>
                  {billing === 'annual' && plan.monthlyPrice > 0 && (
                    <span className="text-[#6B7280] text-xs mb-1.5 ml-1 line-through">
                      ${plan.monthlyPrice}/mo
                    </span>
                  )}
                </div>
                {billing === 'annual' && plan.monthlyPrice > 0 && (
                  <p className="text-[#00FFA3] text-xs">
                    ${annualTotal.toLocaleString()}/yr &middot; saves ${((plan.monthlyPrice - monthlyRate) * 12).toLocaleString()}
                  </p>
                )}
                {plan.monthlyPrice === 0 && (
                  <p className="text-[#9CA3AF] text-xs">Free forever</p>
                )}
              </div>

              {/* Feature list */}
              <ul className="flex-1 space-y-2.5 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-[#CBD5E1]">
                    <CheckCircle2 className="w-4 h-4 text-[#00FFA3] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrentPlan ? (
                <button
                  disabled
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-white/5 text-[#6B7280] border border-white/10 cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : isUpgrade ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openPayment(plan)}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={
                    plan.id === 'elite'
                      ? {
                          background: 'linear-gradient(135deg, #B8860B 0%, #FFD700 100%)',
                          boxShadow: '0 0 22px rgba(255,215,0,0.35), 0 4px 16px rgba(0,0,0,0.35)',
                          color: '#0F111A',
                        }
                      : {
                          background: 'linear-gradient(135deg, #3a56d4 0%, #4C6FFF 100%)',
                          boxShadow: '0 0 22px rgba(76,111,255,0.35), 0 4px 16px rgba(0,0,0,0.35)',
                        }
                  }
                >
                  <Zap className="w-4 h-4 shrink-0" />
                  Upgrade to {plan.name}
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openPayment(plan)}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-[#9CA3AF] border border-white/10 hover:border-white/20 hover:text-white transition-all bg-transparent"
                >
                  Downgrade to {plan.name}
                </motion.button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ── FAQ ── */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Frequently Asked Questions</h2>
        <div className="space-y-3 max-w-2xl mx-auto">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
              >
                <span className="font-medium text-white text-sm">{faq.q}</span>
                <motion.div
                  animate={{ rotate: openFaq === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-[#9CA3AF] shrink-0" />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-sm text-[#9CA3AF] leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* ── Payment Modal ── */}
      <AnimatePresence>
        {paymentOpen && selectedPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget && !processing) setPaymentOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 24 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="w-full max-w-md bg-[#0F111A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
              {success ? (
                /* ── Success Screen ── */
                <div className="p-10 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                    className="w-18 h-18 rounded-full bg-[#00FFA3]/10 border border-[#00FFA3]/30 flex items-center justify-center mx-auto mb-5"
                    style={{ width: 72, height: 72 }}
                  >
                    <CheckCircle2 className="w-9 h-9 text-[#00FFA3]" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Welcome to {selectedPlan.name}!
                  </h3>
                  <p className="text-[#9CA3AF] mb-1">
                    {successMessage ?? 'Your account has been upgraded successfully.'}
                  </p>
                  <p className="text-sm text-[#6B7280]">Redirecting to dashboard in 3 seconds…</p>
                </div>
              ) : (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {noFunds ? 'Fund Your Account' : 'Confirm Upgrade'}
                      </h3>
                      <p className="text-sm text-[#9CA3AF]">
                        {noFunds ? 'A balance is required to upgrade' : 'Review your plan details below'}
                      </p>
                    </div>
                    <button
                      onClick={() => setPaymentOpen(false)}
                      className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {noFunds ? (
                    /* ── No funds screen ── */
                    <div className="px-6 py-10 text-center">
                      <div
                        className="w-18 h-18 rounded-full bg-[#FBBF24]/10 border border-[#FBBF24]/25 flex items-center justify-center mx-auto mb-5"
                        style={{ width: 72, height: 72 }}
                      >
                        <WalletMinimal className="w-9 h-9 text-[#FBBF24]" />
                      </div>
                      <h4 className="text-xl font-bold text-white mb-2">Insufficient Funds</h4>
                      <p className="text-[#9CA3AF] text-sm leading-relaxed mb-2">
                        Kindly fund your account before upgrading to{' '}
                        <span className="text-white font-semibold">{selectedPlan.name}</span>.
                      </p>
                      <div className="flex justify-center gap-6 mb-7 text-sm">
                        <div className="text-center">
                          <p className="text-[#6B7280] text-xs mb-1">Your balance</p>
                          {usdBalance === null ? (
                            <div className="w-20 h-6 rounded-md bg-white/10 animate-pulse mx-auto" />
                          ) : (
                            <p className={`font-bold text-lg ${usdBalance <= 0 ? 'text-[#FF4D4D]' : 'text-[#FBBF24]'}`}>
                              ${usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                        <div className="w-px bg-white/10" />
                        <div className="text-center">
                          <p className="text-[#6B7280] text-xs mb-1">Required</p>
                          <p className="text-[#00FFA3] font-bold text-lg">${grandTotal.toLocaleString()}</p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setPaymentOpen(false);
                          navigate('/app/wallet', { state: { depositIntent: true } });
                        }}
                        className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2"
                        style={{
                          background: 'linear-gradient(135deg, #3a56d4 0%, #4C6FFF 100%)',
                          boxShadow: '0 0 22px rgba(76,111,255,0.35), 0 4px 16px rgba(0,0,0,0.35)',
                          color: '#fff',
                        }}
                      >
                        <WalletMinimal className="w-4 h-4 shrink-0" />
                        Go to Wallet &amp; Deposit
                      </motion.button>
                    </div>
                  ) : (
                  /* ── Regular payment body ── */
                  <>
                  <div className="px-6 py-5 space-y-4">
                    {/* Plan summary card */}
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-white font-semibold text-base">{selectedPlan.name}</span>
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-bold"
                          style={{
                            backgroundColor:
                              selectedPlan.id === 'elite'
                                ? 'rgba(255,215,0,0.12)'
                                : 'rgba(76,111,255,0.12)',
                            color:
                              selectedPlan.id === 'elite' ? '#FFD700' : '#4C6FFF',
                            border: `1px solid ${
                              selectedPlan.id === 'elite'
                                ? 'rgba(255,215,0,0.3)'
                                : 'rgba(76,111,255,0.3)'
                            }`,
                          }}
                        >
                          {billing === 'annual' ? 'Annual' : 'Monthly'} Billing
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-[#9CA3AF]">
                        {billing === 'annual' ? (
                          <>
                            <div className="flex justify-between">
                              <span>Monthly rate (×12 months)</span>
                              <span className="text-white font-medium">
                                ${getMonthlyRate(selectedPlan.monthlyPrice).toLocaleString()}/mo
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Annual subtotal</span>
                              <span className="text-white font-medium">${selectedTotal.toLocaleString()}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between">
                            <span>Plan price</span>
                            <span className="text-white font-medium">${selectedTotal.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Processing fee (2.5%)</span>
                          <span className="text-white font-medium">${fee.toLocaleString()}</span>
                        </div>
                        <div className="border-t border-white/10 pt-2.5 mt-1 flex justify-between font-semibold text-base">
                          <span className="text-white">Total due today</span>
                          <span className="text-white">${grandTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* SSL badge */}
                    <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                      <Shield className="w-4 h-4 text-[#00FFA3] shrink-0" />
                      <span>SSL secured payment &middot; 256-bit encryption</span>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 pb-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConfirmPayment}
                      disabled={processing || noFunds}
                      className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{
                        background: 'linear-gradient(135deg, #00b87a 0%, #00FFA3 100%)',
                        boxShadow: '0 0 22px rgba(0,255,163,0.3), 0 4px 16px rgba(0,0,0,0.35)',
                        color: '#0F111A',
                      }}
                    >
                      {processing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          Processing…
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 shrink-0" />
                          Confirm Payment · ${grandTotal.toLocaleString()}
                        </>
                      )}
                    </motion.button>
                    
                    {/* Error Display */}
                    {error && (
                      <div className="mt-3 p-3 rounded-lg bg-[#FF4D4D]/10 border border-[#FF4D4D]/20">
                        <p className="text-[#FF4D4D] text-sm text-center">{error}</p>
                      </div>
                    )}
                  </div>
                  </> /* end noFunds else fragment */
                  )} {/* end noFunds ternary */}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
