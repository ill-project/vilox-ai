import { motion } from "motion/react";
import { Link } from "react-router";
import {
  Brain, Zap, Shield, Cpu, BarChart2,
  Lock, ChevronRight, Activity, ArrowRight, CheckCircle2, RefreshCw,
} from "lucide-react";

// ── Static data ────────────────────────────────────────────────────────────

const SIGNALS = [
  {
    asset: "BTC", name: "Bitcoin", type: "CRYPTO",
    action: "STRONG BUY", conf: 94, risk: "Medium",
    price: "$68,240", change: "+2.1%", up: true,
    reason: "Bullish momentum detected. Decreasing on-chain sell pressure with institutional accumulation patterns.",
    color: { badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", bar: "bg-emerald-400" },
  },
  {
    asset: "NVDA", name: "Nvidia", type: "STOCK",
    action: "STRONG BUY", conf: 99, risk: "High",
    price: "$880", change: "+4.8%", up: true,
    reason: "Volume anomaly detected before earnings cycle. AI sector rotation showing strong inflow momentum.",
    color: { badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", bar: "bg-emerald-400" },
  },
  {
    asset: "ETH", name: "Ethereum", type: "CRYPTO",
    action: "BUY", conf: 82, risk: "Medium",
    price: "$3,820", change: "+1.4%", up: true,
    reason: "Layer-2 growth catalysts confirmed. Staking yield absorption reduces circulating supply.",
    color: { badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", bar: "bg-emerald-400" },
  },
  {
    asset: "TSLA", name: "Tesla", type: "STOCK",
    action: "HOLD", conf: 71, risk: "High",
    price: "$175", change: "-3.2%", up: false,
    reason: "Conflicting macro signals. Earnings revision uncertainty warrants patience before entry.",
    color: { badge: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", bar: "bg-yellow-400" },
  },
];

const STRATEGIES = [
  {
    name: "Quantum Momentum", tag: "Most Popular",
    winRate: "78.2%", avgReturn: "+14.5%", drawdown: "-8.2%",
    desc: "Leverages neural networks to detect micro-momentum shifts in high-liquidity assets.",
    accent: "from-[#4C6FFF]/20 to-[#7C3AED]/20", border: "border-[#4C6FFF]/30",
    locked: false,
  },
  {
    name: "Stable Accumulation", tag: "Best for Beginners",
    winRate: "85.4%", avgReturn: "+4.2%", drawdown: "-2.1%",
    desc: "Slow, calculated dollar-cost averaging into blue-chip assets during verified dips.",
    accent: "from-emerald-500/10 to-teal-500/10", border: "border-emerald-500/20",
    locked: false,
  },
  {
    name: "Sentiment Alpha", tag: "Elite Only",
    winRate: "71.5%", avgReturn: "+22.1%", drawdown: "-15.4%",
    desc: "Aggregates global news sentiment and social velocity to front-run emotional market swings.",
    accent: "from-[#FFD700]/10 to-orange-500/10", border: "border-[#FFD700]/20",
    locked: true,
  },
];

const FEATURES = [
  { icon: Brain, title: "Neural Signal Engine", desc: "Trained on 10+ years of market data across 200+ assets to detect patterns invisible to human traders." },
  { icon: Zap, title: "Sub-second Execution", desc: "AI signals are processed and ready to act within milliseconds of market data updates." },
  { icon: Shield, title: "Built-in Risk Guards", desc: "Automatic stop-loss, position sizing, and drawdown limits prevent catastrophic losses." },
  { icon: RefreshCw, title: "24/7 Market Scanning", desc: "Our AI never sleeps. It monitors crypto, stocks and ETFs across all global sessions simultaneously." },
  { icon: BarChart2, title: "Portfolio Intelligence", desc: "Real-time correlation analysis ensures your holdings are diversified and balanced at all times." },
  { icon: Cpu, title: "Adaptive Learning", desc: "Strategies self-calibrate weekly based on own trade history and current market regime." },
];

const STATS = [
  { value: "+18.4%", label: "Avg. Annual Return", sub: "vs 9.1% market avg" },
  { value: "78%", label: "Signal Win Rate", sub: "across all asset classes" },
  { value: "200+", label: "Assets Monitored", sub: "crypto, stocks & ETFs" },
  { value: "<80ms", label: "Signal Latency", sub: "near real-time analysis" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function Sparkline({ up }: { up: boolean }) {
  const points = up
    ? "0,18 10,14 20,16 30,10 40,12 50,6 60,8 70,3 80,5 90,1"
    : "0,1 10,4 20,3 30,7 40,6 50,10 60,8 70,14 80,12 90,18";
  return (
    <svg viewBox="0 0 90 20" className="w-20 h-5" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={up ? "#34d399" : "#f87171"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const cfg: Record<string, string> = {
    Low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    Medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    High: "text-red-400 bg-red-500/10 border-red-500/20",
  };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${cfg[risk] ?? cfg.Medium}`}>{risk}</span>;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function AITradingPage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#4C6FFF]/15 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-[#7C3AED]/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#111827] border border-[#4C6FFF]/30 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-[#9CA3AF]">AI Engine — Live &amp; Scanning Markets</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.08]"
          >
            Let AI Trade <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-[#4C6FFF] to-[#7C3AED] bg-clip-text text-transparent">Smarter Than You</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-lg md:text-xl text-[#9CA3AF] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Vilox AI analyses millions of data points per second — crypto, stocks, sentiment and macro — to generate real-time signals and automate your entire strategy.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/sign-in"
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#4C6FFF] to-[#7C3AED] text-white font-semibold shadow-[0_0_30px_rgba(76,111,255,0.35)] hover:shadow-[0_0_50px_rgba(76,111,255,0.55)] transition-all"
            >
              Start Trading Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/markets"
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              View Live Signals <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <section className="border-y border-[#1F2937]/60 bg-[#0B0F1A]/60 backdrop-blur-sm py-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <p className="text-3xl md:text-4xl font-bold text-white mb-1">{s.value}</p>
              <p className="text-sm font-medium text-white/70">{s.label}</p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">{s.sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Live Signal preview ────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111827] border border-[#4C6FFF]/30 mb-5 text-xs text-[#4C6FFF] font-semibold uppercase tracking-widest"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#4C6FFF] animate-pulse" /> Real-time AI Signals
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.06 }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              What the AI sees right now
            </motion.h2>
            <p className="text-[#9CA3AF] max-w-lg mx-auto">These signals are generated live from our neural network scanning global market data.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {SIGNALS.map((sig, i) => (
              <motion.div
                key={sig.asset}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 hover:border-[#4C6FFF]/30 transition-all group"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#0B0F1A] border border-[#1F2937] flex items-center justify-center font-bold text-lg text-white">
                      {sig.asset.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg leading-tight">{sig.asset}</p>
                      <p className="text-xs text-[#9CA3AF]">{sig.name} · {sig.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white text-lg">{sig.price}</p>
                    <p className={`text-sm font-semibold ${sig.up ? "text-emerald-400" : "text-red-400"}`}>{sig.change}</p>
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[#9CA3AF] uppercase tracking-widest">Confidence</span>
                    <span className="text-sm font-bold text-white">{sig.conf}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${sig.color.bar}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${sig.conf}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                    />
                  </div>
                </div>

                {/* Badges + sparkline */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-widest border ${sig.color.badge}`}>
                    {sig.action}
                  </span>
                  <RiskBadge risk={sig.risk} />
                  <span className="ml-auto"><Sparkline up={sig.up} /></span>
                </div>

                {/* Reason box */}
                <div className="bg-[#0B0F1A] border border-[#1F2937] rounded-xl p-3">
                  <p className="text-xs text-[#9CA3AF] leading-relaxed">
                    <span className="text-white font-semibold">AI Reasoning: </span>{sig.reason}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Blur overlay CTA */}
          <div className="relative mt-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 blur-sm pointer-events-none select-none opacity-40">
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 h-40" />
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 h-40" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-[#111827]/90 backdrop-blur-sm border border-[#4C6FFF]/30 rounded-2xl px-8 py-6 text-center shadow-[0_0_40px_rgba(76,111,255,0.15)]">
                <Lock className="w-7 h-7 text-[#4C6FFF] mx-auto mb-3" />
                <p className="font-bold text-white text-lg mb-1">+40 more signals available</p>
                <p className="text-[#9CA3AF] text-sm mb-4">Sign up free to unlock all real-time AI signals</p>
                <Link to="/sign-in" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#4C6FFF] text-white font-semibold text-sm hover:bg-[#3d5acc] transition-colors shadow-[0_0_20px_rgba(76,111,255,0.3)]">
                  Unlock All Signals <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Strategies ────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[#0B0F1A]/60 border-y border-[#1F2937]/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              Choose your AI Strategy
            </motion.h2>
            <p className="text-[#9CA3AF] max-w-lg mx-auto">Each strategy is backtested on 5+ years of data and self-optimises weekly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STRATEGIES.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl p-6 bg-gradient-to-br ${s.accent} border ${s.border} overflow-hidden hover:scale-[1.02] transition-transform`}
              >
                {s.locked && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[#FFD700]/10 border border-[#FFD700]/30 px-2.5 py-1 rounded-full">
                    <Lock className="w-3 h-3 text-[#FFD700]" />
                    <span className="text-[10px] font-bold text-[#FFD700] uppercase tracking-widest">Elite</span>
                  </div>
                )}
                <p className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">{s.tag}</p>
                <h3 className="text-xl font-bold text-white mb-2">{s.name}</h3>
                <p className="text-sm text-[#9CA3AF] mb-6 leading-relaxed">{s.desc}</p>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Win Rate", value: s.winRate, positive: true },
                    { label: "Avg Return", value: s.avgReturn, positive: true },
                    { label: "Max DD", value: s.drawdown, positive: false },
                  ].map(stat => (
                    <div key={stat.label} className="bg-black/20 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-[#9CA3AF] uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className={`text-sm font-bold ${stat.positive ? "text-emerald-400" : "text-red-400"}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                {!s.locked ? (
                  <Link to="/sign-in" className="mt-5 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors border border-white/10">
                    Use This Strategy <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link to="/pricing" className="mt-5 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#FFD700]/10 hover:bg-[#FFD700]/20 text-[#FFD700] text-sm font-semibold transition-colors border border-[#FFD700]/20">
                    Upgrade to Elite <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ─────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              Everything the AI does for you
            </motion.h2>
            <p className="text-[#9CA3AF] max-w-lg mx-auto">One engine that handles analysis, risk, execution and portfolio management.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 hover:border-[#4C6FFF]/30 transition-colors group"
              >
                <div className="w-11 h-11 rounded-xl bg-[#4C6FFF]/10 border border-[#4C6FFF]/20 flex items-center justify-center mb-5 group-hover:bg-[#4C6FFF]/20 transition-colors">
                  <f.icon className="w-5 h-5 text-[#4C6FFF]" />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-[#9CA3AF] text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How automation works ───────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[#0B0F1A]/60 border-y border-[#1F2937]/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              From data to trade in 3 steps
            </motion.h2>
          </div>

          <div className="space-y-6">
            {[
              { step: "01", title: "AI scans 200+ markets", desc: "Every second, our neural network processes price action, volume, on-chain data, news sentiment, and macro indicators across all tracked assets.", icon: Activity },
              { step: "02", title: "Signal generated with reasoning", desc: "When a high-confidence pattern is detected, a signal is created with a BUY / SELL / HOLD action, confidence score, and human-readable reasoning.", icon: Brain },
              { step: "03", title: "Execute with one tap — or fully auto", desc: "Review signals manually or enable AI Auto-Trade (Elite) to let the system execute trades within your pre-set risk parameters.", icon: Zap },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-6 bg-[#111827] border border-[#1F2937] rounded-2xl p-6 hover:border-[#4C6FFF]/30 transition-colors"
              >
                <div className="text-5xl font-black text-[#4C6FFF]/20 leading-none shrink-0 select-none">{s.step}</div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#4C6FFF]/10 border border-[#4C6FFF]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <s.icon className="w-5 h-5 text-[#4C6FFF]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg mb-1">{s.title}</h3>
                    <p className="text-[#9CA3AF] text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#4C6FFF]/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#111827] border border-[#4C6FFF]/25 rounded-3xl p-12 md:p-16 shadow-[0_0_80px_rgba(76,111,255,0.12)]"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4C6FFF] to-[#7C3AED] flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(76,111,255,0.4)]">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to let AI trade for you?</h2>
            <p className="text-[#9CA3AF] mb-8 text-lg max-w-xl mx-auto">
              Join thousands of traders already using Vilox AI to outperform the market — no financial expertise required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link
                to="/sign-in"
                className="flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#4C6FFF] to-[#7C3AED] text-white font-semibold shadow-[0_0_25px_rgba(76,111,255,0.35)] hover:shadow-[0_0_45px_rgba(76,111,255,0.55)] transition-all"
              >
                Create Free Account <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/pricing" className="flex items-center gap-2 px-8 py-4 rounded-full border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors">
                See Pricing <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#9CA3AF]">
              {["No credit card required", "Free plan available", "Cancel anytime"].map(t => (
                <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" />{t}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="text-center pb-8 px-6">
        <p className="text-xs text-[#9CA3AF]/50 max-w-2xl mx-auto">
          Disclaimer: AI trading signals do not guarantee profits. All investments carry risk. Past performance is not indicative of future results. Only invest what you can afford to lose.
        </p>
      </div>
    </>
  );
}
