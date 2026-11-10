import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { 
  User as UserIcon, 
  Camera, 
  Check, 
  X, 
  AlertCircle, 
  ArrowLeft, 
  Trash2, 
  ShieldCheck, 
  Sparkles,
  Loader2
} from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

interface ProfileProps {
  user: User;
  setUser: (user: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, setUser }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(user.username);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  // Username validation & availability
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'current' | 'available' | 'taken' | 'invalid'>('current');
  const [usernameMessage, setUsernameMessage] = useState<string>('');

  // Save states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state if user prop changes
  useEffect(() => {
    setUsername(user.username);
    setAvatarPreview(user.avatarUrl || null);
  }, [user]);

  // Debounced username availability check
  useEffect(() => {
    const clean = username.trim().toLowerCase();

    if (!clean || clean.length < 3) {
      setUsernameStatus('invalid');
      setUsernameMessage('Username must be at least 3 characters.');
      return;
    }

    if (clean === user.username.toLowerCase()) {
      setUsernameStatus('current');
      setUsernameMessage('Your current handle.');
      return;
    }

    // Only allow alphanumeric and underscore
    if (!/^[a-z0-9_]+$/.test(clean)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Only letters, numbers, and underscores allowed.');
      return;
    }

    setIsCheckingUsername(true);
    setUsernameStatus('invalid');
    setUsernameMessage('Checking availability...');

    const timer = setTimeout(async () => {
      try {
        const available = await api.profile.checkUsername(clean, user.id);
        if (available) {
          setUsernameStatus('available');
          setUsernameMessage(`@${clean} is available!`);
        } else {
          setUsernameStatus('taken');
          setUsernameMessage(`@${clean} is already taken by another user.`);
        }
      } catch (err) {
        setUsernameStatus('available');
        setUsernameMessage('Available');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, user.id, user.username]);

  // Handle Photo Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB limit.');
      return;
    }

    setAvatarFile(file);
    setAvatarRemoved(false);

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Remove Photo
  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Form Submit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMessage('Username must be at least 3 characters.');
      return;
    }

    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      setErrorMessage(usernameMessage || 'Please choose an available username.');
      return;
    }

    setIsSaving(true);

    try {
      let finalAvatarUrl = avatarPreview;

      // If user uploaded a new photo file, upload it
      if (avatarFile) {
        finalAvatarUrl = await api.profile.uploadAvatar(avatarFile, user.id);
      } else if (avatarRemoved) {
        finalAvatarUrl = '';
      }

      const updatedUser = await api.profile.updateProfile(user.id, {
        username: cleanUsername,
        avatarUrl: finalAvatarUrl || undefined
      });

      setUser(updatedUser);
      setIsSaving(false);
      setSaveSuccess(true);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });

      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setIsSaving(false);
      setErrorMessage(err.message || 'Failed to update profile. Please try again.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 pt-28 pb-16">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between mb-8">
        <Link 
          to="/dashboard" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>
        <span className="text-xs uppercase tracking-widest font-bold text-slate-500">Account Settings</span>
      </div>

      <header className="mb-10">
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-2">My Profile</h2>
        <p className="text-slate-400 text-sm">
          Personalize your handle and avatar across MirrorMe. Friends will see your avatar and handle on your mirror links.
        </p>
      </header>

      {/* Notifications */}
      {saveSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-semibold flex items-center gap-3 animate-fade-in shadow-lg shadow-green-500/5">
          <Check className="w-5 h-5 text-green-400 shrink-0" />
          <span>Profile updated successfully! Your mirror links and handle are updated.</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold flex items-center gap-3 animate-fade-in shadow-lg shadow-red-500/5">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Profile Picture Card */}
        <div className="glass p-6 sm:p-8 rounded-[2rem] border-white/10 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            Profile Picture
          </h3>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar Circle */}
            <div className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-xl border-4 border-white/10 ring-4 ring-indigo-500/20">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt={user.username} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-4xl font-extrabold uppercase">
                    {username[0] || user.username[0] || 'U'}
                  </span>
                )}
              </div>

              {/* Overlay button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                Change
              </button>
            </div>

            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/png,image/jpeg,image/webp,image/gif" 
              className="hidden" 
              onChange={handleFileChange}
            />

            {/* Actions & Advice */}
            <div className="space-y-3 text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition-all active:scale-95"
                >
                  Upload New Photo
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-slate-300 hover:text-red-400 font-semibold text-sm transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Supports JPG, PNG, or WebP. Max file size: 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Username & Identity Card */}
        <div className="glass p-6 sm:p-8 rounded-[2rem] border-white/10 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-purple-400" />
            Identity & Username
          </h3>

          <div className="space-y-5">
            {/* Username Input with Live Availability Check */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Mirror Handle (Username)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold select-none text-base">
                  @
                </span>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="your_handle"
                  maxLength={25}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-9 pr-12 py-3.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                  {isCheckingUsername ? (
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  ) : usernameStatus === 'available' ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : usernameStatus === 'taken' ? (
                    <X className="w-5 h-5 text-red-400" />
                  ) : null}
                </div>
              </div>

              {/* Status Message */}
              <div className="mt-2 text-xs flex items-center gap-1.5">
                {usernameStatus === 'available' ? (
                  <span className="text-green-400 font-medium">✓ {usernameMessage}</span>
                ) : usernameStatus === 'taken' ? (
                  <span className="text-red-400 font-medium">✗ {usernameMessage}</span>
                ) : usernameStatus === 'current' ? (
                  <span className="text-slate-400">{usernameMessage}</span>
                ) : (
                  <span className="text-slate-400">{usernameMessage}</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Your public mirror link will be: <span className="font-mono text-indigo-400">/#/u/{username || 'username'}/...</span>
              </p>
            </div>

            {/* Email Address (Read-Only) */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Registered Email
              </label>
              <div className="flex items-center justify-between bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3.5 text-slate-400 text-sm">
                <span>{user.email || 'No email attached'}</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Primary
                </span>
              </div>
            </div>

            {/* Account Role */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Account Status
              </label>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  user.role === 'admin' 
                    ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300' 
                    : 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300'
                }`}>
                  <Sparkles className="w-3 h-3" />
                  {user.role === 'admin' ? 'Administrator' : 'Standard Member'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <Link
            to="/dashboard"
            className="px-6 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-sm transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving || isCheckingUsername || usernameStatus === 'taken' || usernameStatus === 'invalid'}
            className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2 active:scale-95"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;

