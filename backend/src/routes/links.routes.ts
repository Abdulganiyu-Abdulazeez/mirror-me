import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/links - Get current authenticated user's links
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const { data: links, error } = await supabaseAdmin
      .from('links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(links || []);
  } catch (err: any) {
    console.error('Fetch links error:', err);
    res.status(500).json({ error: 'Server error while fetching links' });
  }
});

// POST /api/v1/links - Create a new mirror link
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { title, prompt, type } = req.body;

    if (!title || !prompt) {
      res.status(400).json({ error: 'Title and prompt are required' });
      return;
    }

    const linkId = crypto.randomBytes(5).toString('hex'); // 10-char clean slug

    const { data: newLink, error } = await supabaseAdmin
      .from('links')
      .insert({
        id: linkId,
        user_id: userId,
        username: req.user!.username,
        title: title.trim(),
        prompt: prompt.trim(),
        type: type || 'general',
        is_active: true
      })
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json(newLink);
  } catch (err: any) {
    console.error('Create link error:', err);
    res.status(500).json({ error: 'Server error while creating link' });
  }
});

// DELETE /api/v1/links/:id - Delete a mirror link
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = String(req.params.id);

    const { error } = await supabaseAdmin
      .from('links')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ success: true, message: 'Link deleted successfully' });
  } catch (err: any) {
    console.error('Delete link error:', err);
    res.status(500).json({ error: 'Server error while deleting link' });
  }
});

export default router;
