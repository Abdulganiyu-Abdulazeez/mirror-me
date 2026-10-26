import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/admin/stats
router.get('/stats', requireAuth, async (req: Request, res: Response): Promise<void> => {
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
  } catch (err: any) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Server error retrieving stats' });
  }
});

// GET /api/v1/admin/logs - Activity logs
router.get('/logs', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: logs, error } = await supabaseAdmin
      .from('messages')
      .select('id, recipient_id, content_type, content, created_at')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(logs || []);
  } catch (err: any) {
    console.error('Admin logs error:', err);
    res.status(500).json({ error: 'Server error retrieving logs' });
  }
});

export default router;
