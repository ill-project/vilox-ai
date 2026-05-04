import { Brain, Users, TrendingUp, Activity, Server, LineChart } from "lucide-react";

export function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto mb-20">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#4F7CFF] to-[#6C3BFF] rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(79,124,255,0.4)]">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">About Vilox AI</h1>
        <p className="text-xl text-[#9CA3AF] leading-relaxed">
          Vilox AI is a digital asset intelligence platform combining artificial intelligence with blockchain infrastructure to simplify modern investing.
        </p>
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
        <div className="bg-[#111827] border border-[#1F2937] rounded-3xl p-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#4F7CFF]/5 rounded-bl-full pointer-events-none group-hover:bg-[#4F7CFF]/10 transition-colors" />
          <h2 className="text-2xl font-bold mb-4 text-white">Our Mission</h2>
          <p className="text-[#9CA3AF] text-lg leading-relaxed">
            To build intelligent financial tools powered by data, making sophisticated AI-assisted investing accessible to everyone globally, regardless of their technical background.
          </p>
        </div>
        <div className="bg-[#111827] border border-[#1F2937] rounded-3xl p-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#6C3BFF]/5 rounded-bl-full pointer-events-none group-hover:bg-[#6C3BFF]/10 transition-colors" />
          <h2 className="text-2xl font-bold mb-4 text-white">Our Vision</h2>
          <p className="text-[#9CA3AF] text-lg leading-relaxed">
            To create a future where blockchain transparency and artificial intelligence converge to eliminate emotional trading errors and maximize portfolio efficiency.
          </p>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Our Technology</h2>
          <p className="text-[#9CA3AF]">The engine powering intelligent investments.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "AI Market Analysis", icon: Brain, desc: "Neural networks scanning millions of data points across global markets." },
            { title: "Blockchain Infrastructure", icon: Server, desc: "Decentralized, immutable transaction settlement and custody." },
            { title: "Risk Modeling Systems", icon: Activity, desc: "Advanced mathematical models to protect downside exposure." },
            { title: "Market Intelligence", icon: LineChart, desc: "Real-time aggregation of news sentiment and on-chain metrics." }
          ].map((tech, i) => (
            <div key={i} className="bg-[#0B0F1A] border border-[#1F2937] rounded-2xl p-6 text-center hover:border-[#4F7CFF]/30 transition-colors">
              <tech.icon className="w-8 h-8 text-[#4F7CFF] mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{tech.title}</h3>
              <p className="text-sm text-[#9CA3AF]">{tech.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Pipeline Diagram */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-3xl p-8 md:p-12 mb-24 text-center overflow-x-auto">
        <h2 className="text-2xl font-bold mb-10">The AI Intelligence Pipeline</h2>
        <div className="flex items-center justify-between min-w-[800px] max-w-4xl mx-auto px-4">
          {[
            { step: "Market Data", num: "01" },
            { step: "AI Analysis", num: "02" },
            { step: "Risk Engine", num: "03" },
            { step: "Signal Gen", num: "04" },
            { step: "User Dash", num: "05" }
          ].map((item, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-[#0B0F1A] border border-[#1F2937] flex items-center justify-center text-[#4F7CFF] font-mono font-bold shadow-lg mb-4 relative z-10">
                  {item.num}
                </div>
                <span className="text-sm font-medium whitespace-nowrap">{item.step}</span>
              </div>
              {i < 4 && (
                <div className="w-16 md:w-24 h-0.5 bg-[#1F2937] relative -translate-y-6">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-[#4F7CFF] rotate-45" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 border-t border-[#1F2937] pt-16">
        {[
          { label: "Active Users", value: "12,842+", icon: Users },
          { label: "Assets Tracked", value: "320+", icon: LineChart },
          { label: "AI Signals Generated", value: "1.2M+", icon: TrendingUp }
        ].map((stat, i) => (
          <div key={i} className="text-center">
            <stat.icon className="w-6 h-6 text-[#4F7CFF] mx-auto mb-4" />
            <h3 className="text-4xl font-bold text-white mb-2">{stat.value}</h3>
            <p className="text-[#9CA3AF] uppercase tracking-wider text-sm">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
