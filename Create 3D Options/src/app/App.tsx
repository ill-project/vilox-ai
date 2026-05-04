// Vilox AI — App.tsx
// Root component — wraps all providers and the router

import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { GlobalProvider } from './context/GlobalContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';

// Identifies the logged-in user to Smartsupp and resets the conversation on
// user change so each account always starts with a fresh, isolated chat thread.
function SmartsuppIdentity() {
  const { user } = useAuth();

  useEffect(() => {
    // Wait for Smartsupp to load (it loads async)
    const apply = () => {
      if (typeof window.smartsupp !== 'function') return;
      if (user) {
        // Identify this user so the agent sees who is chatting
        window.smartsupp('name', user.user_metadata?.full_name ?? user.email ?? '');
        window.smartsupp('email', user.email ?? '');
        window.smartsupp('variables', { userId: { label: 'User ID', value: user.id } });
      } else {
        // Logged out — clear identity and reset conversation so next user starts fresh
        window.smartsupp('name', '');
        window.smartsupp('email', '');
        window.smartsupp('chat:close');
      }
    };
    // Try immediately, retry once after delay in case widget hasn't loaded yet
    apply();
    const t = setTimeout(apply, 2000);
    return () => clearTimeout(t);
  }, [user?.id]); // re-run only when the user actually changes

  return null;
}

interface ErrorState { error: Error | null; }
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorState> {
  state: ErrorState = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#0B0F1A', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'monospace' }}>
          <div style={{ maxWidth: '700px', width: '100%', background: '#111827', border: '1px solid #FF4D4D40', borderRadius: '16px', padding: '2rem' }}>
            <h2 style={{ color: '#FF4D4D', margin: '0 0 1rem' }}>⚠ Application Error</h2>
            <p style={{ color: '#9CA3AF', margin: '0 0 1rem' }}>{this.state.error.message}</p>
            <pre style={{ color: '#6B7280', fontSize: '0.75rem', overflow: 'auto', whiteSpace: 'pre-wrap' }}>{this.state.error.stack}</pre>
            <button onClick={() => window.location.reload()} style={{ marginTop: '1.5rem', background: '#4F7CFF', color: 'white', border: 'none', borderRadius: '8px', padding: '0.75rem 1.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <GlobalProvider>
          <SmartsuppIdentity />
          <RouterProvider router={router} />
        </GlobalProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
