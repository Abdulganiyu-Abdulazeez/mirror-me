import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

interface FormattedResponse {
  id: string;
  link_id: string;
  recipient_id: string;
  recipient_username?: string;
  content_type: 'text' | 'audio';
  content: string | null;
  audio_url: string | null;
  sentiment?: string | null;
  created_at: string;
}

// GET /api/v1/messages (and /api/v1/reviews) - Get received reflections for authenticated user
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { linkId } = req.query;

    // 1. Fetch all link IDs owned by this user
    const { data: userLinks } = await supabaseAdmin
      .from('links')
      .select('id, username')
      .eq('user_id', userId);

    const linkMap = new Map<string, string>();
    (userLinks || []).forEach(l => linkMap.set(l.id, l.username || req.user!.username));
    const userLinkIds = Array.from(linkMap.keys());

    const resultMap = new Map<string, FormattedResponse>();

    // 2. Query messages table
    let messagesQuery = supabaseAdmin
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (linkId && typeof linkId === 'string' && linkId !== 'all') {
      messagesQuery = messagesQuery.eq('link_id', linkId);
    } else if (userLinkIds.length > 0) {
      messagesQuery = messagesQuery.or(`recipient_id.eq.${userId},link_id.in.(${userLinkIds.join(',')})`);
    } else {
      messagesQuery = messagesQuery.eq('recipient_id', userId);
    }

    const { data: messages } = await messagesQuery;
    if (messages && Array.isArray(messages)) {
      for (const m of messages) {
        resultMap.set(m.id, {
          id: m.id,
          link_id: m.link_id,
          recipient_id: m.recipient_id || userId,
          recipient_username: m.recipient_username || linkMap.get(m.link_id) || req.user!.username,
          content_type: m.content_type === 'audio' ? 'audio' : 'text',
          content: m.content,
          audio_url: m.audio_url,
          sentiment: m.sentiment,
          created_at: m.created_at
        });
      }
    }

    // 3. Query reviews table (Feature Specification)
    try {
      let reviewsQuery = supabaseAdmin
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (linkId && typeof linkId === 'string' && linkId !== 'all') {
        reviewsQuery = reviewsQuery.eq('link_id', linkId);
      } else if (userLinkIds.length > 0) {
        reviewsQuery = reviewsQuery.in('link_id', userLinkIds);
      }

      const { data: reviews } = await reviewsQuery;
      if (reviews && Array.isArray(reviews)) {
        for (const r of reviews) {
          if (!resultMap.has(r.id)) {
            const isVn = r.type === 'vn' || r.type === 'audio';
            resultMap.set(r.id, {
              id: r.id,
              link_id: r.link_id,
              recipient_id: userId,
              recipient_username: linkMap.get(r.link_id) || req.user!.username,
              content_type: isVn ? 'audio' : 'text',
              content: isVn ? null : r.content,
              audio_url: isVn ? r.content : null,
              created_at: r.created_at
            });
          }
        }
      }
    } catch {
      // Reviews table might not exist yet before migration
    }

    // Sort descending by created_at
    const allResponses = Array.from(resultMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.json(allResponses);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Server error while fetching reflections';
    console.error('Fetch messages error:', errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

// DELETE /api/v1/messages/:id - Delete a received reflection
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = String(req.params.id);

    // Delete from messages
    await supabaseAdmin
      .from('messages')
      .delete()
      .eq('id', id)
      .eq('recipient_id', userId);

    // Also delete from reviews if exists
    try {
      await supabaseAdmin
        .from('reviews')
        .delete()
        .eq('id', id);
    } catch {}

    res.json({ success: true, message: 'Reflection deleted' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Server error while deleting reflection';
    console.error('Delete message error:', errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

export default router;
