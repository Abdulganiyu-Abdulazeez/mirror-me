
import { User, Message, FeedbackLink } from '../types';

const KEYS = {
  USERS: 'mirror_me_users',
  MESSAGES: 'mirror_me_messages',
  LINKS: 'mirror_me_links',
  CURRENT_USER: 'mirror_me_current_session'
};

export const StorageService = {
  getUsers: (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'),
  
  saveUser: (user: User) => {
    const users = StorageService.getUsers();
    users.push(user);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },

  getCurrentUser: (): User | null => {
    const session = localStorage.getItem(KEYS.CURRENT_USER);
    return session ? JSON.parse(session) : null;
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
    }
  },

  getLinks: (): FeedbackLink[] => JSON.parse(localStorage.getItem(KEYS.LINKS) || '[]'),
  
  saveLink: (link: FeedbackLink) => {
    const links = StorageService.getLinks();
    links.push(link);
    localStorage.setItem(KEYS.LINKS, JSON.stringify(links));
  },

  getMessages: (): Message[] => JSON.parse(localStorage.getItem(KEYS.MESSAGES) || '[]'),
  
  saveMessage: (message: Message) => {
    const messages = StorageService.getMessages();
    messages.push(message);
    localStorage.setItem(KEYS.MESSAGES, JSON.stringify(messages));
  },

  getMessagesForUser: (userId: string): Message[] => {
    return StorageService.getMessages().filter(m => m.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
  },

  getLinksForUser: (userId: string): FeedbackLink[] => {
    return StorageService.getLinks().filter(l => l.userId === userId);
  }
};
