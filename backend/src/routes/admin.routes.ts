import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/admin/stats
router.get('/stats', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { count: userCount } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true });
    const { count: messageCount } = await supabaseAdmin.from('messages').select('*', { count: 'exact', head: true });
    const { count: voiceCount } = await supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }).eq('content_type', 'audio');
    const { count: linkCount } = await supabaseAdmin.from('links').select('*', { count: 'exact', head: true });

    res.json({
      totalUsers: userCount || 0,
      totalMessages: messageCount || 0,
      voiceNotes: voiceCount || 0,
      activeLinks: linkCount || 0
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Server error retrieving stats';
    console.error('Admin stats error:', errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

// GET /api/v1/admin/users - User directory with activity metrics filter
router.get('/users', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { filter } = req.query; // '1d' | '7d' | '30d' | 'all'

    let query = supabaseAdmin
      .from('profiles')
      .select('id, username, email, role, avatar_url, is_active, last_active_at, created_at')
      .order('created_at', { ascending: false });

    const now = new Date();
    if (filter === '1d') {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('last_active_at', oneDayAgo);
    } else if (filter === '7d') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('last_active_at', sevenDaysAgo);
    } else if (filter === '30d') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('last_active_at', thirtyDaysAgo);
    }

    const { data: users, error } = await query;
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(users || []);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Server error retrieving users';
    console.error('Admin users error:', errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

// PATCH /api/v1/admin/users/:id/toggle-active - Moderate user (is_active toggle)
router.patch('/users/:id/toggle-active', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id;

    // Fetch current state
    const { data: userProfile, error: fetchErr } = await supabaseAdmin
      .from('profiles')
      .select('id, is_active, email')
      .eq('id', targetUserId)
      .single();

    if (fetchErr || !userProfile) {
      res.status(404).json({ error: 'User profile not found' });
      return;
    }

    // Do not disable primary admin
    if (userProfile.email?.toLowerCase() === 'haypexdev@gmail.com') {
      res.status(400).json({ error: 'Cannot deactivate the primary administrator account' });
      return;
    }

    const newActiveState = userProfile.is_active === false ? true : false;

    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: newActiveState })
      .eq('id', targetUserId);

    if (updateErr) {
      res.status(400).json({ error: updateErr.message });
      return;
    }

    res.json({
      success: true,
      userId: targetUserId,
      isActive: newActiveState,
      message: `User has been ${newActiveState ? 'activated' : 'deactivated'}`
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Server error toggling user status';
    console.error('Toggle active error:', errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

// GET /api/v1/admin/broadcasts - List all announcements
router.get('/broadcasts', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: broadcasts, error } = await supabaseAdmin
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(broadcasts || []);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Server error retrieving broadcasts';
    res.status(500).json({ error: errorMsg });
  }
});

// POST /api/v1/admin/broadcasts - Publish a new announcement
router.post('/broadcasts', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      res.status(400).json({ error: 'Title and message are required' });
      return;
    }

    const { data: newBroadcast, error } = await supabaseAdmin
      .from('broadcasts')
      .insert({
        title: String(title).trim(),
        message: String(message).trim()
      })
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json(newBroadcast);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Server error creating broadcast';
    res.status(500).json({ error: errorMsg });
  }
});

// DELETE /api/v1/admin/broadcasts/:id - Delete an announcement
router.delete('/broadcasts/:id', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('broadcasts')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ success: true, message: 'Broadcast deleted' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Server error deleting broadcast';
    res.status(500).json({ error: errorMsg });
  }
});

// GET /api/v1/admin/logs - Activity logs
router.get('/logs', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: logs, error } = await supabaseAdmin
      .from('messages')
      .select('id, recipient_id, content_type, content, audio_url, created_at')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(logs || []);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Server error retrieving logs';
    console.error('Admin logs error:', errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

export default router;
