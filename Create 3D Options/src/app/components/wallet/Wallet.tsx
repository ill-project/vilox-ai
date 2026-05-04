import { useState } from 'react';
import { motion } from 'motion/react';
import WalletOverview from './WalletOverview';
import { WalletAssets } from './WalletAssets';
import { TransactionTable } from './TransactionTable';
import { TrustFeatures } from './TrustFeatures';
import { DepositModal, WithdrawModal } from './Modals';

export function Wallet() {
  const [isDepositOpen, setDepositOpen] = useState(false);
  const [isWithdrawOpen, setWithdrawOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white p-4 md:p-8 font-['Inter']">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#1F2937] pb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-2"
          >
            <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
            <p className="text-[#9CA3AF] text-sm">Manage your balances, crypto assets, and transactions.</p>
          </motion.div>
        </div>

        {/* Overview Card */}
        <WalletOverview
          onDeposit={() => setDepositOpen(true)}
          onWithdraw={() => setWithdrawOpen(true)}
          onTransfer={() => {}}
        />

        {/* Assets + Transactions */}
        <div className="space-y-8">
          <WalletAssets />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <TransactionTable />
          </motion.div>
        </div>

        {/* Security & Trust — always at the bottom */}
        <TrustFeatures />

      </div>

      <DepositModal isOpen={isDepositOpen} onClose={() => setDepositOpen(false)} />
      <WithdrawModal isOpen={isWithdrawOpen} onClose={() => setWithdrawOpen(false)} />
    </div>
  );
}

