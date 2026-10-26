import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/messages - Get received reflections for authenticated user
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { linkId } = req.query;

    let query = supabaseAdmin
      .from('messages')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });

    if (linkId && typeof linkId === 'string' && linkId !== 'all') {
      query = query.eq('link_id', linkId);
    }

    const { data: messages, error } = await query;

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(messages || []);
  } catch (err: any) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ error: 'Server error while fetching reflections' });
  }
});

// DELETE /api/v1/messages/:id - Delete a received reflection
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = String(req.params.id);

    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('id', id)
      .eq('recipient_id', userId);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ success: true, message: 'Reflection deleted' });
  } catch (err: any) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Server error while deleting reflection' });
  }
});

export default router;
