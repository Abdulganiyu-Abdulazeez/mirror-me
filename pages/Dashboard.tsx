
import React, { useState, useEffect } from 'react';
import { User, FeedbackLink, Message } from '../types';
import { StorageService } from '../services/storage';
import { aiService } from '../services/gemini';

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [links, setLinks] = useState<FeedbackLink[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkPrompt, setNewLinkPrompt] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setLinks(StorageService.getLinksForUser(user.id));
    setMessages(StorageService.getMessagesForUser(user.id));
  }, [user.id]);

  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();
    const newLink: FeedbackLink = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      title: newLinkTitle,
      prompt: newLinkPrompt || "Tell me something you've been meaning to say...",
      type: 'general',
      createdAt: Date.now()
    };
    StorageService.saveLink(newLink);
    setLinks([...links, newLink]);
    setNewLinkTitle('');
    setNewLinkPrompt('');
    setIsCreatingLink(false);
  };

  const handleCopy = (id: string) => {
    const url = `${window.location.origin}/#/u/${user.username}/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAnalyze = async () => {
    if (messages.length === 0) return;
    setIsAnalyzing(true);
    // Note: Analysis currently only processes text messages for best results
    const textMessages = messages.filter(m => m.contentType === 'text');
    const summary = await aiService.analyzeMessages(textMessages);
    setAiSummary(summary);
    setIsAnalyzing(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 pt-28 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">How they see you, {user.username} 👋</h2>
          <p className="text-slate-400">Share your mirrors and listen to reflections.</p>
        </div>
        <button 
          onClick={() => setIsCreatingLink(true)}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          New Mirror Link
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Links Section */}
        <div className="lg:col-span-1 space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            Active Links
          </h3>
          
          {links.length === 0 ? (
            <div className="p-8 rounded-2xl border-2 border-dashed border-white/10 text-center glass">
              <p className="text-slate-500 mb-4 text-sm">No mirrors yet.</p>
              <button 
                onClick={() => setIsCreatingLink(true)}
                className="text-indigo-400 text-sm font-bold hover:text-indigo-300"
              >
                Create your first one →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {links.map(link => (
                <div key={link.id} className="p-5 rounded-2xl glass hover:border-indigo-500/30 transition-all group">
                  <h4 className="font-bold text-lg mb-1 group-hover:text-indigo-400 transition-colors">{link.title}</h4>
                  <p className="text-sm text-slate-400 mb-4 line-clamp-1 italic">"{link.prompt}"</p>
                  <button 
                    onClick={() => handleCopy(link.id)}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${copiedId === link.id ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}
                  >
                    {copiedId === link.id ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        Copy Share Link
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages & AI Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              Recent Reflections
            </h3>
            {messages.length > 0 && (
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="text-sm font-bold bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 text-white shadow-lg"
              >
                {isAnalyzing ? (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                )}
                Analyze Vibe (AI)
              </button>
            )}
          </div>

          {aiSummary && (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-600/20 border border-white/10 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🔮</span>
                <h4 className="font-bold text-lg">Mirror Analysis</h4>
              </div>
              <p className="text-slate-200 leading-relaxed italic relative z-10 text-sm md:text-base">"{aiSummary}"</p>
              <button onClick={() => setAiSummary(null)} className="mt-4 text-[10px] text-slate-400 hover:text-white uppercase tracking-widest font-bold">Dismiss Analysis</button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="p-16 rounded-[2.5rem] border border-white/5 bg-white/[0.02] text-center glass">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </div>
              <h4 className="text-2xl font-bold mb-3">No reflections yet!</h4>
              <p className="text-slate-400 max-w-sm mx-auto">Your mirror is currently empty. Share a link with your friends to see yourself through their eyes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {messages.map(msg => (
                <div key={msg.id} className="p-6 rounded-3xl glass hover:scale-[1.02] transition-all border border-white/5 flex flex-col justify-between">
                  <div>
                    {msg.contentType === 'text' ? (
                      <p className="text-lg leading-relaxed text-slate-200">{msg.content}</p>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-indigo-400 font-bold text-sm">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                          Voice Note
                        </div>
                        <audio src={msg.audioContent} controls className="w-full h-10 filter invert grayscale opacity-80" />
                      </div>
                    )}
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(msg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-[9px] text-indigo-400 font-bold uppercase tracking-widest border border-indigo-500/20">Anonymous</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal for Creating Link */}
      {isCreatingLink && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsCreatingLink(false)} />
          <div className="relative glass p-8 md:p-10 rounded-[2.5rem] max-w-md w-full animate-scale-up border border-white/10 shadow-2xl">
            <h3 className="text-2xl font-bold mb-2">Create a New Mirror</h3>
            <p className="text-slate-400 mb-8 text-sm">Friends will see this prompt before they leave a message.</p>
            <form onSubmit={handleCreateLink} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Mirror Title</label>
                <input 
                  type="text" 
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  placeholder="e.g. Honestly thinking about me..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm shadow-inner"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Friend Prompt</label>
                <textarea 
                  value={newLinkPrompt}
                  onChange={(e) => setNewLinkPrompt(e.target.value)}
                  placeholder="e.g. What is one thing I should stop doing?"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm resize-none shadow-inner"
                  required
                />
              </div>
              <div className="pt-2 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsCreatingLink(false)}
                  className="flex-1 py-4 border border-white/10 rounded-2xl font-bold text-sm hover:bg-white/5 transition-all text-slate-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 text-white"
                >
                  Create Mirror
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
