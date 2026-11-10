
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User } from './types';
import { StorageService } from './services/storage';

// Pages
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import PublicSubmission from './pages/PublicSubmission';
import Admin from './pages/Admin';
import Workflow from './pages/Workflow';

import { api } from './services/api';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthInit = async () => {
      // Check for Supabase OAuth hash fragment: #access_token=...
      const fullHash = window.location.hash || '';
      if (fullHash.includes('access_token=')) {
        // Find index of access_token=
        const tokenPart = fullHash.substring(fullHash.indexOf('access_token='));
        const params = new URLSearchParams(tokenPart);
        const token = params.get('access_token');
        if (token) {
          const oauthUser = await api.auth.handleOAuthToken(token);
          if (oauthUser) {
            setUser(oauthUser);
            if (window.history.replaceState) {
              window.history.replaceState(null, '', `${window.location.pathname}#/dashboard`);
            }
            window.location.hash = '#/dashboard';
            setLoading(false);
            return;
          }
        }
      }

      const savedUser = StorageService.getCurrentUser();
      if (savedUser) {
        setUser(savedUser);
      }
      setLoading(false);
    };

    handleAuthInit();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
        {/* Background Gradients */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        </div>

        <Navbar user={user} setUser={setUser} />
        
        <Routes>
          <Route path="/" element={user ? <Navigate to={user.role === 'admin' ? "/admin" : "/dashboard"} replace /> : <Home />} />
          <Route path="/workflow" element={<Workflow />} />
          <Route path="/login" element={!user ? <Auth mode="login" setUser={setUser} /> : <Navigate to={user.role === 'admin' ? "/admin" : "/dashboard"} replace />} />
          <Route path="/register" element={!user ? <Auth mode="register" setUser={setUser} /> : <Navigate to={user.role === 'admin' ? "/admin" : "/dashboard"} replace />} />
          <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" replace />} />
          <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <Navigate to={user ? "/dashboard" : "/login"} replace />} />
          
          {/* Public Routes - Accessible to anyone at all */}
          <Route path="/u/:username/:linkId" element={<PublicSubmission />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to={user ? (user.role === 'admin' ? "/admin" : "/dashboard") : "/"} replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
