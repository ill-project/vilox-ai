/**
 * realtimeService.ts - Optimistic updates and real-time synchronization
 * 
 * Provides immediate feedback for user actions while maintaining data consistency
 * with the backend through real-time subscriptions and conflict resolution.
 */

import { supabase } from '../lib/supabase';
import type { WalletRow } from './supabaseService';

export interface OptimisticUpdate {
  id: string;
  type: 'balance' | 'transaction' | 'subscription';
  timestamp: number;
  data: any;
  rollback?: () => Promise<void>;
}

class RealtimeService {
  private pendingUpdates = new Map<string, OptimisticUpdate>();
  private subscribers = new Set<(updates: OptimisticUpdate[]) => void>();

  // Subscribe to pending updates for UI components
  subscribe(callback: (updates: OptimisticUpdate[]) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Notify all subscribers of pending updates
  private notify() {
    const updates = Array.from(this.pendingUpdates.values());
    this.subscribers.forEach(callback => callback(updates));
  }

  // Optimistic balance update with rollback capability
  async optimisticBalanceUpdate(
    userId: string, 
    asset: string, 
    newBalance: number, 
    operation: () => Promise<any>
  ): Promise<any> {
    const updateId = `balance-${userId}-${asset}-${Date.now()}`;
    
    // Store current state for rollback
    const { data: currentWallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    const previousBalance = currentWallet ? Number(currentWallet[asset.toLowerCase()] || 0) : 0;

    // Create optimistic update
    const optimisticUpdate: OptimisticUpdate = {
      id: updateId,
      type: 'balance',
      timestamp: Date.now(),
      data: {
        userId,
        asset,
        newBalance,
        previousBalance,
        operation: 'update'
      },
      rollback: async () => {
        await supabase
          .from('wallets')
          .update({
            [asset.toLowerCase()]: previousBalance,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }
    };

    // Apply optimistic update
    this.pendingUpdates.set(updateId, optimisticUpdate);
    this.notify();

    try {
      // Execute the actual operation
      const result = await operation();
      
      // Remove optimistic update on success
      this.pendingUpdates.delete(updateId);
      this.notify();
      
      return result;
    } catch (error) {
      // Rollback on failure
      if (optimisticUpdate.rollback) {
        try {
          await optimisticUpdate.rollback();
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
      }
      
      // Remove optimistic update
      this.pendingUpdates.delete(updateId);
      this.notify();
      
      throw error;
    }
  }

  // Optimistic subscription purchase
  async optimisticSubscriptionPurchase(
    userId: string,
    plan: string,
    price: number,
    operation: () => Promise<any>
  ): Promise<any> {
    const updateId = `subscription-${userId}-${Date.now()}`;
    
    // Store current state for rollback
    const { data: currentWallet } = await supabase
      .from('wallets')
      .select('usd')
      .eq('user_id', userId)
      .single();

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single();

    const previousBalance = currentWallet ? Number(currentWallet.usd || 0) : 0;
    const previousPlan = currentProfile?.plan || 'starter';
    const processingFee = Math.round(price * 0.025);
    const totalCharge = price + processingFee;
    const newBalance = previousBalance - totalCharge;

    // Create optimistic update
    const optimisticUpdate: OptimisticUpdate = {
      id: updateId,
      type: 'subscription',
      timestamp: Date.now(),
      data: {
        userId,
        plan,
        newPlan: plan,
        previousPlan,
        newBalance,
        previousBalance,
        chargeAmount: totalCharge,
        operation: 'purchase'
      },
      rollback: async () => {
        await Promise.all([
          supabase
            .from('wallets')
            .update({
              usd: previousBalance,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId),
          supabase
            .from('profiles')
            .update({
              plan: previousPlan,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)
        ]);
      }
    };

    // Apply optimistic update
    this.pendingUpdates.set(updateId, optimisticUpdate);
    this.notify();

    try {
      // Execute the actual operation
      const result = await operation();
      
      // Remove optimistic update on success after a short delay
      setTimeout(() => {
        this.pendingUpdates.delete(updateId);
        this.notify();
      }, 2000);
      
      return result;
    } catch (error) {
      // Rollback on failure
      if (optimisticUpdate.rollback) {
        try {
          await optimisticUpdate.rollback();
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
      }
      
      // Remove optimistic update
      this.pendingUpdates.delete(updateId);
      this.notify();
      
      throw error;
    }
  }

  // Get pending updates for a specific user and type
  getPendingUpdates(userId?: string, type?: string): OptimisticUpdate[] {
    return Array.from(this.pendingUpdates.values()).filter(update => {
      if (userId && update.data.userId !== userId) return false;
      if (type && update.type !== type) return false;
      return true;
    });
  }

  // Clear stale updates (older than 30 seconds)
  clearStaleUpdates() {
    const now = Date.now();
    const staleThreshold = 30000; // 30 seconds
    
    for (const [id, update] of this.pendingUpdates.entries()) {
      if (now - update.timestamp > staleThreshold) {
        this.pendingUpdates.delete(id);
      }
    }
    
    if (this.pendingUpdates.size > 0) {
      this.notify();
    }
  }

  // Force refresh wallet data from server
  async refreshWallet(userId: string): Promise<WalletRow | null> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Failed to refresh wallet:', error);
      return null;
    }

    // Clear any pending balance updates for this user
    const balanceUpdates = this.getPendingUpdates(userId, 'balance');
    balanceUpdates.forEach(update => {
      this.pendingUpdates.delete(update.id);
    });

    this.notify();
    return data;
  }

  // Enhanced real-time subscription with conflict resolution
  subscribeToWalletChanges(
    userId: string,
    onWalletChange: (wallet: WalletRow) => void,
    onError?: (error: Error) => void
  ) {
    const channel = supabase
      .channel(`wallet-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'wallets',
        filter: `user_id=eq.${userId}`
      }, async (payload) => {
        try {
          const updatedWallet = payload.new as WalletRow;
          
          // Check for conflicts with pending updates
          const pendingUpdates = this.getPendingUpdates(userId, 'balance');
          
          for (const pendingUpdate of pendingUpdates) {
            const { asset, newBalance } = pendingUpdate.data;
            const serverBalance = Number(updatedWallet[asset.toLowerCase()] || 0);
            
            if (Math.abs(serverBalance - newBalance) > 0.01) {
              // Conflict detected - server state differs from optimistic state
              console.warn('Balance conflict detected, resolving...');
              
              // Remove the conflicting optimistic update
              this.pendingUpdates.delete(pendingUpdate.id);
              this.notify();
            }
          }
          
          onWalletChange(updatedWallet);
        } catch (error) {
          console.error('Error handling wallet change:', error);
          onError?.(error as Error);
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          const error = new Error('Realtime subscription failed');
          onError?.(error);
        }
      });

    // Clear stale updates periodically
    const interval = setInterval(() => {
      this.clearStaleUpdates();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }
}

export const realtimeService = new RealtimeService();
export default realtimeService;
