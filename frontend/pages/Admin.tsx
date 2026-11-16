import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  Radio, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Clock, 
  Filter,
  Send,
  Volume2
} from 'lucide-react';
import { api } from '../services/api';
import { StorageService } from '../services/storage';
import { aiService } from '../services/gemini';
import { Message, User, Broadcast } from '../types';
import AudioPlayer from '../components/AudioPlayer';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'broadcasts' | 'reflections'>('users');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [activityFilter, setActivityFilter] = useState<'all' | '1d' | '7d' | '30d'>('all');
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMessages: 0,
    voiceNotes: 0,
    activeLinks: 0
  });

  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('all');

  // Broadcast creation form
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isPublishingBroadcast, setIsPublishingBroadcast] = useState(false);

  // Moderation state
  const [moderatingUserId, setModeratingUserId] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsData, logsData, usersData, broadcastsData] = await Promise.all([
        api.admin.getStats(),
        api.admin.getLogs(),
        api.admin.getUsers(activityFilter),
        api.admin.getBroadcasts()
      ]);
      setStats(statsData);
      setMessages(logsData);
      setUsers(usersData);
      setBroadcasts(broadcastsData);
    } catch (err) {
      console.warn('Failed to load live admin data, falling back to local storage:', err);
      const localMessages = StorageService.getMessages();
      const localUsers = StorageService.getUsers();
      const localLinks = StorageService.getLinks();
      setMessages(localMessages);
      setUsers(localUsers);
      setStats({
        totalUsers: localUsers.length,
        totalMessages: localMessages.length,
        voiceNotes: localMessages.filter(m => m.contentType === 'audio').length,
        activeLinks: localLinks.length
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [activityFilter]);

  const handleToggleUserActive = async (userId: string, currentStatus: boolean) => {
    try {
      setModeratingUserId(userId);
      const newStatus = await api.admin.toggleUserActive(userId, currentStatus);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: newStatus } : u));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user status';
      alert(msg);
    } finally {
      setModeratingUserId(null);
    }
  };

  const handlePublishBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    try {
      setIsPublishingBroadcast(true);
      const created = await api.admin.createBroadcast(broadcastTitle.trim(), broadcastMessage.trim());
      setBroadcasts(prev => [created, ...prev]);
      setBroadcastTitle('');
      setBroadcastMessage('');
      alert('Broadcast published successfully! It will now appear on user dashboards.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish broadcast';
      alert(msg);
    } finally {
      setIsPublishingBroadcast(false);
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    if (!window.confirm('Delete this broadcast announcement?')) return;
    try {
      await api.admin.deleteBroadcast(id);
      setBroadcasts(prev => prev.filter(b => b.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete broadcast';
      alert(msg);
    }
  };

  const filteredMessages = selectedUser === 'all' 
    ? messages 
    : messages.filter(m => m.userId === selectedUser);

  const handleAnalyze = async () => {
    if (filteredMessages.length === 0) return;
    setIsAnalyzing(true);
    const textMessages = filteredMessages.filter(m => m.contentType === 'text');
    const summary = await aiService.analyzeMessages(textMessages);
    setAiSummary(summary);
    setIsAnalyzing(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
      {/* Header */}
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          Restricted Admin Workstation
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-2 tracking-tight">Admin Workstation</h2>
        <p className="text-slate-400 text-sm sm:text-base">
          Platform oversight, user directory, account moderation, and global broadcast announcements.
        </p>
      </header>

      {/* High-Level Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
        <StatCard title="Total Users" value={stats.totalUsers || users.length} icon="👥" color="indigo" />
        <StatCard title="Total Reflections" value={stats.totalMessages || messages.length} icon="💬" color="purple" />
        <StatCard title="Voice Notes" value={stats.voiceNotes || messages.filter(m => m.contentType === 'audio').length} icon="🎙️" color="pink" />
        <StatCard title="Active Mirrors" value={stats.activeLinks} icon="🪞" color="emerald" />
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 mb-8 overflow-x-auto no-scrollbar gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-indigo-500 text-white bg-indigo-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          User Directory ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('broadcasts')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'broadcasts'
              ? 'border-indigo-500 text-white bg-indigo-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4" />
          Broadcast System ({broadcasts.length})
        </button>

        <button
          onClick={() => setActiveTab('reflections')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'reflections'
              ? 'border-indigo-500 text-white bg-indigo-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Reflections & AI Logs ({messages.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* TAB 1: USER DIRECTORY & MODERATION */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass p-4 sm:p-5 rounded-2xl border-white/10">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Filter className="w-4 h-4" />
                  Filter by Activity
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(['all', '1d', '7d', '30d'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setActivityFilter(filter)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        activityFilter === filter
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {filter === 'all' ? 'All Users' : filter.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users Table */}
              <div className="glass rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="py-4 px-6">User</th>
                        <th className="py-4 px-6">Role</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6">Last Active</th>
                        <th className="py-4 px-6 text-right">Moderation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            No users match this filter criteria.
                          </td>
                        </tr>
                      ) : (
                        users.map(u => {
                          const isActive = u.isActive !== false;
                          const isPrimaryAdmin = u.email.toLowerCase() === 'haypexdev@gmail.com';

                          return (
                            <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  {u.avatarUrl ? (
                                    <img 
                                      src={u.avatarUrl} 
                                      alt={u.username} 
                                      className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0" 
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white uppercase text-sm shrink-0">
                                      {u.username[0] || 'U'}
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-bold text-white flex items-center gap-1.5">
                                      @{u.username}
                                    </div>
                                    <div className="text-xs text-slate-400 font-mono">
                                      {u.email}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-6">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                  u.role === 'admin'
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                    : 'bg-white/5 text-slate-400 border-white/10'
                                }`}>
                                  {u.role || 'user'}
                                </span>
                              </td>

                              <td className="py-4 px-6">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                  isActive
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                  {isActive ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Active
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3.5 h-3.5" />
                                      Suspended
                                    </>
                                  )}
                                </span>
                              </td>

                              <td className="py-4 px-6 text-xs text-slate-400">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                                  {u.lastActiveAt 
                                    ? new Date(u.lastActiveAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                    : 'Recently'}
                                </div>
                              </td>

                              <td className="py-4 px-6 text-right">
                                {isPrimaryAdmin ? (
                                  <span className="text-[11px] text-slate-500 italic">Protected</span>
                                ) : (
                                  <button
                                    onClick={() => handleToggleUserActive(u.id, isActive)}
                                    disabled={moderatingUserId === u.id}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border disabled:opacity-50 ${
                                      isActive
                                        ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                    }`}
                                  >
                                    {moderatingUserId === u.id 
                                      ? 'Updating...' 
                                      : isActive ? 'Deactivate User' : 'Activate User'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BROADCAST SYSTEM */}
          {activeTab === 'broadcasts' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Broadcast Creator Form */}
              <div className="lg:col-span-1 glass p-6 sm:p-8 rounded-[2rem] border border-white/10 shadow-xl space-y-5 h-fit">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Radio className="w-5 h-5 text-indigo-400" />
                    Publish Broadcast
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Send global update banners visible across user dashboards.
                  </p>
                </div>

                <form onSubmit={handlePublishBroadcast} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Announcement Title
                    </label>
                    <input 
                      type="text" 
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="e.g., Scheduled Maintenance"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Message Content
                    </label>
                    <textarea 
                      rows={4}
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Enter announcement text for all platform users..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPublishingBroadcast}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    {isPublishingBroadcast ? 'Publishing...' : 'Publish to Dashboards'}
                  </button>
                </form>
              </div>

              {/* Active Broadcasts List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  Active Announcements ({broadcasts.length})
                </h3>

                {broadcasts.length === 0 ? (
                  <div className="p-12 glass rounded-3xl border border-dashed border-white/10 text-center">
                    <p className="text-slate-400 text-sm">No announcements published yet.</p>
                  </div>
                ) : (
                  broadcasts.map(b => (
                    <div 
                      key={b.id}
                      className="p-5 rounded-2xl glass border border-white/10 flex items-start justify-between gap-4 shadow-md"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30">
                            Broadcast
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(b.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-base">{b.title}</h4>
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{b.message}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteBroadcast(b.id)}
                        title="Delete Broadcast"
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: REFLECTIONS & AI INSIGHTS */}
          {activeTab === 'reflections' && (
            <div className="space-y-8">
              {/* Intelligence Section */}
              <div className="glass p-6 sm:p-8 rounded-[2.5rem] border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-1">Mirror Intelligence</h3>
                    <p className="text-slate-400 text-xs sm:text-sm">Filter and analyze collective peer reflections.</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <select 
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-48 text-white"
                    >
                      <option value="all" className="bg-slate-900">All Reflections</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id} className="bg-slate-900">@{u.username}</option>
                      ))}
                    </select>
                    
                    <button 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || filteredMessages.length === 0}
                      className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {isAnalyzing ? "Processing..." : "Run AI Analysis"}
                    </button>
                  </div>
                </div>

                {aiSummary && (
                  <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-2xl animate-fade-in mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <h4 className="font-bold text-indigo-300 text-sm">Gemini Insight Report</h4>
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed italic whitespace-pre-wrap">{aiSummary}</p>
                    <button 
                      onClick={() => setAiSummary(null)}
                      className="mt-3 text-[10px] text-slate-500 hover:text-white font-bold uppercase tracking-widest"
                    >
                      Dismiss Report
                    </button>
                  </div>
                )}

                {/* Reflections Feed */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Recent Reflections Feed ({filteredMessages.length})
                  </h4>

                  {filteredMessages.length === 0 ? (
                    <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center">
                      <p className="text-slate-500 italic text-sm">No reflections found for this criteria.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredMessages.map(msg => (
                        <div key={msg.id} className="p-5 rounded-2xl glass border border-white/5 space-y-3">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="font-bold text-indigo-400">
                              @{msg.recipientUsername || 'recipient'}
                            </span>
                            <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                          </div>

                          {msg.contentType === 'text' ? (
                            <p className="text-sm text-slate-200 leading-relaxed italic">
                              "{msg.content}"
                            </p>
                          ) : (
                            <div className="space-y-2 py-1">
                              <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-bold">
                                <Volume2 className="w-4 h-4" />
                                Voice Reflection
                              </div>
                              <AudioPlayer src={msg.audioContent} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className="p-5 sm:p-6 rounded-[2rem] glass border-white/10 shadow-lg flex items-center justify-between relative overflow-hidden group">
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{title}</p>
      <h3 className="text-2xl sm:text-3xl font-extrabold text-white">{value}</h3>
    </div>
    <div className="text-2xl sm:text-3xl p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
      {icon}
    </div>
  </div>
);

export default Admin;
