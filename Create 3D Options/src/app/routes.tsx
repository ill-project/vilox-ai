// Vilox AI — routes.tsx
// Application routing — public, protected, and admin routes

import React, { useState, useEffect } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { PublicLayout } from './components/PublicLayout';
import { SignIn } from './pages/SignIn';
import { GetStarted } from './pages/GetStarted';
import { LandingPage } from './pages/LandingPage';
import { AboutPage } from './pages/AboutPage';
import { AITradingPage } from './pages/AITradingPage';
import { PricingPage } from './pages/PricingPage';
import { SecurityPage } from './pages/SecurityPage';
import { MarketsPage } from './pages/MarketsPage';
import { AppMarketsPage } from './pages/AppMarketsPage';
import { MarketDetailPage } from './pages/MarketDetailPage';
import { SignUpPage } from './pages/SignUpPage';
import { Wallet } from './components/wallet/Wallet';
import { SettingsPage } from './pages/SettingsPage';
import { AILabPage } from './pages/AILabPage';
import { UpgradePage } from './pages/UpgradePage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { FrontPage } from './pages/FrontPage';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';

// Protects routes from unauthorized access
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
};



// Admin-only route guard — checks profiles.is_admin
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (user && supabase) {
      supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
        .then(({ data }) => { setIsAdmin(data?.is_admin === true); })
        .finally(() => setChecking(false));
    } else if (!authLoading) {
      setChecking(false);
    }
  }, [user, authLoading]);

  if (authLoading || checking) return (
    <div className="min-h-screen bg-[#0F111A] flex items-center justify-center">
      <div className="text-[#4C6FFF] animate-pulse text-xl">Verifying admin access...</div>
    </div>
  );

  if (!user) return <Navigate to="/sign-in" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export const router = createBrowserRouter([
  // Public marketing pages (nav + footer)
  {
    Component: PublicLayout,
    children: [
      { path: "/", Component: LandingPage },
      { path: "/about", Component: AboutPage },
      { path: "/ai-trading", Component: AITradingPage },
      { path: "/pricing", Component: PricingPage },
      { path: "/security", Component: SecurityPage },
      { path: "/markets", Component: AppMarketsPage },
      // Deep-link to a specific asset on the public markets page
      { path: "/market/:symbol", Component: MarketDetailPage },
    ],
  },
  // Auth + app pages (dark bg, sidebar when logged in)
  {
    Component: Layout,
    children: [
      { path: "/sign-in", Component: SignIn },
      { path: "/sign-up", Component: SignUpPage },
      { path: "/get-started", Component: GetStarted },
      {
        path: "/app/dashboard",
        Component: () => <ProtectedRoute><DashboardPage /></ProtectedRoute>,
      },
      {
        path: "/app/markets",
        Component: () => <ProtectedRoute><MarketsPage /></ProtectedRoute>,
      },
      {
        path: "/app/markets/:symbol",
        Component: () => <ProtectedRoute><MarketDetailPage /></ProtectedRoute>,
      },
      {
        path: "/app/ai-trading-lab",
        Component: () => <ProtectedRoute><AILabPage /></ProtectedRoute>,
      },
      {
        path: "/app/wallet",
        Component: () => <ProtectedRoute><Wallet /></ProtectedRoute>,
      },
      {
        path: "/app/settings",
        Component: () => <ProtectedRoute><SettingsPage /></ProtectedRoute>,
      },
      {
        path: "/app/upgrade",
        Component: () => <ProtectedRoute><UpgradePage /></ProtectedRoute>,
      },
    ],
  },
  {
    path: "*",
    Component: () => <Navigate to="/" replace />,
  },
  {
    path: "/admin",
    Component: () => <AdminRoute><AdminPage /></AdminRoute>,
  },
]);
