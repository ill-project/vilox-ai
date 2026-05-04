// Vilox AI — main.tsx
// AI Powered Crypto & Stock Trading Platform

import React from "react";
import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { error: Error | null }
  > {
    state = { error: null };
    static getDerivedStateFromError(error: Error) { return { error }; }
    render() {
      if (this.state.error) {
        return (
          <div style={{ minHeight: '100vh', background: '#0F111A', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '2rem' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: 22, marginBottom: 8, color: '#FF4D4D' }}>Something went wrong</h1>
            <pre style={{ fontSize: 13, color: '#9CA3AF', maxWidth: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: 'center' }}>{(this.state.error as Error).message}</pre>
            <button onClick={() => window.location.reload()} style={{ marginTop: 24, padding: '10px 28px', background: '#4C6FFF', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Reload</button>
          </div>
        );
      }
      return this.props.children;
    }
  }

  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary><App /></ErrorBoundary>
  );