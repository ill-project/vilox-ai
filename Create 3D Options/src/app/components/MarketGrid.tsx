import React, { useState, useEffect } from 'react';
import { AssetCard3D } from './AssetCard3D';
import { Asset } from '../types';
import { SearchX } from 'lucide-react';
import { motion } from 'motion/react';

interface MarketGridProps {
  assets: Asset[];
  isLoading: boolean;
  onSelectAsset: (asset: Asset) => void;
  searchQuery: string;
  isUserElite?: boolean;
}

export const MarketGrid: React.FC<MarketGridProps> = ({ assets, isLoading, onSelectAsset, searchQuery, isUserElite = false }) => {
  const [showShimmer, setShowShimmer] = useState(isLoading);

  useEffect(() => {
    setShowShimmer(isLoading);
  }, [isLoading]);

  const filteredAssets = assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showShimmer) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 w-full">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[280px] rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>
        ))}
      </div>
    );
  }

  if (filteredAssets.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center border border-dashed border-white/20 rounded-2xl bg-white/5 backdrop-blur-[12px]">
        <SearchX className="w-12 h-12 text-white/20 mb-4" />
        <h3 className="text-xl font-semibold text-white/80">No Results Found</h3>
        <p className="text-white/40 mt-2">Try adjusting your search query or clear filters.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 w-full"
    >
      {filteredAssets.map((asset) => (
        <AssetCard3D
          key={asset.id}
          asset={asset}
          onClick={onSelectAsset}
          isUserElite={isUserElite} // from user's profile plan
        />
      ))}
    </motion.div>
  );
};
