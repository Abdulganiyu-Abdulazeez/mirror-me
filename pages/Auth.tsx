
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User } from '../types';
import { StorageService } from '../services/storage';

interface AuthProps {
  mode: 'login' | 'register';
  setUser: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ mode, setUser }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      const users = StorageService.getUsers();
      if (users.find(u => u.username === username || u.email === email)) {
        setError('Username or email already exists.');
        return;
      }

      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        username: username.toLowerCase(),
        email,
        createdAt: Date.now()
      };

      StorageService.saveUser(newUser);
      StorageService.setCurrentUser(newUser);
      setUser(newUser);
      navigate('/dashboard');
    } else {
      const users = StorageService.getUsers();
      const user = users.find(u => u.username === username.toLowerCase());
      
      if (user) {
        StorageService.setCurrentUser(user);
        setUser(user);
        navigate('/dashboard');
      } else {
        setError('Invalid username or password.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 glass p-10 rounded-[2.5rem] border-white/10 shadow-2xl relative">
        <div className="absolute top-0 left-0 -mt-8 -ml-8 w-24 h-24 bg-indigo-500/20 blur-[40px] rounded-full" />
        <div className="text-center">
          <h2 className="text-3xl font-extrabold mb-2">
            {mode === 'login' ? 'Welcome Back' : 'Join MirrorMe'}
          </h2>
          <p className="text-slate-400">
            {mode === 'login' 
              ? 'Enter your details to check your mirrors' 
              : 'Create your account to start receiving feedback'}
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                required
              />
            </div>
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
          >
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-sm text-slate-500">
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
            <Link 
              to={mode === 'login' ? '/register' : '/login'} 
              className="text-indigo-400 font-bold hover:text-indigo-300"
            >
              {mode === 'login' ? 'Sign Up' : 'Log In'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
