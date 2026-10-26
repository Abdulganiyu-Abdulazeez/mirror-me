import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
      return;
    }

    // Retrieve username and role from profiles table
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username, role')
      .eq('id', user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email || '',
      username: profile?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'anonymous',
      role: (profile?.role as 'user' | 'admin') || 'user'
    };

    next();
  } catch (err: any) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication verification failed' });
  }
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }
  next();
};
