
import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 text-center">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="inline-block px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-sm font-semibold mb-4 animate-pulse">
          Your digital mirror awaits
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
          Find out what they <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            actually think of you.
          </span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Create anonymous feedback links, share them with your inner circle, and see yourself through their eyes. 100% anonymous, 100% honest.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <Link 
            to="/register" 
            className="w-full sm:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/30 transition-all hover:-translate-y-1 active:scale-95"
          >
            Create Your Mirror Link
          </Link>
          <Link 
            to="/login" 
            className="w-full sm:w-auto px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-lg transition-all"
          >
            I already have an account
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-20">
          <FeatureCard 
            icon="🔒" 
            title="Fully Anonymous" 
            desc="No names, no profiles. Just pure, unadulterated thoughts from your friends."
          />
          <FeatureCard 
            icon="✨" 
            title="AI Analysis" 
            desc="Let Gemini summarize the 'vibe' of your feedback and find patterns you might miss."
          />
          <FeatureCard 
            icon="🔗" 
            title="Anonymous Prompts" 
            desc="Ask for advice, confessions, or just a simple 'What do you think of me?'"
          />
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: string, title: string, desc: string }) => (
  <div className="p-8 rounded-3xl glass border-white/5 text-left space-y-4 hover:border-indigo-500/30 transition-all duration-300">
    <div className="text-3xl">{icon}</div>
    <h3 className="text-xl font-bold">{title}</h3>
    <p className="text-slate-400 leading-relaxed">{desc}</p>
  </div>
);

export default Home;
