
import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

export const aiService = {
  analyzeMessages: async (messages: Message[]): Promise<string> => {
    if (messages.length === 0) return "You haven't received any messages yet to analyze.";
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const messageContents = messages.map(m => m.content).join('\n---\n');
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-latest',
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
      console.error("AI analysis error:", error);
      return "The Mirror is currently foggy. Please try again later.";
    }
  },

  generatePrompts: async (topic: string): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-latest',
        contents: `Generate 5 creative and engaging 'anonymous feedback' prompts for a web app like NGL. The theme is "${topic}". Make them short, catchy, and inviting. Return them as a simple list.`,
      });
      
      const lines = response.text?.split('\n').filter(l => l.trim().length > 0) || [];
      return lines.map(l => l.replace(/^\d+\.\s*/, '').trim()).slice(0, 5);
    } catch (error) {
      return ["Tell me something you've never said before", "What's my best quality?", "If we were in a movie, what role would I play?"];
    }
  }
};
