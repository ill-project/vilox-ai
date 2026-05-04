import { useEffect, useState } from 'react';
import { startMarketService, subscribePrices, PriceMap } from '../services/marketService';

export function useMarketData() {
  const [prices, setPrices] = useState<PriceMap>({});

  useEffect(() => {
    startMarketService();
    const unsubscribe = subscribePrices(setPrices);
    return () => unsubscribe();
  }, []);

  return prices;
}

