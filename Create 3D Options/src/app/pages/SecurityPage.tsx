import { Shield, Lock, Server, Cpu, Key, Eye, ExternalLink, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

export function SecurityPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl font-bold mb-4">Trust Center</h1>
        <p className="text-[#9CA3AF] text-lg">Institutional-grade security and blockchain transparency. Your assets are protected by multiple layers of encryption and AI-powered monitoring.</p>
      </div>

      {/* System Status Panel */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 md:p-8 mb-16 flex flex-col md:flex-row justify-around items-center gap-6 shadow-xl">
        {[
          { label: "System Status", value: "Operational", color: "text-[#00FFA3]", pulse: false },
          { label: "AI Fraud Monitoring", value: "Active", color: "text-[#00FFA3]", pulse: true },
          { label: "Blockchain Connectivity", value: "Stable", color: "text-[#00FFA3]", pulse: false }
        ].map((stat, i) => (
          <div key={i} className="flex flex-col items-center">
            <span className="text-sm text-[#9CA3AF] mb-2">{stat.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">{stat.value}</span>
              <span className={`w-2 h-2 rounded-full bg-[#00FFA3] ${stat.pulse ? 'animate-pulse' : ''}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Architecture Diagram Idea */}
      <div className="mb-20">
        <h2 className="text-2xl font-bold mb-8 text-center">Security Architecture</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          {[
            { title: "User Device", icon: Lock, desc: "2FA & Device Fingerprinting" },
            { title: "Vilox Platform", icon: Cpu, desc: "AI Anomaly Detection" },
            { title: "Blockchain Network", icon: Server, desc: "Decentralized Settlement" },
            { title: "Custody Wallet", icon: Shield, desc: "Multi-sig Cold Storage" }
          ].map((node, i) => (
            <div key={i} className="flex flex-col md:flex-row items-center gap-4 md:gap-8 w-full md:w-auto">
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 w-full md:w-48 text-center shadow-lg relative group hover:border-[#4F7CFF]/50 transition-colors">
                <div className="w-12 h-12 bg-[#0B0F1A] rounded-xl flex items-center justify-center mx-auto mb-4 border border-[#1F2937] text-[#4F7CFF]">
                  <node.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-1">{node.title}</h3>
                <p className="text-xs text-[#9CA3AF]">{node.desc}</p>
              </div>
              {i < 3 && (
                <div className="hidden md:flex h-0.5 w-8 bg-[#1F2937] relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-[#1F2937] rotate-45" />
                </div>
              )}
              {i < 3 && (
                <div className="md:hidden w-0.5 h-8 bg-[#1F2937] my-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Security Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
        {[
          { title: "Cold Wallet Storage", desc: "95% of digital assets are stored offline in air-gapped, geographically distributed cold storage facilities.", icon: Key },
          { title: "256-bit Encryption", desc: "All user data and communications are encrypted using military-grade AES-256 encryption protocols.", icon: Lock },
          { title: "Multi-signature Protection", desc: "Transactions require multiple independent approvals, eliminating single points of failure.", icon: Shield },
          { title: "AI Fraud Detection", desc: "Machine learning algorithms monitor platform activity 24/7 to instantly flag and block suspicious behavior.", icon: Cpu },
          { title: "Withdrawal Verification", desc: "Multi-step verification processes for all outbound transfers including biometric and email confirmation.", icon: Eye },
          { title: "2FA Login Protection", desc: "Mandatory two-factor authentication ensures your account remains secure even if credentials are compromised.", icon: Lock }
        ].map((feat, i) => (
          <div key={i} className="bg-[#111827]/50 border border-[#1F2937] rounded-2xl p-6 hover:bg-[#111827] transition-colors">
            <feat.icon className="w-8 h-8 text-[#4F7CFF] mb-4" />
            <h3 className="text-lg font-bold mb-2">{feat.title}</h3>
            <p className="text-[#9CA3AF] text-sm leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>

      {/* Transparency Section */}
      <div className="bg-gradient-to-br from-[#111827] to-[#0B0F1A] border border-[#1F2937] rounded-3xl p-8 md:p-12 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#00FFA3]/5 rounded-full blur-[80px]" />
        
        <div className="max-w-2xl relative z-10">
          <h2 className="text-3xl font-bold mb-4">Unmatched Transparency</h2>
          <p className="text-[#9CA3AF] mb-8 text-lg">
            We believe trust is built on verifiability. All platform reserve wallets are publicly verifiable on blockchain explorers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {[
            { coin: "BTC", name: "Bitcoin Reserve", address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", value: "$420.5M" },
            { coin: "ETH", name: "Ethereum Reserve", address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", value: "$185.2M" }
          ].map((wallet, i) => (
            <div key={i} className="bg-[#0B0F1A] border border-[#1F2937] rounded-2xl p-6 group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{wallet.name}</h3>
                  <p className="text-[#9CA3AF] text-sm mt-1 font-mono break-all">{wallet.address.substring(0, 16)}...</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#111827] flex items-center justify-center font-bold text-xs border border-[#1F2937]">
                  {wallet.coin}
                </div>
              </div>
              <div className="flex items-center justify-between mt-6">
                <div>
                  <p className="text-xs text-[#9CA3AF]">Verified Balance</p>
                  <p className="font-bold text-[#00FFA3] flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {wallet.value}
                  </p>
                </div>
                <button className="flex items-center gap-2 text-sm text-[#4F7CFF] hover:text-white transition-colors">
                  View Explorer <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
