import { User, FeedbackLink, Message } from '../types';
import { StorageService } from './storage';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

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
      try {
        const data = await request<{ user: User; token: string }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, email, password })
        });
        setAuthToken(data.token);
        StorageService.setCurrentUser(data.user);
        return data.user;
      } catch (err) {
        console.warn('Backend unavailable, falling back to local simulation:', err);
        const users = StorageService.getUsers();
        if (users.find(u => u.username === username.toLowerCase() || u.email === email)) {
          throw new Error('Username or email already exists.');
        }
        const newUser: User = {
          id: Math.random().toString(36).substr(2, 9),
          username: username.toLowerCase(),
          email,
          createdAt: Date.now()
        };
        StorageService.saveUser(newUser);
        StorageService.setCurrentUser(newUser);
        return newUser;
      }
    },

    login: async (username: string, password: string): Promise<User> => {
      try {
        const data = await request<{ user: User; token: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });
        setAuthToken(data.token);
        StorageService.setCurrentUser(data.user);
        return data.user;
      } catch (err) {
        console.warn('Backend unavailable, falling back to local simulation:', err);
        const users = StorageService.getUsers();
        const user = users.find(u => u.username === username.toLowerCase());
        if (!user) throw new Error('Invalid username or password.');
        StorageService.setCurrentUser(user);
        return user;
      }
    },

    logout: () => {
      setAuthToken(null);
      StorageService.setCurrentUser(null);
    },

    getMe: async (): Promise<User | null> => {
      try {
        const data = await request<{ user: User }>('/auth/me');
        return data.user;
      } catch {
        return StorageService.getCurrentUser();
      }
    },

    handleOAuthToken: async (token: string): Promise<User | null> => {
      setAuthToken(token);
      try {
        const data = await request<{ user: User }>('/auth/me');
        StorageService.setCurrentUser(data.user);
        return data.user;
      } catch (err) {
        console.warn('Backend /auth/me failed with OAuth token, attempting JWT decoding fallback:', err);
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
      try {
        const data = await request<any[]>('/links');
        return data.map(l => ({
          id: l.id,
          userId: l.user_id || l.userId,
          title: l.title,
          prompt: l.prompt,
          type: l.type,
          createdAt: new Date(l.created_at || l.createdAt).getTime()
        }));
      } catch (err) {
        return StorageService.getLinksForUser(userId);
      }
    },

    createLink: async (title: string, prompt: string, type: FeedbackLink['type']): Promise<FeedbackLink> => {
      try {
        const data = await request<any>('/links', {
          method: 'POST',
          body: JSON.stringify({ title, prompt, type })
        });
        return {
          id: data.id,
          userId: data.user_id,
          title: data.title,
          prompt: data.prompt,
          type: data.type,
          createdAt: new Date(data.created_at).getTime()
        };
      } catch (err) {
        const user = StorageService.getCurrentUser();
        const newLink: FeedbackLink = {
          id: Math.random().toString(36).substr(2, 9),
          userId: user?.id || 'guest',
          title,
          prompt,
          type,
          createdAt: Date.now()
        };
        StorageService.saveLink(newLink);
        return newLink;
      }
    },

    deleteLink: async (id: string): Promise<void> => {
      try {
        await request(`/links/${id}`, { method: 'DELETE' });
      } catch (err) {
        const allLinks = StorageService.getLinks();
        localStorage.setItem('mirror_me_links', JSON.stringify(allLinks.filter(l => l.id !== id)));
      }
    }
  },

  messages: {
    getMessages: async (userId: string, linkId?: string): Promise<Message[]> => {
      try {
        const query = linkId && linkId !== 'all' ? `?linkId=${linkId}` : '';
        const data = await request<any[]>(`/messages${query}`);
        return data.map(m => ({
          id: m.id,
          linkId: m.link_id || m.linkId,
          userId: m.recipient_id || m.userId,
          content: m.content,
          audioContent: m.audio_url || m.audioContent,
          contentType: m.content_type || m.contentType,
          createdAt: new Date(m.created_at || m.createdAt).getTime(),
          sentiment: m.sentiment
        }));
      } catch (err) {
        const userMsgs = StorageService.getMessagesForUser(userId);
        return linkId && linkId !== 'all' ? userMsgs.filter(m => m.linkId === linkId) : userMsgs;
      }
    },

    deleteMessage: async (id: string): Promise<void> => {
      try {
        await request(`/messages/${id}`, { method: 'DELETE' });
      } catch (err) {
        const allMessages = StorageService.getMessages();
        localStorage.setItem('mirror_me_messages', JSON.stringify(allMessages.filter(m => m.id !== id)));
      }
    }
  },

  public: {
    getLinkInfo: async (username: string, linkId: string): Promise<{ link: FeedbackLink; recipient: User }> => {
      try {
        const data = await request<{
          linkId: string;
          recipientId: string;
          recipientUsername: string;
          title: string;
          prompt: string;
          type: FeedbackLink['type'];
        }>(`/public/links/${username}/${linkId}`);

        return {
          link: {
            id: data.linkId,
            userId: data.recipientId,
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
      } catch (err) {
        const allLinks = StorageService.getLinks();
        const foundLink = allLinks.find(l => l.id === linkId);
        if (!foundLink) throw new Error('Mirror not found');
        const allUsers = StorageService.getUsers();
        const foundUser = allUsers.find(u => u.id === foundLink.userId);
        if (!foundUser) throw new Error('Owner not found');
        return { link: foundLink, recipient: foundUser };
      }
    },

    submitReflection: async (
      linkId: string,
      contentType: 'text' | 'audio',
      payload: { content?: string; audioBlob?: Blob | null; audioBase64?: string }
    ): Promise<void> => {
      try {
        if (contentType === 'text') {
          await request(`/public/links/${linkId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ contentType: 'text', content: payload.content })
          });
        } else if (payload.audioBlob) {
          const formData = new FormData();
          formData.append('contentType', 'audio');
          formData.append('audio', payload.audioBlob, 'voice.webm');
          await request(`/public/links/${linkId}/messages`, {
            method: 'POST',
            body: formData
          });
        }
      } catch (err) {
        console.warn('Backend submission failed, saving to local storage:', err);
        const allLinks = StorageService.getLinks();
        const foundLink = allLinks.find(l => l.id === linkId);
        const newMessage: Message = {
          id: Math.random().toString(36).substr(2, 9),
          linkId,
          userId: foundLink?.userId || 'unknown',
          contentType,
          content: payload.content,
          audioContent: payload.audioBase64,
          createdAt: Date.now()
        };
        StorageService.saveMessage(newMessage);
      }
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
  }
};
