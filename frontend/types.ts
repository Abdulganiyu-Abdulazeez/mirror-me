
export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role?: 'user' | 'admin';
  isActive?: boolean;
  lastActiveAt?: number | string;
  createdAt: number;
}

export interface FeedbackLink {
  id: string;
  userId: string;
  slug?: string;
  username?: string;
  title: string;
  prompt: string;
  type: 'general' | 'advice' | 'confession' | 'first-impression';
  isActive?: boolean;
  createdAt: number;
}

export interface Message {
  id: string;
  linkId: string;
  userId: string; // Recipient ID
  recipientUsername?: string;
  content?: string; // Text content
  audioContent?: string; // Audio URL or Base64 data
  contentType: 'text' | 'audio';
  createdAt: number;
  sentiment?: string; // Analysis by Gemini
}

export interface Review {
  id: string;
  linkId: string;
  type: 'text' | 'vn';
  content: string;
  createdAt: number;
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  createdAt: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
