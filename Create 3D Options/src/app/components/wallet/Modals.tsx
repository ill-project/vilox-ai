import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, AlertCircle, Shield, CheckCircle2, ChevronDown, Lock, Loader2, Send } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button, Card, Input, Select, Badge, cn } from './shared';
import { getAllDepositAddresses, addTransaction } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type AddressRow = {
  symbol: string;
  address: string;
  network: string | null;
  min_deposit: string | null;
  is_active: boolean | null;
};

/** Flexible match: normalise symbol/network by stripping separators, then match base + optional network hint */
function findAddr(rows: AddressRow[], base: string, networkHint: string | null): AddressRow | null {
  const b = base.toUpperCase();
  const h = networkHint?.toUpperCase() ?? null;
  const candidates = rows.filter(r => {
    const sym = (r.symbol ?? '').toUpperCase().replace(/[-_\s]/g, '');
    const net = (r.network ?? '').toUpperCase();
    if (!sym.startsWith(b)) return false;
    if (!h) return true;
    return sym.includes(h) || net.includes(h);
  });
  return candidates.find(r => r.is_active === true) ?? candidates[0] ?? null;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0B0F1A]/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md"
          >
            <Card className="p-0 overflow-hidden shadow-2xl shadow-[#4F7CFF]/10 border border-[#1F2937]/50 bg-gradient-to-b from-[#111827] to-[#0E1628] flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-[#1F2937] shrink-0">
                <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-[#9CA3AF] hover:text-white rounded-full hover:bg-[#1F2937] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {children}
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function DepositModal({ isOpen, onClose }: Omit<ModalProps, 'title' | 'children'>) {
  const { user } = useAuth();
  const [step, setStep] = useState<'select' | 'address' | 'done'>('select');
  const [asset, setAsset] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [allAddresses, setAllAddresses] = useState<AddressRow[]>([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<'waiting' | 'received' | 'confirmed'>('waiting');
  const txIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Map asset selector value → base symbol + optional network hint
  const ASSET_CONFIG: Record<string, { base: string; hint: string | null; label: string }> = {
    BTC:  { base: 'BTC',  hint: null,  label: 'Bitcoin Network' },
    ETH:  { base: 'ETH',  hint: null,  label: 'ERC-20 Network' },
    USDT: { base: 'USDT', hint: 'TRC', label: 'Tron Network' },
    USDC: { base: 'USDC', hint: 'TRC', label: 'Tron Network' },
    SOL:  { base: 'SOL',  hint: null,  label: 'Solana Network' },
  };

  useEffect(() => {
    if (!isOpen) {
      // Reset everything when modal closes
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      txIdRef.current = null;
      setStep('select');
      setAmount('');
      setCopied(false);
      setStatus('waiting');
      setAsset('BTC');
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirmDeposit = () => {
    setStep('address');
    setStatus('waiting');
    setCopied(false);
    setAddrLoading(true);

    getAllDepositAddresses()
      .then(rows => setAllAddresses(rows))
      .catch(() => setAllAddresses([]))
      .finally(() => setAddrLoading(false));

    // Insert pending deposit transaction so admin can see and confirm it
    if (user?.id) {
      addTransaction(user.id, {
        type: 'deposit',
        asset,
        amount: amount ? Number(amount) : 0,
        status: 'pending',
        notes: `Awaiting deposit${amount ? ` of ${amount} ${asset}` : ''}`,
      })
        .then(tx => {
          txIdRef.current = tx.id;
          const ch = supabase
            .channel(`deposit-tx-${tx.id}`)
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `id=eq.${tx.id}` },
              (payload) => {
                const newStatus = payload.new?.status as string;
                if (newStatus === 'completed') setStatus('confirmed');
                else if (newStatus === 'pending') setStatus('waiting');
              }
            )
            .subscribe();
          channelRef.current = ch;
        })
        .catch(() => { /* non-critical */ });
    }
  };

  const handleClose = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    onClose();
  };

  const cfg = ASSET_CONFIG[asset];
  const row = cfg ? findAddr(allAddresses, cfg.base, cfg.hint) : null;
  const displayAddress = row?.address ?? null;
  const displayNetwork = row?.network ?? cfg?.label ?? '';
  const displayMin = row?.min_deposit ?? `0.0001 ${asset}`;

  const handleCopy = () => {
    if (!displayAddress) return;
    navigator.clipboard.writeText(displayAddress).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Deposit Crypto">
      <AnimatePresence mode="wait">
        {step === 'select' ? (
          <motion.div
            key="select"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-1.5">Select Asset</label>
              <Select value={asset} onChange={(e) => setAsset(e.target.value)}>
                <option value="BTC">BTC – Bitcoin</option>
                <option value="ETH">ETH – Ethereum</option>
                <option value="USDT">USDT – Tether (TRC-20)</option>
                <option value="USDC">USDC – USD Coin (TRC-20)</option>
                <option value="SOL">SOL – Solana</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-1.5">Amount to Deposit</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-3"
                />
              </div>
            </div>

            <div className="bg-[#0B0F1A] rounded-[12px] p-4 border border-[#1F2937] space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">Asset</span>
                <span className="text-white font-medium">{asset}</span>
              </div>
              {amount && (
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Amount</span>
                  <span className="text-[#00FFA3] font-semibold">{amount} {asset}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#1F2937] pt-2 mt-1">
                <span className="text-[#9CA3AF]">Network</span>
                <span className="text-white font-medium">{ASSET_CONFIG[asset]?.label ?? asset}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
              <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200 leading-relaxed">
                Only send <strong className="text-amber-400">{asset}</strong> to the generated address. Sending other assets will result in permanent loss.
              </p>
            </div>

            <Button onClick={handleConfirmDeposit} className="w-full h-12 text-base shadow-[0_0_20px_rgba(79,124,255,0.15)] hover:shadow-[0_0_25px_rgba(79,124,255,0.25)]">
              Confirm Deposit
            </Button>
          </motion.div>
        ) : step === 'done' ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6 text-center py-4"
          >
            <div className="w-16 h-16 bg-[#00FFA3]/10 rounded-full flex items-center justify-center mx-auto border border-[#00FFA3]/20 shadow-[0_0_24px_rgba(0,255,163,0.15)]">
              <CheckCircle2 size={32} className="text-[#00FFA3]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Deposit Submitted!</h3>
              <p className="text-[#9CA3AF] text-sm leading-relaxed">
                Your deposit of <span className="text-white font-semibold">{amount ? `${amount} ` : ''}{asset}</span> has been submitted.<br />
                Our team will confirm it within <span className="text-[#00FFA3] font-semibold">1–24 hours</span>.
              </p>
            </div>
            <div className="bg-[#0B0F1A] rounded-xl p-4 border border-[#1F2937] text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">Asset</span>
                <span className="text-white font-medium">{asset}</span>
              </div>
              {amount && (
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Amount</span>
                  <span className="text-[#00FFA3] font-semibold">{amount} {asset}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">Status</span>
                <span className="text-yellow-400 font-medium animate-pulse">Pending Review</span>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full h-12 text-base bg-[#00FFA3]/10 border-[#00FFA3]/30 text-[#00FFA3] hover:bg-[#00FFA3]/20">
              Done
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="address"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {addrLoading ? (
              <div className="flex items-center justify-center gap-3 py-10">
                <Loader2 size={22} className="animate-spin text-[#4F7CFF]" />
                <span className="text-[#9CA3AF] text-sm">Loading address…</span>
              </div>
            ) : !displayAddress ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle size={18} className="text-red-400 shrink-0" />
                <p className="text-red-300 text-sm">Deposit address not available. Please contact support.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl">
                  <QRCodeSVG value={displayAddress} size={180} bgColor="#ffffff" fgColor="#000000" level="M" />
                  <p className="text-[#6B7280] text-xs mt-2 font-medium">Scan to deposit {asset}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9CA3AF] mb-1.5">Wallet Address</label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={displayAddress}
                      className="bg-[#0B0F1A] font-mono text-xs text-[#D1D5DB] select-all"
                    />
                    <Button
                      variant="secondary"
                      className={cn("px-3 shrink-0 transition-colors", copied && "border-[#00FFA3] text-[#00FFA3]")}
                      onClick={handleCopy}
                    >
                      {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    </Button>
                  </div>
                </div>

                <div className="bg-[#0B0F1A] rounded-[12px] p-4 border border-[#1F2937] space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#9CA3AF]">Network</span>
                    <span className="text-white font-medium">{displayNetwork}</span>
                  </div>
                  {amount && (
                    <div className="flex justify-between">
                      <span className="text-[#9CA3AF]">Expected Amount</span>
                      <span className="text-[#00FFA3] font-semibold">{amount} {asset}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#9CA3AF]">Minimum deposit</span>
                    <span className="text-white font-medium">{displayMin}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-[#1F2937]">
                    <span className="text-[#9CA3AF]">Status</span>
                    <Badge
                      variant={status === 'confirmed' ? 'success' : 'warning'}
                      className={cn(
                        'flex items-center gap-1.5 py-1 px-2.5',
                        status !== 'confirmed' && 'animate-pulse'
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', status === 'confirmed' ? 'bg-[#00FFA3]' : 'bg-yellow-500')} />
                      {status === 'confirmed' ? 'Confirmed ✓' : 'Waiting for deposit'}
                    </Badge>
                  </div>
                </div>

                {/* Step tracker */}
                <div className="bg-[#0B0F1A] rounded-[12px] p-4 border border-[#1F2937]">
                  <div className="flex items-center justify-between relative">
                    <div className="absolute top-4 left-8 right-8 h-0.5 bg-[#1F2937] z-0">
                      <motion.div
                        className="h-full bg-[#00FFA3]"
                        initial={{ width: '0%' }}
                        animate={{ width: status === 'confirmed' ? '100%' : '0%' }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-1.5">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500',
                        status === 'waiting'
                          ? 'border-[#4C6FFF] bg-[#4C6FFF]/20 text-[#4C6FFF]'
                          : 'border-[#00FFA3] bg-[#00FFA3] text-[#111827]'
                      )}>
                        {status === 'waiting' ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                      </div>
                      <span className={cn('text-xs font-medium', status === 'waiting' ? 'text-white' : 'text-[#9CA3AF]')}>Waiting</span>
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-1.5">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500',
                        status === 'confirmed'
                          ? 'border-[#00FFA3] bg-[#00FFA3] text-[#111827]'
                          : 'border-[#1F2937] bg-[#0B0F1A] text-[#9CA3AF]'
                      )}>
                        <Shield size={14} />
                      </div>
                      <span className={cn('text-xs font-medium', status === 'confirmed' ? 'text-white' : 'text-[#9CA3AF]')}>Confirmed</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                  <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200 leading-relaxed">
                    Only send <strong className="text-amber-400">{asset}</strong> on the <strong className="text-amber-400">{displayNetwork}</strong> network. Sending other assets will result in permanent loss.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep('select')} className="flex-1">← Back</Button>
                  <Button onClick={() => setStep('done')} className="flex-1 shadow-[0_0_20px_rgba(79,124,255,0.15)]">
                    <Send size={14} />I've Sent the Deposit
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

export function WithdrawModal({ isOpen, onClose }: Omit<ModalProps, 'title' | 'children'>) {
  const { user } = useAuth();
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form');
  const [asset, setAsset] = useState('USD');
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [wallet, setWallet] = useState<Record<string, number>>({});
  const [walletLoading, setWalletLoading] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpRefs] = useState(() => Array.from({ length: 6 }, () => React.createRef<HTMLInputElement>()));
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);

  const ASSETS = [
    { value: 'USD',  label: 'USD – US Dollar',      symbol: '$',   fee: '0.00',   feeLabel: '$0.00' },
    { value: 'BTC',  label: 'BTC – Bitcoin',         symbol: '',    fee: '0.0001', feeLabel: '0.0001 BTC' },
    { value: 'ETH',  label: 'ETH – Ethereum',        symbol: '',    fee: '0.001',  feeLabel: '0.001 ETH' },
    { value: 'SOL',  label: 'SOL – Solana',          symbol: '',    fee: '0.001',  feeLabel: '0.001 SOL' },
    { value: 'USDT', label: 'USDT – Tether (TRC-20)',symbol: '',    fee: '1',      feeLabel: '1 USDT' },
  ];

  const currentAsset = ASSETS.find(a => a.value === asset)!;
  const balance = wallet[asset.toLowerCase()] ?? 0;
  const fee = parseFloat(currentAsset.fee);
  const amountNum = parseFloat(amount) || 0;
  const youReceive = Math.max(0, amountNum - fee);
  // RPC deducts amount + 0.1% processing fee — guard against that total
  const overBalance = amountNum * 1.001 > balance;
  const canConfirm = amountNum > 0 && !overBalance && destination.trim().length > 0;

  // Load wallet on open
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    setWalletLoading(true);
    import('../../lib/db').then(({ getUserWallet }) =>
      getUserWallet(user.id).then(w => {
        if (w) setWallet({ usd: Number(w.usd ?? 0), btc: Number(w.btc ?? 0), eth: Number(w.eth ?? 0), sol: Number(w.sol ?? 0), usdt: Number(w.usdt ?? 0) });
      }).finally(() => setWalletLoading(false))
    );
  }, [isOpen, user?.id]);

  const reset = () => {
    setStep('form');
    setAmount('');
    setDestination('');
    setOtpCode(['', '', '', '', '', '']);
    setError(null);
    setTotpFactorId(null);
    onClose();
  };

  const sendOtp = async () => {
    setSendingOtp(true);
    setError(null);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.find(f => f.status === 'verified');
      if (!verified) {
        throw new Error('Google Authenticator not set up. Please enable it in Settings → Security first.');
      }
      setTotpFactorId(verified.id);
      setStep('otp');
    } catch (e: unknown) {
      setError((e as Error).message || 'Could not proceed. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpInput = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otpCode];
    next[i] = val;
    setOtpCode(next);
    if (val && i < 5) otpRefs[i + 1].current?.focus();
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[i] && i > 0) otpRefs[i - 1].current?.focus();
  };

  const handleVerify = async () => {
    if (!totpFactorId) return;
    const token = otpCode.join('');
    if (token.length < 6) { setError('Enter all 6 digits'); return; }
    setVerifying(true);
    setError(null);
    try {
      const { error: mfaErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: totpFactorId,
        code: token,
      });
      if (mfaErr) throw new Error('Invalid or expired code. Please try again.');

      // Execute withdrawal via RPC — deducts balance + creates pending transaction
      const { processWithdrawal } = await import('../../services/tradingService');
      const result = await processWithdrawal(asset, amountNum);
      if (!result.success) throw new Error(result.error || 'Withdrawal failed. Please try again.');

      setStep('done');
    } catch (e: unknown) {
      setError((e as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={reset} title="Withdraw Funds">
      <AnimatePresence mode="wait">
        {step === 'form' ? (
          <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            {/* Asset */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-1.5">Select Asset</label>
              <Select value={asset} onChange={(e) => { setAsset(e.target.value); setAmount(''); setError(null); }}>
                {ASSETS.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </Select>
            </div>

            {/* Balance */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-[#6B7280]">Available balance</span>
              {walletLoading
                ? <span className="text-xs text-[#6B7280] animate-pulse">Loading…</span>
                : <span className="text-xs font-semibold text-white">
                    {asset === 'USD' ? `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${balance.toFixed(6)} ${asset}`}
                  </span>
              }
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-1.5">Amount to Withdraw</label>
              <div className="relative">
                {asset === 'USD' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">$</span>}
                <Input
                  type="number"
                  className={cn(asset === 'USD' ? 'pl-8' : 'pl-3', 'pr-16', overBalance && 'border-red-500 focus:border-red-500')}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(null); }}
                />
                <button
                  onClick={() => {
                    // Fill max amount that stays within balance after 0.1% RPC fee
                    const maxAmt = balance / 1.001;
                    const decimals = asset === 'USD' ? 2 : 6;
                    setAmount(String(Math.floor(maxAmt * 10 ** decimals) / 10 ** decimals));
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#4F7CFF] bg-[#4F7CFF]/10 px-2 py-0.5 rounded border border-[#4F7CFF]/20 hover:bg-[#4F7CFF]/20 transition-colors"
                >MAX</button>
              </div>
              {overBalance && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} /> Amount exceeds your balance
                </p>
              )}
            </div>

            {/* Destination */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-1.5">
                {asset === 'USD' ? 'Bank Account / Payment Details' : `${asset} Wallet Address`}
              </label>
              <Input
                placeholder={asset === 'USD' ? 'e.g. Bank name, account number' : `Enter your ${asset} address`}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>

            {/* Summary */}
            <div className="bg-[#0B0F1A] rounded-[12px] p-4 border border-[#1F2937] space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">Network Fee</span>
                <span className="text-white">{currentAsset.feeLabel}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-[#1F2937] pt-2 mt-1">
                <span className="text-[#9CA3AF]">You receive</span>
                <span className="text-[#00FFA3]">
                  {asset === 'USD' ? `$${youReceive.toFixed(2)}` : `${youReceive > 0 ? youReceive.toFixed(6) : '0.000000'} ${asset}`}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
              <AlertCircle size={15} className="text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-500/90 leading-relaxed">
                Withdrawals may take 1–24 hours to process. Your Google Authenticator code will be required to confirm.
              </p>
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <Button
              onClick={sendOtp}
              disabled={!canConfirm || sendingOtp}
              className="w-full h-12 text-base shadow-[0_0_20px_rgba(79,124,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingOtp ? <><Loader2 size={16} className="animate-spin" /> Checking…</> : 'Continue'}
            </Button>
          </motion.div>

        ) : step === 'otp' ? (
          <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6 text-center">
            <div className="w-16 h-16 bg-[#4C6FFF]/10 rounded-full flex items-center justify-center mx-auto border border-[#4C6FFF]/20 shadow-[0_0_20px_rgba(76,111,255,0.2)]">
              <Shield size={32} className="text-[#4C6FFF]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Google Authenticator</h3>
              <p className="text-[#9CA3AF] text-sm">
                Open Google Authenticator and enter<br />
                <span className="text-white font-semibold">the current 6-digit code</span>
              </p>
            </div>

            {/* OTP inputs */}
            <div className="flex justify-center gap-2">
              {otpCode.map((digit, i) => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpInput(i, e.target.value)}
                  onKeyDown={e => handleOtpKey(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-[#0B0F1A] border border-[#1F2937] text-white focus:border-[#4C6FFF] focus:ring-1 focus:ring-[#4C6FFF] outline-none transition-all"
                  placeholder="—"
                />
              ))}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <p className="text-xs text-[#6B7280]">Code refreshes every 30 seconds in the app.</p>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => { setStep('form'); setError(null); setOtpCode(['','','','','','']); }} className="flex-1">Back</Button>
              <Button
                onClick={handleVerify}
                disabled={verifying || otpCode.join('').length < 6}
                className="flex-1 shadow-[0_0_20px_rgba(76,111,255,0.2)] disabled:opacity-50"
              >
                {verifying ? <><Loader2 size={14} className="animate-spin" /> Verifying…</> : 'Verify & Submit'}
              </Button>
            </div>
          </motion.div>

        ) : (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-6 text-center py-4">
            <div className="w-16 h-16 bg-[#00FFA3]/10 rounded-full flex items-center justify-center mx-auto border border-[#00FFA3]/20 shadow-[0_0_24px_rgba(0,255,163,0.15)]">
              <CheckCircle2 size={32} className="text-[#00FFA3]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Withdrawal Submitted!</h3>
              <p className="text-[#9CA3AF] text-sm leading-relaxed">
                Your withdrawal of <span className="text-white font-semibold">{asset === 'USD' ? `$${amountNum.toFixed(2)}` : `${amountNum} ${asset}`}</span> is being processed.<br />
                You'll receive it within <span className="text-[#00FFA3] font-semibold">1–24 hours</span>.
              </p>
            </div>
            <div className="bg-[#0B0F1A] rounded-xl p-4 border border-[#1F2937] text-sm space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">Asset</span>
                <span className="text-white font-medium">{asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">Amount</span>
                <span className="text-white font-medium">{asset === 'USD' ? `$${amountNum.toFixed(2)}` : `${amountNum} ${asset}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">You receive</span>
                <span className="text-[#00FFA3] font-semibold">{asset === 'USD' ? `$${youReceive.toFixed(2)}` : `${youReceive.toFixed(6)} ${asset}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">Destination</span>
                <span className="text-white font-medium truncate max-w-[160px]">{destination}</span>
              </div>
              <div className="flex justify-between border-t border-[#1F2937] pt-2 mt-1">
                <span className="text-[#9CA3AF]">Status</span>
                <span className="text-yellow-400 font-medium animate-pulse">Pending Review</span>
              </div>
            </div>
            <Button onClick={reset} className="w-full h-12 text-base bg-[#00FFA3]/10 border-[#00FFA3]/30 text-[#00FFA3] hover:bg-[#00FFA3]/20">
              Done
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

// ─── Transfer Modal ───────────────────────────────────────────────────────────
export function TransferModal({ isOpen, onClose }: Omit<ModalProps, 'title' | 'children'>) {
  const { user } = useAuth();
  const [fromAsset, setFromAsset] = useState('BTC');
  const [toAsset, setToAsset] = useState('USD');
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState<Record<string, number>>({});
  const [walletLoading, setWalletLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ASSETS = ['USD', 'BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'XRP', 'BNB', 'ADA', 'AVAX', 'DOGE'];

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    setWalletLoading(true);
    import('../../lib/db').then(({ getUserWallet }) =>
      getUserWallet(user.id).then(w => {
        if (w) {
          const mapped: Record<string, number> = {};
          for (const key of Object.keys(w)) {
            mapped[key] = Number((w as Record<string, unknown>)[key] ?? 0);
          }
          setWallet(mapped);
        }
      }).finally(() => setWalletLoading(false))
    );
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (!isOpen) {
      setFromAsset('BTC'); setToAsset('USD'); setAmount('');
      setDone(false); setError(null);
    }
  }, [isOpen]);

  const fromBalance = wallet[fromAsset.toLowerCase()] ?? 0;
  const amountNum = parseFloat(amount) || 0;
  const overBalance = amountNum > fromBalance;
  const canConvert = amountNum > 0 && !overBalance && fromAsset !== toAsset;

  const handleTransfer = async () => {
    if (!user?.id || !canConvert) return;
    setBusy(true);
    setError(null);
    try {
      const { transferBetweenAssets } = await import('../../lib/db');
      await transferBetweenAssets(user.id, fromAsset.toLowerCase(), toAsset.toLowerCase(), amountNum);
      setDone(true);
    } catch (e: unknown) {
      setError((e as Error).message || 'Transfer failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Funds">
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <p className="text-sm text-[#9CA3AF]">Move funds between your wallet assets instantly.</p>

            {/* From */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-1.5">From</label>
              <Select value={fromAsset} onChange={e => { setFromAsset(e.target.value); setError(null); }}>
                {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
              </Select>
              <div className="flex justify-between mt-1.5 px-1">
                <span className="text-xs text-[#6B7280]">Balance</span>
                {walletLoading
                  ? <span className="text-xs text-[#6B7280] animate-pulse">Loading…</span>
                  : <span className="text-xs font-semibold text-white">{fromBalance.toLocaleString(undefined, { maximumFractionDigits: 8 })} {fromAsset}</span>
                }
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-1.5">Amount</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setError(null); }}
                  className={cn('pr-16', overBalance && 'border-red-500')}
                />
                <button
                  onClick={() => setAmount(String(fromBalance))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#4F7CFF] bg-[#4F7CFF]/10 px-2 py-0.5 rounded border border-[#4F7CFF]/20 hover:bg-[#4F7CFF]/20 transition-colors"
                >MAX</button>
              </div>
              {overBalance && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />Exceeds available balance</p>}
            </div>

            {/* To */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-1.5">To</label>
              <Select value={toAsset} onChange={e => { setToAsset(e.target.value); setError(null); }}>
                {ASSETS.filter(a => a !== fromAsset).map(a => <option key={a} value={a}>{a}</option>)}
              </Select>
            </div>

            {fromAsset === toAsset && (
              <p className="text-amber-400 text-xs flex items-center gap-1"><AlertCircle size={11} />From and To assets must be different.</p>
            )}

            {/* Summary */}
            {canConvert && (
              <div className="bg-[#0B0F1A] rounded-xl p-4 border border-[#1F2937] space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">You send</span>
                  <span className="text-white font-medium">{amountNum} {fromAsset}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Receives to</span>
                  <span className="text-[#00FFA3] font-semibold">{toAsset} wallet</span>
                </div>
                <div className="flex justify-between border-t border-[#1F2937] pt-2 mt-1">
                  <span className="text-[#9CA3AF]">Fee</span>
                  <span className="text-white">None</span>
                </div>
              </div>
            )}

            {error && <p className="text-red-400 text-sm flex items-center gap-1"><AlertCircle size={13} />{error}</p>}

            <Button onClick={handleTransfer} disabled={!canConvert || busy} className="w-full h-12 text-base disabled:opacity-50">
              {busy ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : 'Transfer Now'}
            </Button>
          </motion.div>
        ) : (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center py-4">
            <div className="w-16 h-16 bg-[#00FFA3]/10 rounded-full flex items-center justify-center mx-auto border border-[#00FFA3]/20 shadow-[0_0_24px_rgba(0,255,163,0.15)]">
              <CheckCircle2 size={32} className="text-[#00FFA3]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Transfer Complete!</h3>
              <p className="text-[#9CA3AF] text-sm">
                <span className="text-white font-semibold">{amountNum} {fromAsset}</span> has been moved to your <span className="text-[#00FFA3] font-semibold">{toAsset}</span> wallet.
              </p>
            </div>
            <Button onClick={onClose} className="w-full h-12 bg-[#00FFA3]/10 border-[#00FFA3]/30 text-[#00FFA3] hover:bg-[#00FFA3]/20">
              Done
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
