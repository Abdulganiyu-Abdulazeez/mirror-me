import { Router, Request, Response } from 'express';
import { supabaseAdmin, supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email, and password are required' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check if username already exists in profiles
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .or(`username.eq.${cleanUsername},email.eq.${cleanEmail}`)
      .limit(1);

    if (existingUser && existingUser.length > 0) {
      res.status(409).json({ error: 'Username or email is already taken' });
      return;
    }

    // Create user in Supabase Auth (auto-confirm email for easy developer & testing experience)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { username: cleanUsername }
    });

    if (authError || !authData.user) {
      res.status(400).json({ error: authError?.message || 'Failed to register user in Supabase Auth' });
      return;
    }

    // Insert profile into public.profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        username: cleanUsername,
        email: cleanEmail,
        role: 'user'
      });

    if (profileError) {
      console.warn('Profile insertion note:', profileError.message);
    }

    // Sign in to generate session token
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (loginError || !loginData.session) {
      res.status(201).json({
        user: {
          id: authData.user.id,
          username: cleanUsername,
          email: cleanEmail,
          role: 'user'
        },
        token: null,
        message: 'Account created. Please log in.'
      });
      return;
    }

    res.status(201).json({
      user: {
        id: authData.user.id,
        username: cleanUsername,
        email: cleanEmail,
        role: 'user'
      },
      token: loginData.session.access_token
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username (or email) and password are required' });
      return;
    }

    const identifier = username.trim().toLowerCase();
    let loginEmail = identifier;

    // If identifier is not an email, lookup in profiles by username
    if (!identifier.includes('@')) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email, id, username, role')
        .eq('username', identifier)
        .single();

      if (!profile) {
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }
      loginEmail = profile.email;
    }

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password
    });

    if (error || !data.user || !data.session) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Fetch user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username, role')
      .eq('id', data.user.id)
      .single();

    res.json({
      user: {
        id: data.user.id,
        username: profile?.username || data.user.user_metadata?.username || loginEmail.split('@')[0],
        email: data.user.email || loginEmail,
        role: (profile?.role as 'user' | 'admin') || 'user'
      },
      token: data.session.access_token
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;
