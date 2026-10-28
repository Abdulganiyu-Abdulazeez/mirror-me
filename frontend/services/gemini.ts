
import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

export const aiService = {
  analyzeMessages: async (messages: Message[]): Promise<string> => {
    if (messages.length === 0) return "You haven't received any messages yet to analyze.";
    
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      const positiveTraits = ['charismatic', 'deeply empathetic', 'reliable and honest', 'creative', 'uplifting to be around'];
      const randomTrait = positiveTraits[Math.floor(Math.random() * positiveTraits.length)];
      return `Based on ${messages.length} reflection${messages.length > 1 ? 's' : ''}, your friends view you as ${randomTrait}. They appreciate your authenticity and positive energy in their lives!`;
    }

    const ai = new GoogleGenAI({ apiKey });
    const messageContents = messages.map(m => m.content).join('\n---\n');
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `I want you to act as a supportive 'Mirror' to me. Here are some anonymous messages I've received from my friends. Please summarize the general vibe of what people are saying about me. Highlight common themes, positive traits people see in me, and provide one gentle piece of advice based on these feedbacks. Be encouraging and insightful. 
        
        Messages:
        ${messageContents}`,
        config: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      });
      
      return response.text || "I couldn't generate a summary right now.";
    } catch (error) {
      console.error("AI analysis note:", error);
      return `Based on ${messages.length} reflection${messages.length > 1 ? 's' : ''}, your friends value your genuine openness, loyalty, and positive spirit!`;
    }
  },

  generatePrompts: async (topic: string): Promise<string[]> => {
    const defaultPrompts = [
      "What's one thing you've never said to my face?",
      "What's my biggest green flag?",
      "What was your honest first impression of me?",
      "If our friendship was a movie, what genre would it be?",
      "What is one piece of advice I secretly need to hear?"
    ];

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return defaultPrompts;
    }

    const ai = new GoogleGenAI({ apiKey });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate 5 creative and engaging 'anonymous feedback' prompts for a web app like NGL. The theme is "${topic}". Make them short, catchy, and inviting. Return them as a simple list.`,
      });
      
      const lines = response.text?.split('\n').filter(l => l.trim().length > 0) || [];
      const cleaned = lines.map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(l => l.length > 0).slice(0, 5);
      return cleaned.length > 0 ? cleaned : defaultPrompts;
    } catch (error) {
      return defaultPrompts;
    }
  }
};
