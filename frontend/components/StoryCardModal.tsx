import React, { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import { Download, Share2, Sparkles, X, Check, Copy } from 'lucide-react';
import { Message, User, FeedbackLink } from '../types';

interface StoryCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  user: User;
  links: FeedbackLink[];
}

type CardTheme = 'midnight' | 'cyber' | 'sunset' | 'emerald' | 'obsidian';

const THEMES: { id: CardTheme; name: string; bgClass: string; accentColor: string; stickerClass: string }[] = [
  {
    id: 'midnight',
    name: 'Midnight Neon',
    bgClass: 'bg-gradient-to-b from-indigo-950 via-slate-950 to-purple-950',
    accentColor: '#818cf8',
    stickerClass: 'bg-white/10 border-indigo-400/30 text-white'
  },
  {
    id: 'cyber',
    name: 'Cyberpunk',
    bgClass: 'bg-gradient-to-b from-fuchsia-950 via-purple-950 to-pink-950',
    accentColor: '#f472b6',
    stickerClass: 'bg-fuchsia-500/10 border-fuchsia-400/40 text-pink-100'
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    bgClass: 'bg-gradient-to-b from-orange-950 via-rose-950 to-slate-950',
    accentColor: '#fb923c',
    stickerClass: 'bg-orange-500/10 border-orange-400/30 text-orange-100'
  },
  {
    id: 'emerald',
    name: 'Emerald Glass',
    bgClass: 'bg-gradient-to-b from-emerald-950 via-slate-950 to-teal-950',
    accentColor: '#34d399',
    stickerClass: 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100'
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    bgClass: 'bg-gradient-to-b from-neutral-900 via-neutral-950 to-black',
    accentColor: '#e2e8f0',
    stickerClass: 'bg-white/5 border-white/20 text-slate-100'
  }
];

export const StoryCardModal: React.FC<StoryCardModalProps> = ({
  isOpen,
  onClose,
  message,
  user,
  links
}) => {
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>('midnight');
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !message) return null;

  const associatedLink = links.find(l => l.id === message.linkId);
  const promptText = associatedLink?.prompt || "Tell me something you've been meaning to say...";
  const activeTheme = THEMES.find(t => t.id === selectedTheme) || THEMES[0];

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);

    try {
      // Small pause to allow font rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
        quality: 0.98,
        filter: (node) => !node.classList?.contains('ignore-export')
      });

      const link = document.createElement('a');
      link.download = `mirrorme-${user.username}-${message.id}.png`;
      link.href = dataUrl;
      link.click();

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch (err) {
      console.error('Failed to export story card:', err);
      alert('Could not generate image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
        quality: 0.98
      });
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      confetti({
        particleCount: 30,
        spread: 40,
        origin: { y: 0.8 }
      });
    } catch (err) {
      // Fallback: download
      handleDownload();
    }
  };

  const handleNativeShare = async () => {
    if (!cardRef.current) return;
    if (navigator.share) {
      try {
        const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `mirror-${message.id}.png`, { type: 'image/png' });
        await navigator.share({
          title: `Anonymous reflection for @${user.username}`,
          text: `Check out what someone said about me anonymously on MirrorMe!`,
          files: [file]
        });
      } catch (e) {
        // user cancelled or share failed
      }
    } else {
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 z-10 my-auto animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white">Instagram Story Card</h3>
              <p className="text-xs text-slate-400">Export high-resolution 9:16 graphics to share on Instagram & Snapchat</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Card Preview (9:16 aspect ratio container) */}
          <div className="lg:col-span-6 flex justify-center">
            <div 
              ref={cardRef}
              className={`relative w-[300px] h-[533px] sm:w-[324px] sm:h-[576px] rounded-[2.5rem] p-7 flex flex-col justify-between overflow-hidden shadow-2xl border border-white/15 ${activeTheme.bgClass} text-white select-none`}
            >
              {/* Background Glow Orbs */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-white/10 blur-[50px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-white/10 blur-[50px] pointer-events-none" />

              {/* Top Bar: Brand & Handle */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center shadow">
                    <span className="font-extrabold text-xs text-white">M</span>
                  </div>
                  <div>
                    <span className="font-bold text-xs tracking-tight text-white block">MirrorMe</span>
                    <span className="text-[10px] text-slate-400 font-medium block">@{user.username}</span>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-slate-200">
                  Anonymous
                </div>
              </div>

              {/* Middle Section: Prompt & Message */}
              <div className="relative z-10 space-y-4 my-auto">
                {/* Prompt Sticker */}
                <div className="inline-block px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-left max-w-[95%]">
                  <span className="text-[10px] uppercase font-bold text-indigo-300 block mb-0.5">Prompt</span>
                  <p className="text-xs font-semibold text-slate-200 line-clamp-2">
                    "{promptText}"
                  </p>
                </div>

                {/* Message Bubble */}
                <div className={`p-6 rounded-3xl backdrop-blur-xl border shadow-xl ${activeTheme.stickerClass}`}>
                  {message.contentType === 'text' ? (
                    <p className="text-lg sm:text-xl font-bold leading-relaxed whitespace-pre-wrap break-words">
                      "{message.content}"
                    </p>
                  ) : (
                    <div className="space-y-3 py-2 text-center">
                      <div className="w-12 h-12 mx-auto rounded-full bg-white/15 flex items-center justify-center">
                        <span className="text-2xl">🎙️</span>
                      </div>
                      <p className="text-base font-bold">Anonymous Voice Note</p>
                      <div className="flex items-center justify-center gap-1">
                        {[40, 75, 55, 90, 60, 80, 45, 95, 70, 50, 85, 65, 40].map((h, i) => (
                          <div 
                            key={i} 
                            style={{ height: `${h}%` }} 
                            className="w-1 bg-white/70 rounded-full h-8"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Footer: Call-to-action & URL */}
              <div className="relative z-10 pt-4 border-t border-white/10 text-center space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Send me an anonymous reflection
                </p>
                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/15 border border-white/10 backdrop-blur-md font-mono text-[11px] font-bold text-white shadow-inner">
                  <span>mirrorme.app/u/{user.username}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls & Customization */}
          <div className="lg:col-span-6 space-y-6">
            {/* Theme Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                Card Gradient Theme
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                      selectedTheme === theme.id
                        ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div 
                      className="w-4 h-4 rounded-full border border-white/30 shrink-0" 
                      style={{ backgroundColor: theme.accentColor }} 
                    />
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {theme.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Information Callout */}
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed">
              💡 <strong>Pro Tip:</strong> Download this PNG image and post it to your <strong>Instagram Story</strong> or <strong>Snapchat</strong> with a link sticker leading to your Mirror URL!
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/25 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isDownloading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download 9:16 Story Image
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopyImage}
                  className="py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Copy Image</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleNativeShare}
                  className="py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Share2 className="w-4 h-4 text-slate-400" />
                  <span>Share Story</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryCardModal;
