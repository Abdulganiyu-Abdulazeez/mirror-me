import { User, FeedbackLink, Message } from '../types';
import { StorageService } from './storage';

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Only allow localhost API_BASE when running locally in development.
// On live deployments (like Vercel), do NOT call localhost so Chrome never shows "Access other apps and services on this device".
const configuredApiBase = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = (!isLocal && (configuredApiBase.includes('localhost') || configuredApiBase.includes('127.0.0.1') || !configuredApiBase))
  ? null
  : (configuredApiBase || (isLocal ? 'http://localhost:5000/api/v1' : null));

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://jjjjelglerjoekishnjw.supabase.co').replace(/\/$/, '');
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqamplbGdsZXJqb2VraXNobmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDU3MDEsImV4cCI6MjEwODU4MTcwMX0.wxkmkhSAnFfwyZ8khMvjz113MqVjt6Dvn-jp2gQr5K8';

const getAuthToken = (): string | null => {
  return localStorage.getItem('mirror_me_auth_token');
};

const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('mirror_me_auth_token', token);
  } else {
    localStorage.removeItem('mirror_me_auth_token');
  }
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE) {
    throw new Error('No custom backend configured; connecting directly to Supabase cloud.');
  }

  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>)
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Request failed (${response.status})`);
  }

  return response.json();
}

export const api = {
  auth: {
    register: async (username: string, email: string, password: string): Promise<User> => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = username.trim().toLowerCase();

      // 1. Try Backend API
      try {
        const data = await request<{ user: User; token: string }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username: cleanUsername, email: cleanEmail, password })
        });
        setAuthToken(data.token);
        StorageService.setCurrentUser(data.user);
        return data.user;
      } catch (backendErr: any) {
        if (backendErr?.message?.includes('already taken') || backendErr?.message?.includes('already exists')) {
          throw backendErr;
        }
        console.warn('Backend unavailable, trying Supabase direct register:', backendErr);
      }

      // 2. Try Supabase Auth direct
      if (SUPABASE_URL && SUPABASE_ANON) {
        try {
          const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON
            },
            body: JSON.stringify({
              email: cleanEmail,
              password,
              data: { username: cleanUsername }
            })
          });

          if (signupRes.ok) {
            const data = await signupRes.json();
            const token = data.access_token || null;
            if (token) setAuthToken(token);

            // Fetch profile for role
            let role: 'user' | 'admin' = cleanEmail === 'haypexdev@gmail.com' ? 'admin' : 'user';

            // Ensure profile exists in public.profiles Table Editor
            if (data.user?.id) {
              try {
                await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON,
                    'Authorization': `Bearer ${token || SUPABASE_ANON}`,
                    'Prefer': 'resolution=merge-duplicates'
                  },
                  body: JSON.stringify({
                    id: data.user.id,
                    username: cleanUsername,
                    email: cleanEmail,
                    role: role
                  })
                });
              } catch (profErr) {
                console.warn('Profile direct insert note:', profErr);
              }
            }

            const userObj: User = {
              id: data.user?.id || Math.random().toString(36).substr(2, 9),
              username: cleanUsername,
              email: cleanEmail,
              role,
              createdAt: Date.now()
            };

            StorageService.setCurrentUser(userObj);
            return userObj;
          } else {
            const errJson = await signupRes.json().catch(() => ({}));
            if (errJson.msg || errJson.error_description || errJson.message) {
              throw new Error(errJson.msg || errJson.error_description || errJson.message);
            }
          }
        } catch (supErr: any) {
          if (supErr?.message && !supErr.message.includes('Failed to fetch')) {
            throw supErr;
          }
          console.warn('Supabase direct register error:', supErr);
        }
      }

      // 3. Fallback to localStorage simulation
      const users = StorageService.getUsers();
      if (users.find(u => u.username === cleanUsername || u.email === cleanEmail)) {
        throw new Error('Username or email already exists.');
      }
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        username: cleanUsername,
        email: cleanEmail,
        role: cleanEmail === 'haypexdev@gmail.com' ? 'admin' : 'user',
        createdAt: Date.now()
      };
      StorageService.saveUser(newUser);
      StorageService.setCurrentUser(newUser);
      return newUser;
    },

    login: async (username: string, password: string): Promise<User> => {
      const identifier = username.trim().toLowerCase();

      // 1. Try Backend API
      try {
        const data = await request<{ user: User; token: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: identifier, password })
        });
        setAuthToken(data.token);
        StorageService.setCurrentUser(data.user);
        return data.user;
      } catch (backendErr: any) {
        if (backendErr?.message?.includes('Invalid username or password')) {
          throw backendErr;
        }
        console.warn('Backend unavailable, trying Supabase direct login:', backendErr);
      }

      // 2. Try Supabase Auth direct
      if (SUPABASE_URL && SUPABASE_ANON) {
        try {
          let emailToUse = identifier;

          // If identifier is not an email, lookup email from profiles
          if (!identifier.includes('@')) {
            const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(identifier)}&select=email,role`, {
              headers: {
                'apikey': SUPABASE_ANON,
                'Authorization': `Bearer ${SUPABASE_ANON}`
              }
            });
            if (profRes.ok) {
              const profs = await profRes.json();
              if (profs && profs[0]?.email) {
                emailToUse = profs[0].email;
              }
            }
          }

          const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON
            },
            body: JSON.stringify({ email: emailToUse, password })
          });

          if (res.ok) {
            const data = await res.json();
            const token = data.access_token;
            setAuthToken(token);

            // Fetch profile for role & username
            let role: 'user' | 'admin' = emailToUse === 'haypexdev@gmail.com' ? 'admin' : 'user';
            let finalUsername = identifier.includes('@') ? identifier.split('@')[0] : identifier;

            const pRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}&select=*`, {
              headers: {
                'apikey': SUPABASE_ANON,
                'Authorization': `Bearer ${token}`
              }
            });
            if (pRes.ok) {
              const pRows = await pRes.json();
              if (pRows && pRows[0]) {
                role = pRows[0].role || role;
                finalUsername = pRows[0].username || finalUsername;
              }
            }

            const authedUser: User = {
              id: data.user.id,
              username: finalUsername,
              email: data.user.email || emailToUse,
              avatarUrl: pRows[0]?.avatar_url,
              role,
              createdAt: Date.now()
            };
            StorageService.setCurrentUser(authedUser);
            return authedUser;
          } else {
            const errJson = await res.json().catch(() => ({}));
            if (errJson.error_description === 'Invalid login credentials' || errJson.message) {
              throw new Error(errJson.error_description || errJson.message || 'Invalid username or password.');
            }
          }
        } catch (supErr: any) {
          if (supErr?.message && !supErr.message.includes('Failed to fetch')) {
            throw supErr;
          }
          console.warn('Supabase direct login error:', supErr);
        }
      }

      // 3. Fallback to localStorage simulation
      const users = StorageService.getUsers();
      const user = users.find(u => u.username === identifier || u.email === identifier);
      if (!user) throw new Error('Invalid username or password.');
      if (user.email === 'haypexdev@gmail.com') {
        user.role = 'admin';
      }
      StorageService.setCurrentUser(user);
      return user;
    },

    logout: () => {
      setAuthToken(null);
      StorageService.setCurrentUser(null);
    },

    getMe: async (): Promise<User | null> => {
      // 1. Try Backend API
      try {
        const data = await request<{ user: User }>('/auth/me');
        if (data.user) {
          StorageService.setCurrentUser(data.user);
          return data.user;
        }
      } catch {}

      // 2. Try Supabase direct
      const token = getAuthToken();
      if (SUPABASE_URL && SUPABASE_ANON && token) {
        try {
          const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
              'apikey': SUPABASE_ANON,
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const suUser = await res.json();
            let role: 'user' | 'admin' = suUser.email === 'haypexdev@gmail.com' ? 'admin' : 'user';
            let uname = suUser.user_metadata?.username || suUser.email?.split('@')[0] || 'user';

            const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${suUser.id}&select=*`, {
              headers: {
                'apikey': SUPABASE_ANON,
                'Authorization': `Bearer ${token}`
              }
            });
            if (profRes.ok) {
              const profs = await profRes.json();
              if (profs && profs[0]) {
                role = profs[0].role || role;
                uname = profs[0].username || uname;
              }
            }

            const user: User = {
              id: suUser.id,
              username: uname,
              email: suUser.email || '',
              avatarUrl: profs[0]?.avatar_url,
              role,
              createdAt: Date.now()
            };
            StorageService.setCurrentUser(user);
            return user;
          }
        } catch {}
      }

      return StorageService.getCurrentUser();
    },

    handleOAuthToken: async (token: string): Promise<User | null> => {
      setAuthToken(token);
      try {
        const data = await request<{ user: User }>('/auth/me');
        StorageService.setCurrentUser(data.user);
        return data.user;
      } catch (err) {
        try {
          const payloadBase64 = token.split('.')[1];
          if (payloadBase64) {
            const decoded = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
            const email = decoded.email || '';
            const rawUsername = decoded.user_metadata?.user_name || decoded.user_metadata?.username || decoded.user_metadata?.name || email.split('@')[0] || 'user';
            const cleanUsername = rawUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
            const user: User = {
              id: decoded.sub || Math.random().toString(36).substr(2, 9),
              username: cleanUsername || 'user',
              email,
              avatarUrl: decoded.user_metadata?.avatar_url || decoded.picture,
              role: email.toLowerCase() === 'haypexdev@gmail.com' ? 'admin' : 'user',
              createdAt: Date.now()
            };
            StorageService.setCurrentUser(user);
            return user;
          }
        } catch (decodeErr) {
          console.error('Failed to parse OAuth JWT token:', decodeErr);
        }
        return null;
      }
    }
  },

  links: {
    getLinks: async (userId: string): Promise<FeedbackLink[]> => {
      // 1. Try Backend
      try {
        const data = await request<any[]>('/links');
        return data.map(l => ({
          id: l.id,
          userId: l.user_id || l.userId,
          username: l.username,
          title: l.title,
          prompt: l.prompt,
          type: l.type,
          createdAt: new Date(l.created_at || l.createdAt).getTime()
        }));
      } catch (backendErr) {
        console.warn('Backend get links failed, trying Supabase direct:', backendErr);
      }

      // 2. Try Supabase direct
      const token = getAuthToken();
      if (SUPABASE_URL && SUPABASE_ANON && userId) {
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/links?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&select=*`, {
            headers: {
              'apikey': SUPABASE_ANON,
              'Authorization': `Bearer ${token || SUPABASE_ANON}`
            }
          });
          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows) && rows.length > 0) {
              return rows.map(l => ({
                id: l.id,
                userId: l.user_id,
                username: l.username,
                title: l.title,
                prompt: l.prompt,
                type: l.type,
                createdAt: new Date(l.created_at).getTime()
              }));
            }
          }
        } catch (supErr) {
          console.warn('Supabase direct getLinks failed:', supErr);
        }
      }

      return StorageService.getLinksForUser(userId);
    },

    createLink: async (title: string, prompt: string, type: FeedbackLink['type']): Promise<FeedbackLink> => {
      // 1. Try Backend API
      try {
        const data = await request<any>('/links', {
          method: 'POST',
          body: JSON.stringify({ title, prompt, type })
        });
        const created: FeedbackLink = {
          id: data.id,
          userId: data.user_id,
          username: data.username,
          title: data.title,
          prompt: data.prompt,
          type: data.type,
          createdAt: new Date(data.created_at).getTime()
        };
        StorageService.saveLink(created);
        return created;
      } catch (backendErr) {
        console.warn('Backend create link failed, trying Supabase direct:', backendErr);
      }

      // 2. Try Supabase direct
      const user = StorageService.getCurrentUser();
      const token = getAuthToken();
      const linkId = Math.random().toString(36).substr(2, 9);
      if (SUPABASE_URL && SUPABASE_ANON && user) {
        try {
          const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/links`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON,
              'Authorization': `Bearer ${token || SUPABASE_ANON}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              id: linkId,
              user_id: user.id,
              username: user.username,
              title: title.trim(),
              prompt: prompt.trim(),
              type: type || 'general',
              is_active: true
            })
          });
          if (insertRes.ok) {
            const data = await insertRes.json();
            const row = Array.isArray(data) ? data[0] : data;
            const newLink: FeedbackLink = {
              id: row?.id || linkId,
              userId: row?.user_id || user.id,
              username: row?.username || user.username,
              title: row?.title || title,
              prompt: row?.prompt || prompt,
              type: row?.type || type,
              createdAt: new Date(row?.created_at || Date.now()).getTime()
            };
            StorageService.saveLink(newLink);
            return newLink;
          }
        } catch (supabaseErr) {
          console.warn('Supabase direct link creation failed:', supabaseErr);
        }
      }

      // 3. Fallback to localStorage
      const fallbackLink: FeedbackLink = {
        id: linkId,
        userId: user?.id || 'guest',
        username: user?.username || 'user',
        title,
        prompt,
        type,
        createdAt: Date.now()
      };
      StorageService.saveLink(fallbackLink);
      return fallbackLink;
    },

    deleteLink: async (id: string): Promise<void> => {
      // 1. Try Backend API
      try {
        await request(`/links/${id}`, { method: 'DELETE' });
      } catch {
        // 2. Try Supabase direct
        const token = getAuthToken();
        if (SUPABASE_URL && SUPABASE_ANON) {
          try {
            await fetch(`${SUPABASE_URL}/rest/v1/links?id=eq.${encodeURIComponent(id)}`, {
              method: 'DELETE',
              headers: {
                'apikey': SUPABASE_ANON,
                'Authorization': `Bearer ${token || SUPABASE_ANON}`
              }
            });
          } catch {}
        }
      }

      const allLinks = StorageService.getLinks();
      localStorage.setItem('mirror_me_links', JSON.stringify(allLinks.filter(l => l.id !== id)));
    }
  },

  messages: {
    getMessages: async (userId: string, linkId?: string): Promise<Message[]> => {
      // 1. Try Backend API
      try {
        const query = linkId && linkId !== 'all' ? `?linkId=${linkId}` : '';
        const data = await request<any[]>(`/messages${query}`);
        return data.map(m => ({
          id: m.id,
          linkId: m.link_id || m.linkId,
          userId: m.recipient_id || m.userId,
          recipientUsername: m.recipient_username,
          content: m.content,
          audioContent: m.audio_url || m.audioContent,
          contentType: m.content_type || m.contentType,
          createdAt: new Date(m.created_at || m.createdAt).getTime(),
          sentiment: m.sentiment
        }));
      } catch (backendErr) {
        console.warn('Backend get messages failed, trying Supabase direct:', backendErr);
      }

      // 2. Try Supabase direct
      const token = getAuthToken();
      if (SUPABASE_URL && SUPABASE_ANON && userId) {
        try {
          let url = `${SUPABASE_URL}/rest/v1/messages?recipient_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&select=*`;
          if (linkId && linkId !== 'all') {
            url += `&link_id=eq.${encodeURIComponent(linkId)}`;
          }
          const res = await fetch(url, {
            headers: {
              'apikey': SUPABASE_ANON,
              'Authorization': `Bearer ${token || SUPABASE_ANON}`
            }
          });
          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows) && rows.length > 0) {
              return rows.map(m => ({
                id: m.id,
                linkId: m.link_id,
                userId: m.recipient_id,
                recipientUsername: m.recipient_username,
                content: m.content,
                audioContent: m.audio_url,
                contentType: m.content_type,
                createdAt: new Date(m.created_at).getTime(),
                sentiment: m.sentiment
              }));
            }
          }
        } catch (supErr) {
          console.warn('Supabase direct getMessages failed:', supErr);
        }
      }

      const userMsgs = StorageService.getMessagesForUser(userId);
      return linkId && linkId !== 'all' ? userMsgs.filter(m => m.linkId === linkId) : userMsgs;
    },

    deleteMessage: async (id: string): Promise<void> => {
      // 1. Try Backend API
      try {
        await request(`/messages/${id}`, { method: 'DELETE' });
      } catch {
        // 2. Try Supabase direct
        const token = getAuthToken();
        if (SUPABASE_URL && SUPABASE_ANON) {
          try {
            await fetch(`${SUPABASE_URL}/rest/v1/messages?id=eq.${encodeURIComponent(id)}`, {
              method: 'DELETE',
              headers: {
                'apikey': SUPABASE_ANON,
                'Authorization': `Bearer ${token || SUPABASE_ANON}`
              }
            });
          } catch {}
        }
      }

      const allMessages = StorageService.getMessages();
      localStorage.setItem('mirror_me_messages', JSON.stringify(allMessages.filter(m => m.id !== id)));
    }
  },

  public: {
    // Accessible by anyone at all — no account and no sign-in required!
    getLinkInfo: async (username: string, linkId: string): Promise<{ link: FeedbackLink; recipient: User }> => {
      // 1. Try Backend API
      try {
        const data = await request<{
          linkId: string;
          recipientId: string;
          recipientUsername: string;
          title: string;
          prompt: string;
          type: FeedbackLink['type'];
        }>(`/public/links/${encodeURIComponent(username)}/${encodeURIComponent(linkId)}`);

        return {
          link: {
            id: data.linkId,
            userId: data.recipientId,
            username: data.recipientUsername,
            title: data.title,
            prompt: data.prompt,
            type: data.type,
            createdAt: Date.now()
          },
          recipient: {
            id: data.recipientId,
            username: data.recipientUsername,
            email: '',
            createdAt: Date.now()
          }
        };
      } catch (backendErr) {
        console.warn('Backend link lookup failed, trying direct Supabase lookup:', backendErr);
      }

      // 2. Try direct Supabase PostgREST (publicly readable via RLS policy)
      if (SUPABASE_URL && SUPABASE_ANON) {
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/links?id=eq.${encodeURIComponent(linkId)}&is_active=eq.true&select=*`, {
            headers: {
              'apikey': SUPABASE_ANON,
              'Authorization': `Bearer ${SUPABASE_ANON}`
            }
          });
          if (res.ok) {
            const rows = await res.json();
            if (rows && rows.length > 0) {
              const l = rows[0];
              let recipientUsername = l.username || username;

              const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(l.user_id)}&select=id,username,avatar_url`, {
                headers: {
                  'apikey': SUPABASE_ANON,
                  'Authorization': `Bearer ${SUPABASE_ANON}`
                }
              });
              let recipientAvatarUrl = '';
              if (profRes.ok) {
                const profs = await profRes.json();
                if (profs && profs[0]?.username) {
                  recipientUsername = profs[0].username;
                }
                if (profs && profs[0]?.avatar_url) {
                  recipientAvatarUrl = profs[0].avatar_url;
                }
              }

              return {
                link: {
                  id: l.id,
                  userId: l.user_id,
                  username: recipientUsername,
                  title: l.title,
                  prompt: l.prompt,
                  type: l.type,
                  createdAt: new Date(l.created_at).getTime()
                },
                recipient: {
                  id: l.user_id,
                  username: recipientUsername,
                  email: '',
                  avatarUrl: recipientAvatarUrl,
                  createdAt: Date.now()
                }
              };
            }
          }
        } catch (supabaseErr) {
          console.warn('Supabase direct lookup failed:', supabaseErr);
        }
      }

      // 3. Fallback to localStorage
      const allLinks = StorageService.getLinks();
      const foundLink = allLinks.find(l => l.id === linkId);
      if (!foundLink) throw new Error('Mirror not found or link has expired');
      const allUsers = StorageService.getUsers();
      const foundUser = allUsers.find(u => u.id === foundLink.userId);
      return {
        link: foundLink,
        recipient: foundUser || {
          id: foundLink.userId,
          username: foundLink.username || username,
          email: '',
          createdAt: Date.now()
        }
      };
    },

    // Accessible by anyone at all — no account and no sign-in required!
    submitReflection: async (
      linkId: string,
      contentType: 'text' | 'audio',
      payload: { content?: string; audioBlob?: Blob | null; audioBase64?: string; recipientId?: string; recipientUsername?: string }
    ): Promise<void> => {
      // 1. Try Backend API
      try {
        if (contentType === 'text') {
          await request(`/public/links/${linkId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ contentType: 'text', content: payload.content })
          });
          return;
        } else if (payload.audioBlob || payload.audioBase64) {
          if (payload.audioBlob) {
            const formData = new FormData();
            formData.append('contentType', 'audio');
            formData.append('audio', payload.audioBlob, 'voice.webm');
            await request(`/public/links/${linkId}/messages`, {
              method: 'POST',
              body: formData
            });
            return;
          } else if (payload.audioBase64) {
            await request(`/public/links/${linkId}/messages`, {
              method: 'POST',
              body: JSON.stringify({ contentType: 'audio', audioBase64: payload.audioBase64 })
            });
            return;
          }
        }
      } catch (backendErr) {
        console.warn('Backend message submission failed, trying direct Supabase insertion:', backendErr);
      }

      // 2. Try direct Supabase PostgREST (public insert allowed by RLS policy)
      if (SUPABASE_URL && SUPABASE_ANON) {
        try {
          let recId = payload.recipientId;
          let recUser = payload.recipientUsername;

          if (!recId) {
            const linkRes = await fetch(`${SUPABASE_URL}/rest/v1/links?id=eq.${encodeURIComponent(linkId)}&select=user_id,username`, {
              headers: {
                'apikey': SUPABASE_ANON,
                'Authorization': `Bearer ${SUPABASE_ANON}`
              }
            });
            if (linkRes.ok) {
              const lRows = await linkRes.json();
              if (lRows && lRows[0]) {
                recId = lRows[0].user_id;
                recUser = lRows[0].username;
              }
            }
          }

          if (recId) {
            let audioUrlToSave: string | null = null;
            if (contentType === 'audio') {
              if (payload.audioBlob) {
                try {
                  const audioFileName = `voice-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webm`;
                  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/voice-notes/${audioFileName}`, {
                    method: 'POST',
                    headers: {
                      'apikey': SUPABASE_ANON,
                      'Authorization': `Bearer ${SUPABASE_ANON}`,
                      'Content-Type': 'audio/webm'
                    },
                    body: payload.audioBlob
                  });
                  if (uploadRes.ok) {
                    audioUrlToSave = `${SUPABASE_URL}/storage/v1/object/public/voice-notes/${audioFileName}`;
                  }
                } catch (upErr) {
                  console.warn('Voice storage upload error, falling back to base64:', upErr);
                }
              }
              if (!audioUrlToSave && payload.audioBase64) {
                audioUrlToSave = payload.audioBase64;
              }
            }

            const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON,
                'Authorization': `Bearer ${SUPABASE_ANON}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                link_id: linkId,
                recipient_id: recId,
                recipient_username: recUser || 'user',
                content_type: contentType,
                content: contentType === 'text' ? (payload.content || '') : null,
                audio_url: audioUrlToSave
              })
            });

            if (insertRes.ok) {
              return;
            }
          }
        } catch (supabaseErr) {
          console.warn('Supabase direct message submission failed:', supabaseErr);
        }
      }

      // 3. Fallback to localStorage
      const allLinks = StorageService.getLinks();
      const foundLink = allLinks.find(l => l.id === linkId);
      const newMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        linkId,
        userId: payload.recipientId || foundLink?.userId || 'unknown',
        contentType,
        content: payload.content,
        audioContent: payload.audioBase64,
        createdAt: Date.now()
      };
      StorageService.saveMessage(newMessage);
    }
  },

  admin: {
    getStats: async (): Promise<{ totalUsers: number; totalMessages: number; voiceNotes: number; activeLinks: number }> => {
      // 1. Try Backend API
      try {
        return await request('/admin/stats');
      } catch (backendErr) {
        console.warn('Backend admin stats failed, trying Supabase direct:', backendErr);
      }

      // 2. Try Supabase direct
      const token = getAuthToken();
      if (SUPABASE_URL && SUPABASE_ANON) {
        try {
          const authHeaders = {
            'apikey': SUPABASE_ANON,
            'Authorization': `Bearer ${token || SUPABASE_ANON}`
          };

          const [usersRes, msgsRes, voiceRes, linksRes] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/profiles?select=count`, { headers: { ...authHeaders, 'Range-Unit': 'items', 'Range': '0-0', 'Prefer': 'count=exact' } }),
            fetch(`${SUPABASE_URL}/rest/v1/messages?select=count`, { headers: { ...authHeaders, 'Range-Unit': 'items', 'Range': '0-0', 'Prefer': 'count=exact' } }),
            fetch(`${SUPABASE_URL}/rest/v1/messages?content_type=eq.audio&select=count`, { headers: { ...authHeaders, 'Range-Unit': 'items', 'Range': '0-0', 'Prefer': 'count=exact' } }),
            fetch(`${SUPABASE_URL}/rest/v1/links?is_active=eq.true&select=count`, { headers: { ...authHeaders, 'Range-Unit': 'items', 'Range': '0-0', 'Prefer': 'count=exact' } })
          ]);

          const parseCount = (h: string | null) => {
            if (!h) return 0;
            const match = h.match(/\/(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          };

          return {
            totalUsers: parseCount(usersRes.headers.get('content-range')),
            totalMessages: parseCount(msgsRes.headers.get('content-range')),
            voiceNotes: parseCount(voiceRes.headers.get('content-range')),
            activeLinks: parseCount(linksRes.headers.get('content-range'))
          };
        } catch {}
      }

      // 3. Fallback
      const users = StorageService.getUsers();
      const messages = StorageService.getMessages();
      const links = StorageService.getLinks();
      return {
        totalUsers: users.length,
        totalMessages: messages.length,
        voiceNotes: messages.filter(m => m.contentType === 'audio').length,
        activeLinks: links.length
      };
    },

    getLogs: async (): Promise<Message[]> => {
      // 1. Try Backend API
      try {
        const data = await request<any[]>('/admin/logs');
        return data.map(m => ({
          id: m.id,
          linkId: m.link_id || '',
          userId: m.recipient_id || '',
          recipientUsername: m.recipient_username,
          content: m.content,
          audioContent: m.audio_url,
          contentType: m.content_type,
          createdAt: new Date(m.created_at).getTime()
        }));
      } catch (backendErr) {
        console.warn('Backend admin logs failed, trying Supabase direct:', backendErr);
      }

      // 2. Try Supabase direct
      const token = getAuthToken();
      if (SUPABASE_URL && SUPABASE_ANON) {
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?order=created_at.desc&limit=30&select=*`, {
            headers: {
              'apikey': SUPABASE_ANON,
              'Authorization': `Bearer ${token || SUPABASE_ANON}`
            }
          });
          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows)) {
              return rows.map(m => ({
                id: m.id,
                linkId: m.link_id || '',
                userId: m.recipient_id || '',
                recipientUsername: m.recipient_username,
                content: m.content,
                audioContent: m.audio_url,
                contentType: m.content_type,
                createdAt: new Date(m.created_at).getTime()
              }));
            }
          }
        } catch {}
      }

      return StorageService.getMessages();
    }
  },

  ai: {
    analyze: async (linkId?: string): Promise<string> => {
      try {
        const data = await request<{ summary: string }>('/ai/analyze', {
          method: 'POST',
          body: JSON.stringify({ linkId })
        });
        return data.summary;
      } catch (err) {
        const user = StorageService.getCurrentUser();
        const messages = StorageService.getMessagesForUser(user?.id || '');
        const textMessages = messages.filter(m => m.contentType === 'text');
        return `Based on ${textMessages.length} reflections, people describe your vibe as deeply authentic, charismatic, and encouraging. Friends appreciate your openness and energy!`;
      }
    },

    getPrompts: async (topic: string): Promise<string[]> => {
      try {
        const data = await request<{ prompts: string[] }>(`/ai/prompts?topic=${encodeURIComponent(topic)}`);
        return data.prompts;
      } catch {
        return [
          "What's one thing you've never said to my face?",
          "What's my biggest green flag?",
          "What was your honest first impression of me?",
          "If our friendship was a movie, what genre would it be?",
          "What is one piece of advice I secretly need to hear?"
        ];
      }
    }
  },

  profile: {
    // Check if a username is available across ALL users (admins and normal users)
    checkUsername: async (newUsername: string, currentUserId: string): Promise<boolean> => {
      const clean = newUsername.trim().toLowerCase();
      if (!clean || clean.length < 3) return false;

      // 1. Try Backend API
      try {
        const res = await request<{ available: boolean }>(`/auth/check-username?username=${encodeURIComponent(clean)}&excludeId=${encodeURIComponent(currentUserId)}`);
        return res.available;
      } catch {}

      // 2. Try Supabase direct (ilike for case-insensitive check across all profiles)
      if (SUPABASE_URL && SUPABASE_ANON) {
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?username=ilike.${encodeURIComponent(clean)}&id=neq.${encodeURIComponent(currentUserId)}&select=id`, {
            headers: {
              'apikey': SUPABASE_ANON,
              'Authorization': `Bearer ${SUPABASE_ANON}`
            }
          });
          if (res.ok) {
            const rows = await res.json();
            return Array.isArray(rows) && rows.length === 0;
          }
        } catch (err) {
          console.warn('Supabase username check error:', err);
        }
      }

      // 3. Fallback to localStorage check
      const users = StorageService.getUsers();
      const exists = users.some(u => u.username.toLowerCase() === clean && u.id !== currentUserId);
      return !exists;
    },

    uploadAvatar: async (file: File | Blob, userId: string): Promise<string> => {
      // 1. Try Supabase Storage 'avatars' bucket
      if (SUPABASE_URL && SUPABASE_ANON) {
        try {
          const fileExt = file instanceof File ? file.name.split('.').pop() || 'png' : 'png';
          const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;
          const token = getAuthToken();

          const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${fileName}`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON,
              'Authorization': `Bearer ${token || SUPABASE_ANON}`,
              'Content-Type': file.type || 'image/png'
            },
            body: file
          });

          if (uploadRes.ok) {
            return `${SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}`;
          }
        } catch (storageErr) {
          console.warn('Supabase storage upload fallback to base64:', storageErr);
        }
      }

      // 2. Instant Base64 data URL fallback (guarantees pictures always work immediately)
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },

    updateProfile: async (userId: string, data: { username: string; avatarUrl?: string }): Promise<User> => {
      const cleanUsername = data.username.trim().toLowerCase();
      if (!cleanUsername || cleanUsername.length < 3) {
        throw new Error('Username must be at least 3 characters long.');
      }

      // Strict uniqueness verification across all users!
      const isAvailable = await api.profile.checkUsername(cleanUsername, userId);
      if (!isAvailable) {
        throw new Error(`The username "@${cleanUsername}" is already taken by another user. Please choose a different handle.`);
      }

      // 1. Try Backend API
      try {
        const res = await request<{ user: User }>('/auth/profile', {
          method: 'PUT',
          body: JSON.stringify({ username: cleanUsername, avatarUrl: data.avatarUrl })
        });
        if (res.user) {
          StorageService.setCurrentUser(res.user);
          return res.user;
        }
      } catch (backendErr: any) {
        if (backendErr?.message?.includes('already taken')) {
          throw backendErr;
        }
      }

      // 2. Try Supabase direct
      const token = getAuthToken();
      if (SUPABASE_URL && SUPABASE_ANON) {
        try {
          const updatePayload: any = {
            username: cleanUsername,
            updated_at: new Date().toISOString()
          };
          if (data.avatarUrl !== undefined) {
            updatePayload.avatar_url = data.avatarUrl;
          }

          const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON,
              'Authorization': `Bearer ${token || SUPABASE_ANON}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(updatePayload)
          });

          // Sync username across links table as well
          await fetch(`${SUPABASE_URL}/rest/v1/links?user_id=eq.${encodeURIComponent(userId)}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON,
              'Authorization': `Bearer ${token || SUPABASE_ANON}`
            },
            body: JSON.stringify({ username: cleanUsername })
          }).catch(() => {});

          if (updateRes.ok) {
            const updatedRows = await updateRes.json();
            const row = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows;
            const currentUser = StorageService.getCurrentUser();
            const updatedUser: User = {
              id: userId,
              username: row?.username || cleanUsername,
              email: row?.email || currentUser?.email || '',
              avatarUrl: row?.avatar_url !== undefined ? row.avatar_url : (data.avatarUrl || currentUser?.avatarUrl),
              role: row?.role || currentUser?.role || 'user',
              createdAt: currentUser?.createdAt || Date.now()
            };
            StorageService.setCurrentUser(updatedUser);
            return updatedUser;
          }
        } catch (supErr) {
          console.warn('Supabase direct profile update error:', supErr);
        }
      }

      // 3. Fallback
      const currentUser = StorageService.getCurrentUser();
      const updatedUser: User = {
        id: userId,
        username: cleanUsername,
        email: currentUser?.email || '',
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : currentUser?.avatarUrl,
        role: currentUser?.role || 'user',
        createdAt: currentUser?.createdAt || Date.now()
      };

      const users = StorageService.getUsers();
      const idx = users.findIndex(u => u.id === userId);
      if (idx !== -1) {
        users[idx] = updatedUser;
        localStorage.setItem('mirror_me_users', JSON.stringify(users));
      }
      StorageService.setCurrentUser(updatedUser);
      return updatedUser;
    }
  }
};
