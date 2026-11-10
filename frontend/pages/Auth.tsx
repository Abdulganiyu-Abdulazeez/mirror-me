
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthProps {
  mode: 'login' | 'register';
  setUser: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ mode, setUser }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const user = await api.auth.register(username.trim(), email.trim(), password);
        setUser(user);
        if (user.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        const user = await api.auth.login(username.trim(), password);
        setUser(user);
        if (user.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jjjjelglerjoekishnjw.supabase.co';
    const redirectUrl = `${window.location.origin}/`;
    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;
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

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full py-3.5 px-4 bg-white/10 hover:bg-white/15 border border-white/20 rounded-2xl font-semibold text-white flex items-center justify-center gap-3 transition-all active:scale-95 shadow-md hover:shadow-indigo-500/10"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Continue with Google
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-slate-900 px-3 text-xs uppercase tracking-wider text-slate-500 font-semibold absolute">or</span>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">
                {mode === 'login' ? 'Username or Email' : 'Username'}
              </label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={mode === 'login' ? 'username or your-email@example.com' : 'johndoe'}
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
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner text-white placeholder-slate-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-lg"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
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
