import { Link } from "react-router";
import { motion } from "motion/react";
import { 
  ArrowRight, Activity, Shield, Zap, TrendingUp, Lock, Brain, 
  Wallet, Cpu, MessageSquare, ChevronRight, BarChart3, Globe 
} from "lucide-react";
import { Card3D } from "../components/Card3D";

const TICKER_DATA = [
  { symbol: "BTC", price: "$68,240", change: "+2.1%", up: true },
  { symbol: "ETH", price: "$3,820", change: "+1.4%", up: true },
  { symbol: "GOOGL", price: "$172", change: "+0.8%", up: true },
  { symbol: "TSLA", price: "$198", change: "+1.2%", up: true },
  { symbol: "NVDA", price: "$850", change: "+3.5%", up: true },
  { symbol: "AAPL", price: "$165", change: "-0.4%", up: false },
];

const TRUST_INDICATORS = [
  { title: "AI Trading Engine", icon: Brain },
  { title: "Secure Blockchain", icon: Lock },
  { title: "Real Time Data", icon: Activity },
  { title: "Instant Withdrawals", icon: Zap },
  { title: "Risk Management", icon: Shield },
];

const STEPS = [
  { title: "Deposit crypto", desc: "Instantly fund your account with major cryptocurrencies.", icon: Wallet },
  { title: "AI analyzes markets", desc: "Our neural networks scan millions of data points 24/7.", icon: Cpu },
  { title: "AI assisted trading", desc: "Execute trades with precision and optimized timing.", icon: TrendingUp },
];

const MARKET_CARDS = [
  { name: "Google", symbol: "GOOGL", price: "$172.50", change: "+0.8%", signal: "BUY", signalColor: "text-[#00FFA3] bg-[#00FFA3]/10 border-[#00FFA3]/20" },
  { name: "Tesla", symbol: "TSLA", price: "$198.20", change: "+1.2%", signal: "HOLD", signalColor: "text-[#FBBF24] bg-[#FBBF24]/10 border-[#FBBF24]/20" },
  { name: "Nvidia", symbol: "NVDA", price: "$850.10", change: "+3.5%", signal: "STRONG BUY", signalColor: "text-[#00FFA3] bg-[#00FFA3]/10 border-[#00FFA3]/20" },
  { name: "Apple", symbol: "AAPL", price: "$165.00", change: "-0.4%", signal: "SELL", signalColor: "text-[#FF4D4D] bg-[#FF4D4D]/10 border-[#FF4D4D]/20" },
  { name: "Bitcoin", symbol: "BTC", price: "$68,240", change: "+2.1%", signal: "STRONG BUY", signalColor: "text-[#00FFA3] bg-[#00FFA3]/10 border-[#00FFA3]/20" },
  { name: "Ethereum", symbol: "ETH", price: "$3,820", change: "+1.4%", signal: "BUY", signalColor: "text-[#00FFA3] bg-[#00FFA3]/10 border-[#00FFA3]/20" },
];

