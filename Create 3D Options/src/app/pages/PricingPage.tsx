import { Check, Info } from "lucide-react";
import { Link } from "react-router";

export function PricingPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple transparent pricing.</h1>
        <p className="text-[#9CA3AF] text-lg">Choose the right tier for your trading journey. No hidden fees.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 max-w-6xl mx-auto">
        {/* Starter */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-3xl p-8 flex flex-col hover:border-[#4F7CFF]/30 transition-colors">
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-2">Starter</h3>
            <p className="text-[#9CA3AF] text-sm">Perfect for beginners.</p>
          </div>
          <div className="mb-8">
            <span className="text-5xl font-bold">$0</span>
            <span className="text-[#9CA3AF]">/month</span>
          </div>
          <ul className="space-y-4 mb-10 flex-1">
            {["Basic manual trading", "Access to 50+ assets", "Basic AI signals (Delayed)", "Standard support", "Free crypto deposits"].map((feat, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#00FFA3]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-[#00FFA3]" />
                </div>
                <span className="text-sm text-[#E5E7EB]">{feat}</span>
              </li>
            ))}
          </ul>
          <Link to="/get-started" className="block w-full py-3 px-6 text-center rounded-full bg-[#1F2937] hover:bg-[#374151] text-white font-medium transition-colors">
            Get Started Free
          </Link>
        </div>

        {/* Pro AI */}
        <div className="bg-[#111827] border border-[#4F7CFF] rounded-3xl p-8 flex flex-col relative shadow-[0_0_30px_rgba(79,124,255,0.15)] transform md:-translate-y-4">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#4F7CFF] text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
            Most Popular
          </div>
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-2">Pro AI</h3>
            <p className="text-[#9CA3AF] text-sm">Advanced tools for active traders.</p>
          </div>
          <div className="mb-8">
            <span className="text-5xl font-bold">$500</span>
            <span className="text-[#9CA3AF]">/month</span>
          </div>
          <ul className="space-y-4 mb-10 flex-1">
            {["Advanced AI insights", "Real-time market data", "Risk analysis metrics", "Priority trade execution", "Lower trading fees", "24/7 Priority support"].map((feat, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#4F7CFF]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-[#4F7CFF]" />
                </div>
                <span className="text-sm text-[#E5E7EB]">{feat}</span>
              </li>
            ))}
          </ul>
          <Link to="/get-started" className="block w-full py-3 px-6 text-center rounded-full bg-[#4F7CFF] hover:bg-[#4F7CFF]/90 text-white font-medium shadow-[0_0_20px_rgba(79,124,255,0.4)] transition-all">
            Upgrade to Pro
          </Link>
        </div>

        {/* Elite */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-3xl p-8 flex flex-col hover:border-[#6C3BFF]/30 transition-colors">
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-2">Elite AI</h3>
            <p className="text-[#9CA3AF] text-sm">Institutional grade tools.</p>
          </div>
          <div className="mb-8">
            <span className="text-5xl font-bold">$2000</span>
            <span className="text-[#9CA3AF]">/month</span>
          </div>
          <ul className="space-y-4 mb-10 flex-1">
            {["Full AI optimization", "Advanced portfolio analytics", "API access for automation", "Dedicated success manager", "Zero withdrawal fees", "Early access to new features"].map((feat, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#6C3BFF]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-[#6C3BFF]" />
                </div>
                <span className="text-sm text-[#E5E7EB]">{feat}</span>
              </li>
            ))}
          </ul>
          <Link to="/get-started" className="block w-full py-3 px-6 text-center rounded-full bg-[#1F2937] hover:bg-[#374151] text-white font-medium transition-colors">
            Contact Sales
          </Link>
        </div>
      </div>

      {/* Trading Fees */}
      <div className="max-w-4xl mx-auto bg-[#0B0F1A] border border-[#1F2937] rounded-3xl p-8 md:p-12 text-center">
        <h2 className="text-2xl font-bold mb-8">Platform Fees</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-[#1F2937]">
          <div className="pt-4 md:pt-0">
            <p className="text-[#9CA3AF] mb-2">Trading Fee</p>
            <p className="text-3xl font-bold text-white">0.5%</p>
            <p className="text-xs text-[#9CA3AF] mt-2">per transaction</p>
          </div>
          <div className="pt-8 md:pt-0">
            <p className="text-[#9CA3AF] mb-2">Crypto Deposits</p>
            <p className="text-3xl font-bold text-[#00FFA3]">Free</p>
            <p className="text-xs text-[#9CA3AF] mt-2">0 network fees on our end</p>
          </div>
          <div className="pt-8 md:pt-0">
            <p className="text-[#9CA3AF] mb-2">Withdrawal Fee</p>
            <p className="text-3xl font-bold text-white">1%</p>
            <p className="text-xs text-[#9CA3AF] mt-2">plus network gas fees</p>
          </div>
        </div>
      </div>
    </div>
  );
}
