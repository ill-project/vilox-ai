/**
 * adminService.ts - Enhanced admin panel backend integration
 * 
 * Provides real-time admin operations with comprehensive error handling,
 * optimistic updates, and live data synchronization for customer management.
 */

import { supabase } from '../lib/supabase';
import { realtimeService } from './realtimeService';
import { adminGetAllUsers } from '../lib/db';
import type { UserRow } from '../pages/AdminPage';

export interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalVolume: number;
  pendingKyc: number;
  totalTrades: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

export interface AdminOperation {
  id: string;
  type: 'user_update' | 'balance_adjust' | 'kyc_update' | 'system_action';
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  details: string;
}

class AdminService {
  private subscribers = new Map<string, Set<(data: any) => void>>();
  private operations = new Map<string, AdminOperation>();

  // Subscribe to real-time admin data updates
  subscribe(event: string, callback: (data: any) => void) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(callback);
    
    return () => {
      this.subscribers.get(event)?.delete(callback);
    };
  }

  // Notify subscribers of data changes
  private notify(event: string, data: any) {
    this.subscribers.get(event)?.forEach(callback => callback(data));
  }

  // Enhanced user management with real-time updates
  async getAllUsers(): Promise<UserRow[]> {
    try {
      const data = await adminGetAllUsers();
      const users = data as UserRow[];
      this.notify('users-updated', users);
      return users;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw new Error('Unable to load user data');
    }
  }

  // Real-time user updates with optimistic updates
  async updateUser(userId: string, updates: Partial<UserRow>): Promise<void> {
    const operationId = `update-${userId}-${Date.now()}`;
    
    // Create operation tracking
    const operation: AdminOperation = {
      id: operationId,
      type: 'user_update',
      status: 'pending',
      timestamp: Date.now(),
      details: `Updating user ${userId}`
    };
    this.operations.set(operationId, operation);
    this.notify('operation-started', operation);

    try {
      // Optimistic update
      const currentUserIndex = -1; // Would need to track current users
      const previousData = {}; // Store for rollback

      // Apply optimistic update locally
      this.notify('user-updating', { userId, updates });

      // Perform server update
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Update operation status
      operation.status = 'completed';
      this.notify('operation-completed', operation);

      // Refresh user data
      await this.getAllUsers();
      
    } catch (error) {
      operation.status = 'failed';
      operation.details = `Failed to update user: ${error}`;
      this.notify('operation-failed', operation);
      throw error;
    } finally {
      this.operations.delete(operationId);
    }
  }

  // Enhanced balance adjustment with real-time sync
  async adjustBalance(userId: string, asset: string, amount: number, reason: string): Promise<void> {
    const operationId = `balance-${userId}-${Date.now()}`;
    
    const operation: AdminOperation = {
      id: operationId,
      type: 'balance_adjust',
      status: 'pending',
      timestamp: Date.now(),
      details: `Adjusting ${asset} balance for user ${userId} by ${amount}`
    };
    this.operations.set(operationId, operation);
    this.notify('operation-started', operation);

    try {
      // Import the adminAdjustBalance function
      const { adminAdjustBalance } = await import('../lib/db');
      
      await adminAdjustBalance(userId, asset, amount, reason);
      
      operation.status = 'completed';
      this.notify('operation-completed', operation);
      
      // Refresh user data to show new balance
      await this.getAllUsers();
      
    } catch (error) {
      operation.status = 'failed';
      operation.details = `Balance adjustment failed: ${error}`;
      this.notify('operation-failed', operation);
      throw error;
    } finally {
      this.operations.delete(operationId);
    }
  }

  // Get comprehensive admin metrics
  async getMetrics(): Promise<AdminMetrics> {
    try {
      const [
        { count: totalUsers },
        { count: activeUsers },
        { data: volumeData },
        { count: pendingKyc },
        { count: totalTrades }
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('transactions').select('amount').eq('status', 'completed'),
        supabase.from('kyc').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('trades').select('id', { count: 'exact' })
      ]);

      const totalVolume = volumeData?.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) || 0;

      const metrics: AdminMetrics = {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalVolume,
        pendingKyc: pendingKyc || 0,
        totalTrades: totalTrades || 0,
        systemHealth: this.determineSystemHealth({ totalUsers, activeUsers, pendingKyc })
      };

      this.notify('metrics-updated', metrics);
      return metrics;
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      throw new Error('Unable to load admin metrics');
    }
  }

  // Determine system health based on metrics
  private determineSystemHealth(metrics: Partial<AdminMetrics>): 'healthy' | 'warning' | 'error' {
    const { totalUsers = 0, activeUsers = 0, pendingKyc = 0 } = metrics;
    
    if (totalUsers === 0) return 'error';
    if (pendingKyc > totalUsers * 0.1) return 'warning';
    if (activeUsers < totalUsers * 0.5) return 'warning';
    
    return 'healthy';
  }

  // Real-time subscriptions for admin data
  subscribeToAdminUpdates(callback: (data: any) => void) {
    // Subscribe to profile changes
    const profileChannel = supabase
      .channel('admin-profile-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        this.getAllUsers().catch(console.error);
      })
      .subscribe();

    // Subscribe to wallet changes
    const walletChannel = supabase
      .channel('admin-wallet-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wallets'
      }, () => {
        this.getAllUsers().catch(console.error);
      })
      .subscribe();

    // Subscribe to KYC changes
    const kycChannel = supabase
      .channel('admin-kyc-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kyc'
      }, () => {
        this.getAllUsers().catch(console.error);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(kycChannel);
    };
  }

  // Get pending operations
  getPendingOperations(): AdminOperation[] {
    return Array.from(this.operations.values()).filter(op => op.status === 'pending');
  }

  // Export user data with enhanced formatting
  async exportUsers(format: 'csv' | 'json' = 'csv'): Promise<void> {
    try {
      const users = await this.getAllUsers();
      
      if (format === 'csv') {
        const headers = ['ID', 'Name', 'Email', 'Plan', 'Status', 'USD Balance', 'BTC Balance', 'Created At'];
        const csvData = users.map(user => [
          user.id,
          user.full_name || '',
          user.email || '',
          user.plan,
          user.status || 'active',
          user.wallets?.usd || 0,
          user.wallets?.btc || 0,
          user.created_at
        ]);
        
        const csv = [headers, ...csvData].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        this.downloadFile(csv, `users-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      } else {
        const jsonData = JSON.stringify(users, null, 2);
        this.downloadFile(jsonData, `users-export-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to export user data');
    }
  }

  // Helper function to download files
  private downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Enhanced search with multiple filters
  async searchUsers(query: string, filters: {
    plan?: string;
    status?: string;
    kycStatus?: string;
    balanceRange?: { min: number; max: number };
  }): Promise<UserRow[]> {
    try {
      let dbQuery = supabase
        .from('profiles')
        .select(`
          *,
          wallets (
            usd, btc, eth, sol, usdt
          ),
          kyc (
            status
          )
        `);

      // Apply text search
      if (query) {
        dbQuery = dbQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
      }

      // Apply filters
      if (filters.plan) {
        dbQuery = dbQuery.eq('plan', filters.plan);
      }
      
      if (filters.status) {
        dbQuery = dbQuery.eq('status', filters.status);
      }

      const { data, error } = await dbQuery.order('created_at', { ascending: false });

      if (error) throw error;

      let users = data as UserRow[];

      // Apply KYC filter (client-side since it's a joined table)
      if (filters.kycStatus) {
        users = users.filter(user => user.kyc?.status === filters.kycStatus);
      }

      // Apply balance range filter
      if (filters.balanceRange) {
        users = users.filter(user => {
          const usdBalance = user.wallets?.usd || 0;
          return usdBalance >= filters.balanceRange!.min && usdBalance <= filters.balanceRange!.max;
        });
      }

      return users;
    } catch (error) {
      console.error('Search failed:', error);
      throw new Error('Search failed');
    }
  }
}

export const adminService = new AdminService();
export default adminService;
