import { motion } from 'motion/react';
import { Shield, Lock, CheckCircle2 } from 'lucide-react';
import { Card } from './shared';

export function TrustFeatures() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="p-6 bg-gradient-to-b from-[#111827] to-[#0E1628] border-[#1F2937]">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Lock size={18} className="text-[#00FFA3]" />
            Security & Limits
          </h3>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#9CA3AF]">Daily Withdrawal Limit</span>
                <span className="text-white font-medium">$2,000 / $10,000</span>
              </div>
              <div className="h-2 w-full bg-[#0B0F1A] rounded-full overflow-hidden border border-[#1F2937]">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "20%" }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-[#4F7CFF] to-[#6C3BFF] rounded-full relative"
                >
                  <div className="absolute top-0 right-0 bottom-0 left-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8L3N2Zz4=')] opacity-30 animate-[slide_1s_linear_infinite]" />
                </motion.div>
              </div>
              <p className="text-xs text-[#9CA3AF] mt-2 flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-[#00FFA3]" />
                Identity verified. Limits are currently at maximum.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex items-start gap-3 bg-[#0B0F1A] border border-[#1F2937] p-4 rounded-xl"
      >
        <Shield size={20} className="text-[#4F7CFF] shrink-0 mt-0.5" />
        <p className="text-xs text-[#9CA3AF] leading-relaxed">
          <strong className="text-white block mb-1">Encrypted Infrastructure</strong>
          Vilox AI uses 256-bit encrypted wallet infrastructure. Funds are secured in cold storage and insured up to $250,000.
        </p>
      </motion.div>
    </div>
  );
}
