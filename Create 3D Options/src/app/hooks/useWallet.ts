import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchWallet,
  createWallet,
  subscribeToWallet,
  unsubscribe,
  WalletRow,
  ChannelStatus,
} from '../services/supabaseService';

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  // Track whether we were previously disconnected so we only re-fetch after
  // a real outage — never on the initial SUBSCRIBED event.
  const wasDisconnected = useRef(false);

  // â”€â”€ Initial fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // `silent` skips the isLoading flash — used for background re-syncs after
  // reconnect so the UI does not flicker back to skeleton.
  const load = useCallback(async (silent = false) => {
    if (!user) {
      setWallet(null);
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);
    try {
      let w = await fetchWallet(user.id);
      if (!w) w = await createWallet(user.id);
      setWallet(w);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setWallet(null);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // â”€â”€ Realtime subscription â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Auth-gated: only mounts after wallet.id is confirmed from initial fetch.
  useEffect(() => {
    if (!user || !wallet?.id) return;
    if (import.meta.env.VITE_ENABLE_REALTIME === 'false') return;

    wasDisconnected.current = false;

    const handleStatus = (status: ChannelStatus) => {
      if (status === 'RECONNECTING' || status === 'ERROR') {
        setIsReconnecting(true);
        wasDisconnected.current = true;
      } else if (status === 'CONNECTED') {
        setIsReconnecting(false);
        // Only re-fetch after a real outage — not on the initial SUBSCRIBED event.
        if (wasDisconnected.current) {
          wasDisconnected.current = false;
          load(true); // silent: no isLoading flash
        }
      }
    };

    const channel = subscribeToWallet(
      user.id,
      wallet.id,
      (updated) => {
        setWallet(updated);
        setIsReconnecting(false);
      },
      handleStatus
    );

    return () => unsubscribe(channel);
  }, [user, wallet?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { wallet, isLoading, isReconnecting, error, refresh: load };
}
