import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useGlobalContext } from '../context/GlobalContext';
import { useStore } from '../store';
import { useAuth } from '../context/AuthContext';
import type { Asset } from '../types';

/**
 * Encapsulates the "select asset → check balance → open trade or redirect to deposit"
 * logic so any component can call a single function without duplicating the guard.
 */
export function useMarketActions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet } = useGlobalContext();
  const setActiveAsset = useStore((s) => s.setActiveAsset);

  /**
   * Open the trade panel for the given asset.
   * Unauthenticated users are sent to sign-in first.
   * Authenticated users with no USD balance are redirected to deposit.
   */
  const selectAsset = useCallback(
    (asset: Asset) => {
      // Not logged in → go to sign-in, then return to markets
      if (!user) {
        navigate('/sign-in', {
          state: { returnTo: '/app/markets' },
        });
        return;
      }

      const usdBalance = wallet ? Number(wallet.usd) : 0;

      if (usdBalance < 0.01) {
        // Logged in but no balance → prompt deposit
        navigate('/app/dashboard', {
          state: { depositIntent: true, returnTo: `/app/markets` },
        });
        return;
      }

      setActiveAsset(asset);
    },
    [wallet, navigate, setActiveAsset],
  );

  /**
   * Navigate to the deep-link URL for an asset so the split-view/detail page
   * opens directly when the user shares a link.
   */
  const navigateToAsset = useCallback(
    (asset: Asset) => {
      navigate(`/market/${asset.symbol.toLowerCase()}`);
    },
    [navigate],
  );

  /**
   * Clear the active asset (close the trade panel).
   */
  const clearAsset = useCallback(() => {
    setActiveAsset(null);
  }, [setActiveAsset]);

  return { selectAsset, navigateToAsset, clearAsset };
}
