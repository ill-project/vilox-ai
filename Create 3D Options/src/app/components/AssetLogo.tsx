import React, { useState } from 'react';

interface AssetLogoProps {
  symbol: string;
  type: 'CRYPTO' | 'STOCK';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  imageUrl?: string; // override — used by AI Lab live CoinGecko URLs
}

// Real logo URLs — crypto via CoinGecko CDN, stocks via Clearbit (no API key required)
const LOGO_URLS: Record<string, string> = {
  // â”€â”€ Crypto â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  BTC:   'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH:   'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  SOL:   'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  XRP:   'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  BNB:   'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  ADA:   'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  AVAX:  'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  DOGE:  'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  DOT:   'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  LINK:  'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  UNI:   'https://assets.coingecko.com/coins/images/12504/small/uni.jpg',
  ATOM:  'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',
  LTC:   'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
  NEAR:  'https://assets.coingecko.com/coins/images/10365/small/near.jpg',
  QNT:   'https://assets.coingecko.com/coins/images/3370/small/5ZOu7brX_400x400.jpg',
  SHIB:  'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
  TRX:   'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
  OP:    'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  ARB:   'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_18.09.07.jpeg',
  // â”€â”€ Stocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  AAPL:  'https://logo.clearbit.com/apple.com',
  NVDA:  'https://logo.clearbit.com/nvidia.com',
  TSLA:  'https://logo.clearbit.com/tesla.com',
  MSFT:  'https://logo.clearbit.com/microsoft.com',
  GOOGL: 'https://logo.clearbit.com/google.com',
  AMZN:  'https://logo.clearbit.com/amazon.com',
  META:  'https://logo.clearbit.com/meta.com',
  NFLX:  'https://logo.clearbit.com/netflix.com',
  JPM:   'https://logo.clearbit.com/jpmorganchase.com',
  AMD:   'https://logo.clearbit.com/amd.com',
  V:     'https://logo.clearbit.com/visa.com',
  COIN:  'https://logo.clearbit.com/coinbase.com',
  PLTR:  'https://logo.clearbit.com/palantir.com',
  DIS:   'https://logo.clearbit.com/disney.com',
  SHOP:  'https://logo.clearbit.com/shopify.com',
};

export const AssetLogo: React.FC<AssetLogoProps> = ({ symbol, type, size = 'md', imageUrl }) => {
  const [imgFailed, setImgFailed] = useState(false);

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-14 h-14 text-xl',
  };

  // Resolve URL: explicit override → auto map → nothing
  const resolvedUrl = !imgFailed ? (imageUrl ?? LOGO_URLS[symbol] ?? null) : null;

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt={symbol}
        onError={() => setImgFailed(true)}
        className={`${sizeClasses[size]} rounded-full object-cover bg-white/5 shrink-0`}
      />
    );
  }

  const getStyle = () => {
    switch (symbol) {
      case 'BTC':
        return { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-500', char: 'â‚¿', shadow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]' };
      case 'ETH':
        return { bg: 'bg-indigo-500/20', border: 'border-indigo-500/50', text: 'text-indigo-400', char: 'Îž', shadow: 'shadow-[0_0_15px_rgba(99,102,241,0.2)]' };
      case 'SOL':
        return { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400', char: 'â—Ž', shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]' };
      case 'DOGE':
        return { bg: 'bg-yellow-400/20', border: 'border-yellow-400/50', text: 'text-yellow-400', char: 'Ã', shadow: 'shadow-[0_0_15px_rgba(250,204,21,0.2)]' };
      case 'ADA':
        return { bg: 'bg-blue-400/20', border: 'border-blue-400/50', text: 'text-blue-300', char: 'A', shadow: 'shadow-[0_0_15px_rgba(147,197,253,0.2)]' };
      case 'DOT':
        return { bg: 'bg-pink-500/20', border: 'border-pink-500/50', text: 'text-pink-400', char: 'â—', shadow: 'shadow-[0_0_15px_rgba(236,72,153,0.2)]' };
      case 'MATIC':
        return { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400', char: 'M', shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]' };
      case 'UNI':
        return { bg: 'bg-pink-400/20', border: 'border-pink-400/50', text: 'text-pink-300', char: 'ðŸ¦„', shadow: 'shadow-[0_0_15px_rgba(244,114,182,0.2)]' };
      case 'ATOM':
        return { bg: 'bg-violet-500/20', border: 'border-violet-500/50', text: 'text-violet-400', char: 'âš›', shadow: 'shadow-[0_0_15px_rgba(139,92,246,0.2)]' };
      case 'LTC':
        return { bg: 'bg-gray-400/20', border: 'border-gray-400/50', text: 'text-gray-300', char: 'Å', shadow: 'shadow-[0_0_15px_rgba(156,163,175,0.2)]' };
      case 'NEAR':
        return { bg: 'bg-black/40', border: 'border-white/30', text: 'text-white', char: 'N', shadow: 'shadow-[0_0_15px_rgba(255,255,255,0.1)]' };
      case 'AMZN':
        return { bg: 'bg-orange-400/20', border: 'border-orange-400/50', text: 'text-orange-400', char: 'A', shadow: 'shadow-[0_0_15px_rgba(251,146,60,0.2)]' };
      case 'META':
        return { bg: 'bg-blue-600/20', border: 'border-blue-600/50', text: 'text-blue-400', char: 'M', shadow: 'shadow-[0_0_15px_rgba(37,99,235,0.2)]' };
      case 'QNT':
        return { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-400', char: 'Q', shadow: 'shadow-[0_0_15px_rgba(6,182,212,0.2)]' };
      case 'XRP':
        return { bg: 'bg-slate-500/20', border: 'border-slate-500/50', text: 'text-slate-300', char: 'âœ•', shadow: 'shadow-[0_0_15px_rgba(148,163,184,0.2)]' };
      case 'GOOGL':
        return { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', char: 'G', shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' };
      case 'AAPL':
        return { bg: 'bg-white/10', border: 'border-white/30', text: 'text-white', char: 'ï£¿', shadow: 'shadow-[0_0_15px_rgba(255,255,255,0.1)]' };
      case 'NVDA':
        return { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-500', char: 'N', shadow: 'shadow-[0_0_15px_rgba(34,197,94,0.2)]' };
      case 'MSFT':
        return { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', char: 'M', shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]' };
      case 'TSLA':
        return { bg: 'bg-rose-500/20', border: 'border-rose-500/50', text: 'text-rose-400', char: 'T', shadow: 'shadow-[0_0_15px_rgba(244,63,113,0.2)]' };
      default:
        return { bg: 'bg-white/5', border: 'border-white/20', text: 'text-white', char: symbol.substring(0, 1), shadow: '' };
    }
  };

  const style = getStyle();

  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold border ${style.bg} ${style.border} ${style.text} ${style.shadow} select-none`}>
      {style.char}
    </div>
  );
};
