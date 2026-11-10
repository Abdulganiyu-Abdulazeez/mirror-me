
export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role?: 'user' | 'admin';
  createdAt: number;
}

export interface FeedbackLink {
  id: string;
  userId: string;
  username?: string;
  title: string;
  prompt: string;
  type: 'general' | 'advice' | 'confession' | 'first-impression';
  createdAt: number;
}

export interface Message {
  id: string;
  linkId: string;
  userId: string; // Recipient ID
  recipientUsername?: string;
  content?: string; // Text content
  audioContent?: string; // Base64 audio data
  contentType: 'text' | 'audio';
  createdAt: number;
  sentiment?: string; // Analysis by Gemini
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