export function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-20 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#4F7CFF]/20 rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-[#6C3BFF]/20 rounded-full blur-[100px] mix-blend-screen" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#111827] border border-[#1F2937] mb-8"
          >
            <SparkleIcon className="w-4 h-4 text-[#4F7CFF]" />
            <span className="text-sm text-[#9CA3AF]">Vilox AI 2.0 is now live</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight"
          >
            AI Powered Crypto & <br className="hidden md:block"/> Stock Investing
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-[#9CA3AF] mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Buy global shares using crypto and let Vilox AI help optimize your trading decisions using machine learning.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/get-started" className="w-full sm:w-auto bg-gradient-to-r from-[#4F7CFF] to-[#6C3BFF] text-white px-8 py-4 rounded-full font-medium shadow-[0_0_30px_rgba(79,124,255,0.3)] hover:shadow-[0_0_40px_rgba(79,124,255,0.5)] transition-all flex items-center justify-center gap-2">
              Start Investing <ArrowRight className="w-4 h-4" />
            </Link>
            <button className="w-full sm:w-auto bg-[#111827] border border-[#1F2937] text-white px-8 py-4 rounded-full font-medium hover:bg-[#1F2937] transition-colors flex items-center justify-center gap-2">
              View Demo
            </button>
          </motion.div>
        </div>
      </section>

      {/* Ticker Bar */}
      <div className="w-full border-y border-[#1F2937]/50 bg-[#0B0F1A]/50 backdrop-blur-sm overflow-hidden py-4 flex">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
          className="flex items-center gap-12 whitespace-nowrap px-6"
        >
          {[...TICKER_DATA, ...TICKER_DATA, ...TICKER_DATA].map((item, i) => (
            <div key={i} className="flex items-center gap-3 font-mono text-sm">
              <span className="text-white font-medium">{item.symbol}</span>
              <span className="text-[#9CA3AF]">{item.price}</span>
              <span className={item.up ? "text-[#00FFA3]" : "text-[#FF4D4D]"}>{item.change}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Trust Indicators */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          {TRUST_INDICATORS.map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-[#9CA3AF]">
              <item.icon className="w-5 h-5 text-[#4F7CFF]" />
              <span className="font-medium text-sm md:text-base">{item.title}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="ai-trading" className="py-24 px-6 bg-[#111827]/30 border-y border-[#1F2937]/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Smarter investing in 3 steps</h2>
            <p className="text-[#9CA3AF] max-w-xl mx-auto">Our streamlined process gets you trading with AI assistance in minutes.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={i} className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 relative overflow-hidden group hover:border-[#4F7CFF]/50 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#4F7CFF]/5 rounded-bl-full -z-10 group-hover:bg-[#4F7CFF]/10 transition-colors" />
                <div className="w-12 h-12 bg-[#0B0F1A] border border-[#1F2937] rounded-xl flex items-center justify-center mb-6 text-[#4F7CFF]">
                  <step.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-[#9CA3AF] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3D Market Options / Pricing Options */}
      <section id="markets" className="py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Explore 3D Market Opportunities</h2>
          <p className="text-[#9CA3AF] max-w-xl mx-auto mb-10">Interact with the cards below to see our dynamic 3D interface showcasing live market data and AI signals.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 perspective-[1000px]">
          {MARKET_CARDS.map((card, i) => (
            <Card3D key={i} className="h-[280px]">
              <div className="bg-[#111827]/80 backdrop-blur-xl border border-[#1F2937] rounded-2xl p-6 h-full flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                {/* Glow behind card */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="flex justify-between items-start z-10">
                  <div>
                    <h3 className="text-2xl font-bold mb-1">{card.symbol}</h3>
                    <p className="text-[#9CA3AF]">{card.name}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border ${card.signalColor}`}>
                    {card.signal}
                  </div>
                </div>

                <div className="z-10">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-3xl font-bold">{card.price}</span>
                    <span className={card.change.startsWith('+') ? "text-[#00FFA3]" : "text-[#FF4D4D]"}>
                      {card.change}
                    </span>
                  </div>
                  
                  {/* Decorative chart line */}
                  <div className="h-12 w-full mt-4 flex items-end gap-1 opacity-70">
                    {[40, 30, 50, 45, 70, 65, 80, 75, 90, 100].map((h, idx) => (
                      <div 
                        key={idx} 
                        className={`w-full rounded-t-sm ${card.change.startsWith('+') ? 'bg-[#00FFA3]/40' : 'bg-[#FF4D4D]/40'}`} 
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card3D>
          ))}
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-24 px-6 bg-[#0B0F1A] border-y border-[#1F2937]/50 relative overflow-hidden">
        <div className="absolute -left-40 top-1/2 -translate-y-1/2 w-96 h-96 bg-[#00FFA3]/10 rounded-full blur-[100px]" />
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 relative z-10">
          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Bank-grade security meets blockchain transparency.</h2>
            <p className="text-[#9CA3AF] mb-8 leading-relaxed text-lg">
              Your assets are protected by enterprise-level security protocols, ensuring total peace of mind while our AI provides trading insights.
            </p>
            <ul className="space-y-4">
              {[
                "256-bit AES encryption",
                "Cold storage for 95% of funds",
                "Multi-signature wallets",
                "AI-powered fraud detection",
                "SOC 2 Type II compliant"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#00FFA3]/10 flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5 text-[#00FFA3]" />
                  </div>
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1">
            <div className="relative">
              <div className="w-full aspect-square max-w-md mx-auto relative z-10 flex items-center justify-center">
                {/* Decorative Blockchain UI */}
                <div className="absolute inset-0 border border-[#1F2937] rounded-full animate-[spin_60s_linear_infinite]" />
                <div className="absolute inset-8 border border-[#1F2937] border-dashed rounded-full animate-[spin_40s_linear_infinite_reverse]" />
                <div className="absolute inset-16 bg-[#111827] rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(0,255,163,0.1)]">
                  <Lock className="w-16 h-16 text-[#00FFA3]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="about" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by early adopters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { name: "Sarah Jenkins", role: "Day Trader", text: "Vilox AI completely transformed how I analyze crypto trends. The signals are shockingly accurate." },
            { name: "Michael Chen", role: "Software Engineer", text: "The cleanest UI I've seen in the fintech space. Being able to buy global stocks with crypto is a game changer." },
            { name: "Elena Rostova", role: "Crypto Enthusiast", text: "Vilox AI helped simplify crypto investing for me. I don't trade without it now." }
          ].map((t, i) => (
            <div key={i} className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8">
              <div className="flex gap-1 text-[#FBBF24] mb-4">
                {[...Array(5)].map((_, j) => (
                  <svg key={j} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                ))}
              </div>
              <p className="text-[#9CA3AF] mb-6 line-clamp-4">"{t.text}"</p>
              <div className="flex items-center gap-4 mt-auto">
                <div className="w-10 h-10 rounded-full bg-[#1F2937] flex items-center justify-center text-sm font-bold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-medium text-sm">{t.name}</h4>
                  <span className="text-[#9CA3AF] text-xs">{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Call to action */}
      <section id="pricing" className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#4F7CFF]/10 to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative z-10 bg-[#111827] border border-[#4F7CFF]/30 rounded-3xl p-12 md:p-20 shadow-[0_0_100px_rgba(79,124,255,0.15)]">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Start investing smarter today.</h2>
          <p className="text-xl text-[#9CA3AF] mb-10 max-w-2xl mx-auto">Join thousands of users who are already leveraging AI to make better investment decisions.</p>
          <Link to="/get-started" className="inline-block bg-[#4F7CFF] hover:bg-[#4F7CFF]/90 text-white px-10 py-4 rounded-full font-medium text-lg shadow-[0_0_20px_rgba(79,124,255,0.4)] transition-all hover:shadow-[0_0_40px_rgba(79,124,255,0.6)]">
            Create Free Account
          </Link>
        </div>
      </section>

    </>
  );
}

function SparkleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor" />
    </svg>
  );
}
