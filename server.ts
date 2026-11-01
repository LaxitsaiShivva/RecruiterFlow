/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not set in environment variables. AI generation will fail unless configured.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || 'dummy-key',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper for calling Gemini with retry and fallback
async function generateWithRetry(params: {
  contents: any;
  config?: any;
}) {
  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-4-argon'];
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Trying model ${model} (attempt ${attempt})...`);
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} attempt ${attempt} failed:`, err?.message || err);
        // If 503 or 429, wait before retry
        if (err?.status === 503 || err?.status === 429 || err?.message?.includes('503') || err?.message?.includes('429') || err?.message?.includes('high demand')) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else {
          // For other errors, try next model faster
          break;
        }
      }
    }
  }

  throw lastError || new Error('All model generation attempts failed due to high demand or network issues.');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Endpoint: Generate LinkedIn Job Description & 10 Behavioral Interview Guide + Scorecard
  app.post('/api/generate-recruitment', async (req, res) => {
    try {
      const { notes, roleTitle, department, seniority, tone } = req.body;

      if (!notes && !roleTitle) {
        return res.status(400).json({ error: 'Please provide raw notes or a role title.' });
      }

      const prompt = `
You are an expert Chief People Officer and Executive Technical Recruiter.
A hiring manager has provided raw notes and details for a role:

Role Title: ${roleTitle || 'Not specified'}
Department: ${department || 'General'}
Seniority: ${seniority || 'Mid/Senior'}
Tone Style: ${tone || 'Professional & Engaging'}

Raw Notes & Requirements:
"""
${notes}
"""

Please generate a comprehensive, high-converting recruitment package in JSON format containing:
1. "jobDescription": A polished, correctly formatted Job Description tailored for LinkedIn and top job boards, including:
   - title (string)
   - department (string)
   - employmentType (string, e.g., Full-time, Remote/Hybrid)
   - aboutCompany (string - engaging company mission paragraph)
   - hook (string - compelling opening paragraph for LinkedIn)
   - responsibilities (array of strings - 5 to 7 key bullet points)
   - hardSkills (array of strings - core technical/domain skills required)
   - softSkills (array of strings - interpersonal/leadership skills required)
   - requirements (array of strings - education, experience, qualifications)
   - benefits (array of strings - compensation, perks, growth)
   - callToAction (string)

2. "interviewGuide": An array of exactly 10 behavioral interview questions specifically targeting the hard and soft skills mentioned in this JD. Each item must have:
   - id (number 1 to 10)
   - question (string - clear behavioral question using "Tell me about a time when..." or similar format)
   - competency (string - core competency tested)
   - targetSkillType ('hard' or 'soft')
   - starGuideline (string - expected STAR response breakdown)
   - nominalIndicators (array of strings - green flags / what a great candidate says)
   - redFlags (array of strings - warning signs / what to watch out for)
   - followUpProbe (string - probing follow-up question)

3. "evaluationScorecard": An object with:
   - criteria: Array of 4-5 scoring categories (e.g. Technical Depth, Problem Solving, Culture & Collaboration, Communication & Leadership), each with name, description, weight (percentage), and maxScore (e.g. 5 or 10).
`;

      const response = await generateWithRetry({
        contents: prompt,
        config: {
          systemInstruction: 'You are an expert HR recruitment architect. Return strictly valid JSON matching the requested recruitment structure.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              jobDescription: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  department: { type: Type.STRING },
                  employmentType: { type: Type.STRING },
                  aboutCompany: { type: Type.STRING },
                  hook: { type: Type.STRING },
                  responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
                  hardSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                  softSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                  requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
                  benefits: { type: Type.ARRAY, items: { type: Type.STRING } },
                  callToAction: { type: Type.STRING },
                },
                required: ['title', 'hook', 'responsibilities', 'hardSkills', 'softSkills', 'requirements']
              },
              interviewGuide: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.NUMBER },
                    question: { type: Type.STRING },
                    competency: { type: Type.STRING },
                    targetSkillType: { type: Type.STRING },
                    starGuideline: { type: Type.STRING },
                    nominalIndicators: { type: Type.ARRAY, items: { type: Type.STRING } },
                    redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    followUpProbe: { type: Type.STRING }
                  },
                  required: ['id', 'question', 'competency', 'targetSkillType', 'starGuideline', 'nominalIndicators', 'redFlags', 'followUpProbe']
                }
              },
              evaluationScorecard: {
                type: Type.OBJECT,
                properties: {
                  criteria: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        weight: { type: Type.STRING },
                        maxScore: { type: Type.NUMBER }
                      },
                      required: ['name', 'description', 'weight', 'maxScore']
                    }
                  }
                },
                required: ['criteria']
              }
            },
            required: ['jobDescription', 'interviewGuide', 'evaluationScorecard']
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('No response generated from AI model.');
      }

      const parsedData = JSON.parse(text);
      res.json(parsedData);
    } catch (error: any) {
      console.error('Error generating recruitment sandbox package:', error);
      res.status(500).json({ error: error.message || 'Failed to generate recruitment package due to high model demand. Please try again in a moment.' });
    }
  });

  // API Endpoint: AI Co-Pilot Chat
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, roleContext } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid messages array.' });
      }

      const lastMessage = messages[messages.length - 1]?.content || '';
      const chatHistory = messages.slice(0, -1).map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const systemInstruction = `You are "TalentForge Co-Pilot", an elite AI Recruitment Advisor and HR Strategist helping hiring managers and recruiters refine job descriptions, prepare interview strategies, benchmark compensation, and draft LinkedIn InMail candidate outreach messages. 
      Current Role Context: ${JSON.stringify(roleContext || {})}`;

      let replyText = '';
      const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-4-argon'];

      for (const model of models) {
        try {
          const chat = ai.chats.create({
            model,
            history: chatHistory,
            config: { systemInstruction }
          });
          const result = await chat.sendMessage({ message: lastMessage });
          if (result && result.text) {
            replyText = result.text;
            break;
          }
        } catch (err: any) {
          console.warn(`Chat model ${model} failed:`, err?.message || err);
        }
      }

      if (!replyText) {
        throw new Error('All chat model attempts failed.');
      }

      res.json({ reply: replyText });
    } catch (error: any) {
      console.error('Error in chat endpoint:', error);
      res.status(500).json({ error: error.message || 'Chat assistant temporarily unavailable.' });
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const staticPath = path.resolve(__dirname, 'dist');
    app.use(express.static(staticPath));
    app.get('*', (_, res) => {
      res.sendFile(path.resolve(staticPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
