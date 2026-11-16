import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { StorageService } from '../services/storage';
import { FeedbackLink, User, Message } from '../types';
import AudioPlayer from '../components/AudioPlayer';

const PublicSubmission: React.FC = () => {
  const { username, linkId, slug } = useParams<{ username?: string; linkId?: string; slug?: string }>();
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState<FeedbackLink | null>(null);
  const [recipient, setRecipient] = useState<User | null>(null);
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<'text' | 'audio'>('text');
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchLinkData = async () => {
      const targetParam = slug || linkId;
      if (!targetParam) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { link: fetchedLink, recipient: fetchedRecipient } = await api.public.getLinkInfo(username || targetParam, linkId);
        if (isMounted) {
          setLink(fetchedLink);
          setRecipient(fetchedRecipient);
        }
      } catch (err) {
        console.warn('Could not load mirror link via API, checking local storage:', err);
        const allLinks = StorageService.getLinks();
        const found = allLinks.find(l => l.id === targetParam || l.slug === targetParam);
        if (found && isMounted) {
          setLink(found);
          const allUsers = StorageService.getUsers();
          const u = allUsers.find(user => user.id === found.userId);
          setRecipient(u || {
            id: found.userId,
            username: found.username || username || 'recipient',
            email: '',
            createdAt: Date.now()
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLinkData();
    return () => {
      isMounted = false;
    };
  }, [username, linkId, slug]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 29) { // 30 second limit
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      alert("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link || !recipient) return;
    
    setIsSubmitting(true);

    try {
      if (contentType === 'text') {
        if (!content.trim()) {
          setIsSubmitting(false);
          return;
        }
        await api.public.submitReflection(link.id, 'text', {
          content: content.trim(),
          recipientId: recipient.id,
          recipientUsername: recipient.username
        });
      } else if (contentType === 'audio') {
        if (!audioBlob) {
          setIsSubmitting(false);
          return;
        }
        const audioBase64 = await blobToBase64(audioBlob);
        await api.public.submitReflection(link.id, 'audio', {
          audioBlob,
          audioBase64,
          recipientId: recipient.id,
          recipientUsername: recipient.username
        });
      }

      setIsSubmitting(false);
      setSubmitted(true);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      console.error('Submission error:', err);
      alert(err.message || 'Failed to submit reflection. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Opening mirror...</p>
      </div>
    );
  }

  if (!link || !recipient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Mirror Not Found</h2>
        <p className="text-slate-400 mb-8">This link might be broken or the mirror has been shattered.</p>
        <Link to="/" className="text-indigo-400 font-bold hover:underline">Go to Home Page</Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-8 animate-bounce">
          <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-4xl font-extrabold mb-4">Mirror Updated!</h2>
        <p className="text-xl text-slate-400 mb-12">Your {contentType === 'text' ? 'message' : 'voice note'} was sent anonymously to @{recipient.username}.</p>
        
        <div className="glass p-8 rounded-3xl max-w-md w-full space-y-6">
          <h3 className="text-xl font-bold">Get your own mirror link?</h3>
          <p className="text-slate-400 text-sm">See what people really think about you. It's free and anonymous.</p>
          <Link 
            to="/register" 
            className="block w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/30"
          >
            Create My Account
          </Link>
          <button 
            onClick={() => {
              setSubmitted(false);
              setContent('');
              setAudioBlob(null);
              setAudioUrl(null);
            }}
            className="text-sm text-slate-500 hover:text-white"
          >
            Send another reflection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 pt-24">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-500 to-purple-500 mx-auto mb-6 flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-white/10">
            {recipient.avatarUrl ? (
              <img src={recipient.avatarUrl} alt={recipient.username} className="w-full h-full object-cover" />
            ) : (
              recipient.username[0]?.toUpperCase() || 'M'
            )}
          </div>
          <h2 className="text-3xl font-extrabold mb-2">@{recipient.username}</h2>
          <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 uppercase tracking-widest font-bold">
            {link.title}
          </div>
        </div>

        <div className="glass p-8 rounded-[2.5rem] border-white/10 shadow-2xl relative">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-indigo-500/5 blur-[60px] rounded-full pointer-events-none" />

          {/* Type Toggle */}
          <div className="flex bg-white/5 p-1 rounded-2xl mb-6 relative z-10 border border-white/5">
            <button 
              onClick={() => setContentType('text')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${contentType === 'text' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Text
            </button>
            <button 
              onClick={() => setContentType('audio')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${contentType === 'audio' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              Voice Note
            </button>
          </div>

          <h3 className="text-xl font-bold mb-6 relative z-10 text-center italic text-slate-300">"{link.prompt}"</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {contentType === 'text' ? (
              <div className="space-y-2">
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={500}
                  placeholder="Type something honest..."
                  className="w-full h-48 bg-white/5 border border-white/10 rounded-2xl p-6 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-inner text-white"
                  required
                  disabled={isSubmitting}
                />
                <div className="text-right text-[11px] font-mono text-slate-400">
                  {content.length} / 500 characters
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 bg-white/5 border border-white/10 rounded-2xl p-6 border-dashed">
                {!audioUrl ? (
                  <>
                    {isRecording ? (
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-red-500/50">
                          <div className="w-6 h-6 bg-white rounded-sm" />
                        </div>
                        <div className="text-xl font-mono font-bold text-red-500">00:{recordingTime.toString().padStart(2, '0')}</div>
                        <button 
                          type="button"
                          onClick={stopRecording}
                          className="px-6 py-2 bg-white/10 rounded-full text-sm font-bold hover:bg-white/20 transition-all"
                        >
                          Stop Recording
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-4">
                        <button 
                          type="button"
                          onClick={startRecording}
                          className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30 group"
                        >
                          <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </button>
                        <p className="text-slate-400 text-sm font-medium">Click to record (max 30s)</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center space-y-4 w-full px-2">
                    <AudioPlayer src={audioUrl} />
                    <button 
                      type="button"
                      onClick={() => {
                        setAudioBlob(null);
                        setAudioUrl(null);
                      }}
                      className="text-xs text-slate-400 hover:text-red-400 font-bold transition-colors underline"
                    >
                      Delete and re-record
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <button 
              type="submit"
              disabled={isSubmitting || (contentType === 'text' && !content.trim()) || (contentType === 'audio' && !audioBlob)}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Mirroring...
                </>
              ) : (
                <>
                  Send Anonymous Reflection
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </>
              )}
            </button>
          </form>
          
          <p className="text-center text-[10px] text-slate-500 mt-6 uppercase tracking-widest font-bold">
            🔒 Anonymous encryption active
          </p>
        </div>

        <p className="text-center text-slate-500 text-sm">
          Keep it real. Keep it kind. <br />
          <span className="text-xs opacity-60">All messages are stored securely and privately.</span>
        </p>
      </div>
    </div>
  );
};

export default PublicSubmission;
