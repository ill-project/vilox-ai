import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { Brain, Mail, Lock, Eye, EyeOff, ShieldCheck, CheckCircle, Gift } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { signUp } from "../lib/auth";

function TiltCard({ children }: { children: React.ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateY,
        rotateX,
        transformStyle: "preserve-3d",
      }}
      className="relative w-full max-w-md mx-auto"
    >
      <div 
        style={{ transform: "translateZ(30px)" }} 
        className="w-full bg-[#111827]/90 backdrop-blur-xl border border-[#1F2937] p-8 rounded-3xl shadow-[0_0_50px_rgba(79,124,255,0.1)] relative"
      >
        {children}
      </div>
    </motion.div>
  );
}

export function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [refCode, setRefCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // Pre-fill referral code from URL: /sign-up?ref=VLXABC123
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (ref) setRefCode(ref.toUpperCase());
  }, [location.search]);

  const isEmailValid = email.length > 0 && email.includes("@");
  const isPasswordValid = password.length > 7;
  const isConfirmValid = confirmPassword.length > 0 && confirmPassword === password;

  const getPasswordStrength = () => {
    let score = 0;
    if (password.length > 7) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getPasswordStrength();
  const getStrengthColor = () => {
    if (strength === 0) return "bg-[#1F2937]";
    if (strength === 1) return "bg-red-500";
    if (strength === 2) return "bg-yellow-500";
    if (strength >= 3) return "bg-[#00FFA3]";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid || !isPasswordValid || !isConfirmValid) return;
    setError("");
    setIsLoading(true);
    try {
      const result = await signUp(email, password, undefined, refCode.trim() || undefined);
      // Supabase returns a session when email confirmation is disabled,
      // or a user-without-session when confirmation is required.
      if (result.session) {
        navigate("/app/dashboard");
      } else {
        // Email confirmation required — tell the user to check inbox
        setEmailSent(true);
      }
    } catch (err: any) {
      const msg: string = (err.message ?? '').toLowerCase();
      if (msg.includes('rate limit') || msg.includes('email rate') || msg.includes('over_email_send_rate_limit') || msg.includes('for security purposes')) {
        setError('RATE_LIMIT');
      } else if (msg.includes('already registered') || msg.includes('user already')) {
        setError('An account with this email already exists. Try signing in instead.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-stretch">
      {/* Left Side */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 relative overflow-hidden bg-[#0B0F1A]">
        {/* Background Gradients */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#4F7CFF]/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#6C3BFF]/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-xl relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4F7CFF] to-[#6C3BFF] flex items-center justify-center shadow-lg shadow-[#4F7CFF]/20">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold tracking-tight text-white">Vilox <span className="text-[#4F7CFF]">AI</span></span>
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            Start investing with <br /> Vilox AI
          </h1>
          
          <p className="text-xl text-[#9CA3AF] mb-12">
            Create your account and start using powerful AI trading insights to grow your portfolio today.
          </p>

          {/* Abstract Illustration Elements */}
          <div className="relative w-full max-w-md h-64 border border-[#1F2937] rounded-3xl bg-[#111827]/50 backdrop-blur-sm overflow-hidden flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00FFA3]/5 to-transparent" />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="absolute w-[150%] h-[150%] opacity-20"
              style={{
                background: "conic-gradient(from 0deg, transparent, #00FFA3, transparent 30%, #4F7CFF 50%, transparent 60%)"
              }}
            />
            <div className="relative z-10 w-full h-full bg-[#0B0F1A] rounded-2xl border border-[#1F2937] flex items-center justify-center p-8">
              <div className="flex gap-4 w-full h-full items-end justify-center opacity-70">
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: ["30%", "100%", "30%"] }}
                    transition={{
                      duration: 1.5 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 1.5,
                    }}
                    className="w-8 bg-gradient-to-t from-[#4F7CFF] to-[#00FFA3] rounded-t-sm opacity-60"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 perspective-[1000px] bg-[#0B0F1A]">
        {emailSent ? (
          <div className="w-full max-w-md mx-auto bg-[#111827]/90 border border-[#1F2937] p-10 rounded-3xl text-center">
            <div className="w-16 h-16 rounded-full bg-[#00FFA3]/10 border border-[#00FFA3]/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-[#00FFA3]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Confirm your email</h2>
            <p className="text-[#9CA3AF] mb-2">
              We sent a confirmation link to <span className="text-white font-medium">{email}</span>.
            </p>
            <p className="text-[#9CA3AF] mb-6 text-sm">
              Click the link in that email, then come back and sign in. <br />
              <span className="text-[#6B7280]">Don't see it? Check your spam / junk folder.</span>
            </p>
            <Link
              to="/sign-in"
              className="inline-block bg-gradient-to-r from-[#4F7CFF] to-[#6C3BFF] text-white font-medium py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(79,124,255,0.3)] hover:shadow-[0_0_30px_rgba(79,124,255,0.5)] transition-all"
            >
              Go to Sign In
            </Link>
            <p className="mt-4 text-xs text-[#6B7280]">
              Already confirmed?{' '}
              <Link to="/sign-in" className="text-[#4F7CFF] hover:underline">Sign in now</Link>
            </p>
          </div>
        ) : (
        <TiltCard>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-[#9CA3AF]">Join Vilox AI today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-[#D1D5DB] ml-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#9CA3AF]" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-[#0B0F1A] border ${email.length > 0 ? (isEmailValid ? 'border-[#00FFA3]/50' : 'border-red-500/50') : 'border-[#1F2937]'} rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all`}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[#D1D5DB] ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#9CA3AF]" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-[#0B0F1A] border ${password.length > 0 ? (isPasswordValid ? 'border-[#00FFA3]/50' : 'border-red-500/50') : 'border-[#1F2937]'} rounded-xl py-3 pl-11 pr-12 text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#9CA3AF] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="flex items-center gap-1 mt-2 px-1">
                  {[...Array(4)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1 w-full rounded-full transition-colors ${i < strength ? getStrengthColor() : 'bg-[#1F2937]'}`} 
                    />
                  ))}
                  <span className="text-xs text-[#9CA3AF] ml-2 w-16 text-right">
                    {strength === 0 ? "Weak" : strength === 1 ? "Fair" : strength === 2 ? "Good" : "Strong"}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[#D1D5DB] ml-1">Referral Code <span className="text-white/30 font-normal">(optional — get $25 bonus)</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Gift className="h-5 w-5 text-[#9CA3AF]" />
                </div>
                <input
                  type="text"
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#0B0F1A] border border-[#1F2937] rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all font-mono tracking-widest"
                  placeholder="VLXABC123"
                  maxLength={12}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[#D1D5DB] ml-1">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#9CA3AF]" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full bg-[#0B0F1A] border ${confirmPassword.length > 0 ? (isConfirmValid ? 'border-[#00FFA3]/50' : 'border-red-500/50') : 'border-[#1F2937]'} rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all`}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-start gap-3 py-2">
              <label className="flex items-center gap-2 cursor-pointer group mt-1">
                <div className="w-5 h-5 rounded border border-[#1F2937] bg-[#0B0F1A] flex items-center justify-center group-hover:border-[#4F7CFF] transition-colors flex-shrink-0">
                  <input type="checkbox" required className="hidden" />
                  <div className="w-3 h-3 rounded-sm bg-[#4F7CFF] opacity-0 group-hover:opacity-50 transition-opacity" />
                </div>
              </label>
              <span className="text-xs text-[#9CA3AF] leading-relaxed">
                I agree to the <Link to="#" className="text-[#4F7CFF] hover:text-[#6C3BFF] transition-colors">Terms of Service</Link> and <Link to="#" className="text-[#4F7CFF] hover:text-[#6C3BFF] transition-colors">Privacy Policy</Link>.
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#4F7CFF] to-[#6C3BFF] hover:from-[#4F7CFF]/90 hover:to-[#6C3BFF]/90 text-white font-medium py-3 rounded-xl shadow-[0_0_20px_rgba(79,124,255,0.3)] hover:shadow-[0_0_30px_rgba(79,124,255,0.5)] transition-all transform active:scale-[0.98] mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account…' : 'Create Account'}
            </button>

            {error === 'RATE_LIMIT' ? (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-300 text-center space-y-2">
                <p className="font-semibold">Email rate limit reached</p>
                <p className="text-yellow-400/80 text-xs leading-relaxed">
                  Supabase's free tier only sends 2 confirmation emails per hour.
                  To fix this permanently, go to your{' '}
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-yellow-300 hover:text-white"
                  >
                    Supabase Dashboard
                  </a>
                  {' '}→ Authentication → Email → turn OFF "Confirm email", then try again.
                </p>
              </div>
            ) : error ? (
              <p className="text-sm text-red-400 text-center pt-1">{error}</p>
            ) : null}
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-[#9CA3AF]">Already have an account? </span>
            <Link to="/sign-in" className="text-[#4F7CFF] hover:text-[#6C3BFF] font-medium transition-colors">
              Sign in
            </Link>
          </div>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#1F2937]" />
            <span className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">OR continue with</span>
            <div className="h-px flex-1 bg-[#1F2937]" />
          </div>

          <button
            type="button"
            className="w-full bg-[#0B0F1A] border border-[#1F2937] hover:border-[#4F7CFF]/50 hover:bg-[#111827] text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-3 group"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-[#D1D5DB] group-hover:text-white transition-colors">Sign up with Google</span>
          </button>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#6B7280]">
            <ShieldCheck className="w-4 h-4 text-[#00FFA3]" />
            <span>Protected by secure authentication</span>
          </div>
        </TiltCard>
        )}
      </div>
    </div>
  );
}
