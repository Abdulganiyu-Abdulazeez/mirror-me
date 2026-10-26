import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  Share2, 
  Wand2, 
  MessageSquare, 
  Mic, 
  ExternalLink 
} from 'lucide-react';
import { User, FeedbackLink, Message } from '../types';
import { StorageService } from '../services/storage';
import { aiService } from '../services/gemini';
import StoryCardModal from '../components/StoryCardModal';
import AudioPlayer from '../components/AudioPlayer';

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [links, setLinks] = useState<FeedbackLink[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<string>('all');
  
  // Link creation modal state
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkPrompt, setNewLinkPrompt] = useState('');
  const [newLinkType, setNewLinkType] = useState<FeedbackLink['type']>('general');
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);

  // AI Analysis state
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Story card modal state
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [selectedMessageForStory, setSelectedMessageForStory] = useState<Message | null>(null);

  useEffect(() => {
    setLinks(StorageService.getLinksForUser(user.id));
    setMessages(StorageService.getMessagesForUser(user.id));
  }, [user.id]);

  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();
    const newLink: FeedbackLink = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      title: newLinkTitle || 'Untitled Mirror',
      prompt: newLinkPrompt || "Tell me something you've been meaning to say...",
      type: newLinkType,
      createdAt: Date.now()
    };
    StorageService.saveLink(newLink);
    setLinks([...links, newLink]);
    setNewLinkTitle('');
    setNewLinkPrompt('');
    setSuggestedPrompts([]);
    setIsCreatingLink(false);

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  const handleCopy = (id: string) => {
    const url = `${window.location.origin}/#/u/${user.username}/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);

    confetti({
      particleCount: 25,
      spread: 45,
      origin: { y: 0.7 }
    });

    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this mirror link?')) return;
    const allLinks = StorageService.getLinks();
    const updated = allLinks.filter(l => l.id !== id);
    localStorage.setItem('mirror_me_links', JSON.stringify(updated));
    setLinks(updated.filter(l => l.userId === user.id));
    if (selectedLinkId === id) setSelectedLinkId('all');
  };

  const handleDeleteMessage = (id: string) => {
    if (!window.confirm('Delete this reflection?')) return;
    const allMessages = StorageService.getMessages();
    const updated = allMessages.filter(m => m.id !== id);
    localStorage.setItem('mirror_me_messages', JSON.stringify(updated));
    setMessages(updated.filter(m => m.userId === user.id));
  };

  const handleSuggestPrompts = async () => {
    setIsGeneratingPrompts(true);
    try {
      const topic = newLinkType || 'friendship and honest opinions';
      const prompts = await aiService.generatePrompts(topic);
      setSuggestedPrompts(prompts);
    } catch {
      setSuggestedPrompts([
        "What's one thing you've never said to my face?",
        "What's my biggest strength and biggest flaw?",
        "If you could give me one piece of life advice, what would it be?",
        "What was your honest first impression of me?"
      ]);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const handleAnalyze = async () => {
    if (filteredMessages.length === 0) return;
    setIsAnalyzing(true);
    const textMessages = filteredMessages.filter(m => m.contentType === 'text');
    const summary = await aiService.analyzeMessages(textMessages);
    setAiSummary(summary);
    setIsAnalyzing(false);
  };

  const filteredMessages = selectedLinkId === 'all'
    ? messages
    : messages.filter(m => m.linkId === selectedLinkId);

  const openStoryModal = (msg: Message) => {
    setSelectedMessageForStory(msg);
    setStoryModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 pt-28 pb-16">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-3">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            Dashboard Live
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            How they see you, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">@{user.username}</span> 👋
          </h2>
          <p className="text-slate-400 text-sm mt-1">Share your mirror links, receive honest reflections, and export to social stories.</p>
        </div>

        <button 
          onClick={() => {
            setIsCreatingLink(true);
            setSuggestedPrompts([]);
          }}
          className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/25 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Create New Mirror
        </button>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Active Links */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              Active Mirrors ({links.length})
            </h3>
            {links.length > 0 && selectedLinkId !== 'all' && (
              <button 
                onClick={() => setSelectedLinkId('all')}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
              >
                Show All
              </button>
            )}
          </div>

          {links.length === 0 ? (
            <div className="p-8 rounded-3xl border border-dashed border-white/10 text-center glass space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-xl">
                🪞
              </div>
              <p className="text-slate-400 text-sm">You haven't created any mirror links yet.</p>
              <button 
                onClick={() => setIsCreatingLink(true)}
                className="text-indigo-400 text-sm font-bold hover:text-indigo-300 inline-flex items-center gap-1"
              >
                Create your first mirror →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {links.map(link => {
                const linkMsgCount = messages.filter(m => m.linkId === link.id).length;
                const isSelected = selectedLinkId === link.id;

                return (
                  <div 
                    key={link.id} 
                    onClick={() => setSelectedLinkId(isSelected ? 'all' : link.id)}
                    className={`p-5 rounded-3xl glass transition-all cursor-pointer relative group border ${
                      isSelected ? 'border-indigo-500 bg-indigo-500/10' : 'hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[9px] font-bold uppercase tracking-wider text-indigo-300 border border-white/10">
                          {link.type || 'general'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {linkMsgCount} {linkMsgCount === 1 ? 'reflection' : 'reflections'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteLink(link.id, e)}
                        title="Delete Mirror"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="font-bold text-base mb-1 text-white group-hover:text-indigo-300 transition-colors">
                      {link.title}
                    </h4>
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2 italic">
                      "{link.prompt}"
                    </p>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(link.id);
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        copiedId === link.id 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                          : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200'
                      }`}
                    >
                      {copiedId === link.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" />
                          Link Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          Copy Share Link
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Reflections Feed & AI Analysis */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                Recent Reflections {selectedLinkId !== 'all' && '(Filtered)'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {filteredMessages.length} of {messages.length} total messages
              </p>
            </div>

            {filteredMessages.length > 0 && (
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="text-xs font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 px-4 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-white shadow-lg shadow-purple-500/20 active:scale-95"
              >
                {isAnalyzing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Analyze Vibe with Gemini
              </button>
            )}
          </div>

          {/* AI Summary Banner */}
          {aiSummary && (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-purple-950/40 to-slate-900 border border-purple-500/30 animate-fade-in relative overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-300" />
                  </div>
                  <h4 className="font-extrabold text-white text-base">Gemini Mirror Analysis</h4>
                </div>
                <button 
                  onClick={() => setAiSummary(null)} 
                  className="text-[10px] text-slate-400 hover:text-white uppercase tracking-widest font-bold px-2 py-1 rounded-lg bg-white/5"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-slate-200 leading-relaxed italic text-sm md:text-base whitespace-pre-wrap">
                "{aiSummary}"
              </p>
            </div>
          )}

          {/* Messages Feed */}
          {filteredMessages.length === 0 ? (
            <div className="p-16 rounded-[2.5rem] border border-white/5 bg-white/[0.02] text-center glass space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto text-2xl">
                💬
              </div>
              <h4 className="text-xl font-bold text-white">No reflections yet!</h4>
              <p className="text-slate-400 max-w-sm mx-auto text-sm">
                Share your mirror link with friends on Instagram, WhatsApp, or Snapchat to receive anonymous feedback.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filteredMessages.map(msg => {
                const msgLink = links.find(l => l.id === msg.linkId);

                return (
                  <div 
                    key={msg.id} 
                    className="p-6 rounded-3xl glass hover:border-white/20 transition-all border border-white/5 flex flex-col justify-between group shadow-lg"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider line-clamp-1">
                          {msgLink?.title || 'Anonymous Prompt'}
                        </span>
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          title="Delete message"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {msg.contentType === 'text' ? (
                        <p className="text-base sm:text-lg leading-relaxed text-slate-100 font-medium whitespace-pre-wrap break-words">
                          "{msg.content}"
                        </p>
                      ) : (
                        <div className="space-y-3 py-1">
                          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wide">
                            <Mic className="w-4 h-4" />
                            Voice Reflection
                          </div>
                          <AudioPlayer src={msg.audioContent} />
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(msg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>

                      {/* Export to Story Button */}
                      <button
                        onClick={() => openStoryModal(msg)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 hover:from-pink-500/25 hover:to-indigo-500/25 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                        Share to Story
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal for Creating Link */}
      {isCreatingLink && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md" 
            onClick={() => setIsCreatingLink(false)} 
          />
          <div className="relative glass p-6 sm:p-8 rounded-[2.5rem] max-w-lg w-full animate-scale-up border border-white/10 shadow-2xl my-auto">
            <h3 className="text-2xl font-bold mb-1 text-white">Create a New Mirror</h3>
            <p className="text-slate-400 mb-6 text-xs sm:text-sm">Friends will see this title and prompt before submitting reflections.</p>

            <form onSubmit={handleCreateLink} className="space-y-5">
              {/* Category Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Mirror Type / Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['general', 'advice', 'confession', 'first-impression'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewLinkType(type)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold capitalize transition-all border ${
                        newLinkType === type 
                          ? 'border-indigo-500 bg-indigo-500/20 text-white' 
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {type.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Mirror Title
                </label>
                <input 
                  type="text" 
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  placeholder="e.g. Honestly thinking about me..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm text-white"
                  required
                />
              </div>

              {/* Prompt */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Friend Prompt
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestPrompts}
                    disabled={isGeneratingPrompts}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    {isGeneratingPrompts ? 'Generating...' : 'AI Suggestions'}
                  </button>
                </div>
                <textarea 
                  value={newLinkPrompt}
                  onChange={(e) => setNewLinkPrompt(e.target.value)}
                  placeholder="e.g. What is one thing you've always wanted to tell me?"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 h-28 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm resize-none text-white"
                  required
                />
              </div>

              {/* AI Suggested Prompts Chips */}
              {suggestedPrompts.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Click to use an AI suggestion:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {suggestedPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewLinkPrompt(p)}
                        className="text-left text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-3 py-1.5 rounded-xl transition-all"
                      >
                        "{p}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCreatingLink(false)}
                  className="flex-1 py-3.5 border border-white/10 rounded-2xl font-bold text-sm hover:bg-white/5 transition-all text-slate-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 text-white"
                >
                  Create Mirror
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instagram Story Card Generator Modal */}
      <StoryCardModal
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        message={selectedMessageForStory}
        user={user}
        links={links}
      />
    </div>
  );
};

export default Dashboard;
