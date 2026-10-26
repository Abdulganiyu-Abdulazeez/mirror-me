
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User } from '../types';
import { StorageService } from '../services/storage';

interface NavbarProps {
  user: User | null;
  setUser: (user: User | null) => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, setUser }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setUser(null);
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 px-6 py-4 flex justify-between items-center">
      <Link to="/" className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <span className="text-white font-bold text-xl leading-none">M</span>
        </div>
        <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">MirrorMe</span>
      </Link>
      
      <div className="flex items-center space-x-6">
        <Link to="/workflow" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">How it Works</Link>
        {user ? (
          <>
            <Link to="/dashboard" className="text-sm font-medium hover:text-indigo-400 transition-colors">Dashboard</Link>
            <Link to="/admin" className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Admin
            </Link>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-semibold rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-sm font-medium hover:text-indigo-400 transition-colors">Login</Link>
            <Link 
              to="/register" 
              className="px-6 py-2 text-sm font-bold rounded-full bg-indigo-600 hover:bg-indigo-500 transition-all text-white shadow-lg shadow-indigo-600/30"
            >
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
