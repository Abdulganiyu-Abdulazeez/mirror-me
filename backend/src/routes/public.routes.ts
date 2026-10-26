import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { submissionLimiter } from '../middleware/rateLimiter.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 } // 6MB max audio file
});

// GET /api/v1/public/links/:username/:linkId - Fetch public link metadata
router.get('/links/:username/:linkId', async (req: Request, res: Response): Promise<void> => {
  try {
    const username = String(req.params.username || '');
    const linkId = String(req.params.linkId || '');

    // Fetch link
    const { data: link, error: linkError } = await supabaseAdmin
      .from('links')
      .select('id, user_id, title, prompt, type, is_active')
      .eq('id', linkId)
      .single();

    if (linkError || !link || !link.is_active) {
      res.status(404).json({ error: 'Mirror not found or link has expired' });
      return;
    }

    // Fetch recipient username
    const { data: recipient, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('id', link.user_id)
      .single();

    if (userError || !recipient) {
      res.status(404).json({ error: 'Mirror owner not found' });
      return;
    }

    // Check username match (case-insensitive)
    if (recipient.username.toLowerCase() !== username.toLowerCase()) {
      res.status(404).json({ error: 'Mirror URL does not match username' });
      return;
    }

    res.json({
      linkId: link.id,
      recipientId: recipient.id,
      recipientUsername: recipient.username,
      title: link.title,
      prompt: link.prompt,
      type: link.type
    });
  } catch (err: any) {
    console.error('Public link lookup error:', err);
    res.status(500).json({ error: 'Server error looking up mirror' });
  }
});

// POST /api/v1/public/links/:linkId/messages - Submit anonymous reflection
router.post('/links/:linkId/messages', submissionLimiter, upload.single('audio'), async (req: Request, res: Response): Promise<void> => {
  try {
    const linkId = String(req.params.linkId || '');
    const { contentType, content } = req.body;
    const audioFile = req.file;

    // Verify link exists and get recipientId and recipient username
    const { data: link, error: linkError } = await supabaseAdmin
      .from('links')
      .select('id, user_id, username, is_active')
      .eq('id', linkId)
      .single();

    if (linkError || !link || !link.is_active) {
      res.status(404).json({ error: 'Invalid or inactive mirror link' });
      return;
    }

    let audioUrl: string | null = null;
    let messageContent: string | null = null;
    const finalContentType = contentType === 'audio' ? 'audio' : 'text';

    if (finalContentType === 'text') {
      if (!content || !content.trim()) {
        res.status(400).json({ error: 'Text content cannot be empty' });
        return;
      }
      messageContent = content.trim().slice(0, 1000); // 1000 char max
    } else {
      // Audio submission
      if (!audioFile && !req.body.audioBase64) {
        res.status(400).json({ error: 'Audio file is required for voice note' });
        return;
      }

      const filename = `voice-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webm`;
      const audioBuffer = audioFile ? audioFile.buffer : Buffer.from(req.body.audioBase64.replace(/^data:audio\/\w+;base64,/, ''), 'base64');

      // Upload to Supabase Storage bucket 'audio-reflections'
      const { error: uploadError } = await supabaseAdmin.storage
        .from('audio-reflections')
        .upload(filename, audioBuffer, {
          contentType: audioFile?.mimetype || 'audio/webm',
          upsert: false
        });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        res.status(500).json({ error: 'Failed to upload audio to storage: ' + uploadError.message });
        return;
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('audio-reflections')
        .getPublicUrl(filename);

      audioUrl = publicUrlData.publicUrl;
    }

    // Insert reflection into messages table tied to both recipient_id and recipient_username
    const { data: newMessage, error: insertError } = await supabaseAdmin
      .from('messages')
      .insert({
        link_id: link.id,
        recipient_id: link.user_id,
        recipient_username: link.username || '',
        content_type: finalContentType,
        content: messageContent,
        audio_url: audioUrl
      })
      .select()
      .single();

    if (insertError) {
      console.error('Message insertion error:', insertError);
      res.status(500).json({ error: 'Failed to record reflection: ' + insertError.message });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Reflection sent anonymously',
      id: newMessage.id
    });
  } catch (err: any) {
    console.error('Public submission error:', err);
    res.status(500).json({ error: 'Server error while sending reflection' });
  }
});

export default router;
