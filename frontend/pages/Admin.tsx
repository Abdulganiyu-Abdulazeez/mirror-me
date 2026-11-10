import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StorageService } from '../services/storage';
import { aiService } from '../services/gemini';
import { Message, User } from '../types';

const Admin: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
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

  useEffect(() => {
    let isMounted = true;
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        const [statsData, logsData] = await Promise.all([
          api.admin.getStats(),
          api.admin.getLogs()
        ]);
        if (isMounted) {
          setStats(statsData);
          setMessages(logsData);
          setUsers(StorageService.getUsers());
        }
      } catch (err) {
        console.warn('Failed to load live admin data:', err);
        if (isMounted) {
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
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAdminData();
    return () => { isMounted = false; };
  }, []);

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
    <div className="max-w-6xl mx-auto px-6 pt-28 pb-12">
      <header className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          Restricted Admin Area
        </div>
        <h2 className="text-4xl font-extrabold mb-2">Admin Control Center</h2>
        <p className="text-slate-400">Deep dive into anonymous feedback patterns, user volume, and AI insights.</p>
      </header>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <StatCard title="Total Users" value={stats.totalUsers || users.length} icon="👥" />
            <StatCard title="Total Reflections" value={stats.totalMessages || messages.length} icon="💬" />
            <StatCard title="Voice Notes" value={stats.voiceNotes || messages.filter(m => m.contentType === 'audio').length} icon="🎙️" />
            <StatCard title="Active Mirrors" value={stats.activeLinks} icon="🪞" />
          </div>

          <div className="glass p-8 rounded-[2.5rem] border-white/10 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <h3 className="text-2xl font-bold mb-1">Mirror Intelligence</h3>
                <p className="text-slate-400 text-sm">Select a user to analyze their collective feedback vibe.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <select 
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-48 text-white"
                >
                  <option value="all" className="bg-slate-900">All Messages</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id} className="bg-slate-900">@{u.username}</option>
                  ))}
                </select>
                
                <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || filteredMessages.length === 0}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? "Processing..." : "Run AI Analysis"}
                </button>
              </div>
            </div>

            {aiSummary ? (
              <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-2xl animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">🔮</span>
                  <h4 className="font-bold text-indigo-400">Gemini Insight Report</h4>
                </div>
                <p className="text-slate-200 leading-relaxed italic whitespace-pre-wrap">{aiSummary}</p>
                <button 
                  onClick={() => setAiSummary(null)}
                  className="mt-6 text-xs text-slate-500 hover:text-white font-bold uppercase tracking-widest"
                >
                  Clear Report
                </button>
              </div>
            ) : (
              <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center">
                <p className="text-slate-500 italic">
                  {filteredMessages.length === 0 ? "No reflections found for this criteria." : "Click 'Run AI Analysis' to generate insights."}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold">Recent Activity Feed</h3>
            <div className="glass overflow-hidden rounded-2xl border-white/5">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Recipient</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Content Preview</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {messages.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">
                        No reflections recorded yet.
                      </td>
                    </tr>
                  ) : (
                    messages.slice(0, 15).map(m => {
                      const user = users.find(u => u.id === m.userId);
                      const recipientHandle = m.recipientUsername || user?.username || 'user';
                      return (
                        <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 font-medium">@{recipientHandle}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${m.contentType === 'audio' ? 'bg-purple-500/20 text-purple-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                              {m.contentType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400 max-w-xs truncate italic">
                            {m.contentType === 'audio' ? '🎙️ Voice Note' : m.content}
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-xs">
                            {new Date(m.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon }: { title: string, value: number, icon: string }) => (
  <div className="glass p-6 rounded-3xl border-white/5">
    <div className="text-2xl mb-2">{icon}</div>
    <div className="text-3xl font-extrabold mb-1">{value}</div>
    <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</div>
  </div>
);

export default Admin;
