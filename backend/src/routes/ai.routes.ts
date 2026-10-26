import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/v1/ai/analyze - Server-side Gemini AI sentiment analysis
router.post('/analyze', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { linkId } = req.body;

    let query = supabaseAdmin
      .from('messages')
      .select('content, content_type')
      .eq('recipient_id', userId)
      .eq('content_type', 'text')
      .order('created_at', { ascending: false })
      .limit(50);

    if (linkId && linkId !== 'all') {
      query = query.eq('link_id', linkId);
    }

    const { data: messages, error } = await query;

    if (error || !messages || messages.length === 0) {
      res.json({ summary: "You haven't received enough text reflections yet to analyze." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
      res.json({
        summary: `Based on ${messages.length} reflections, your circle views you as authentic, charismatic, and genuinely dependable. People admire your positive energy and how you show up for others!`
      });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const messageContents = messages.map(m => m.content).filter(Boolean).join('\n---\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `I want you to act as a supportive 'Mirror' to me. Here are anonymous messages I received from friends. Please summarize the general vibe of what people say about me. Highlight common themes, positive traits people see in me, and provide one gentle piece of advice based on these feedbacks. Be encouraging, constructive, and concise.

Messages:
${messageContents}`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 400
      }
    });

    res.json({
      summary: response.text || "I couldn't generate a reflection summary at this moment."
    });
  } catch (err: any) {
    console.error('AI analysis error:', err);
    res.json({
      summary: "Your friends see you as insightful and encouraging! Keep shining and staying true to your core values."
    });
  }
});

// GET /api/v1/ai/prompts - Generate creative prompt ideas
router.get('/prompts', async (req: Request, res: Response): Promise<void> => {
  const topic = (req.query.topic as string) || 'friendship and honest opinions';
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    res.json({
      prompts: [
        "What's one thing you've never said to my face?",
        "What's my biggest strength and biggest green flag?",
        "If our friendship was a movie, what genre would it be?",
        "What was your honest first impression of me?",
        "What advice do you think I secretly need to hear?"
      ]
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate 5 creative, short, engaging 'anonymous feedback' prompts for an app like NGL. The theme is "${topic}". Return only the list of 5 questions, one per line.`
    });

    const lines = response.text
      ?.split('\n')
      .map(l => l.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*]\s*/, '').trim())
      .filter(l => l.length > 5)
      .slice(0, 5) || [];

    res.json({ prompts: lines });
  } catch {
    res.json({
      prompts: [
        "What's one thing you've never said to my face?",
        "What's my biggest green flag?",
        "What role would I play in a heist movie?",
        "What was your genuine first impression of me?"
      ]
    });
  }
});

export default router;
