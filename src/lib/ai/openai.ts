import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export async function generateAIResponse(
  messages: ChatMessage[],
  subscriptionTier: string,
  contextContent?: string
) {
  const model = subscriptionTier === 'premium' ? 'gpt-4' : 'gpt-3.5-turbo';
  
  const systemMessage: ChatMessage = {
    role: 'system',
    content: `You are an expert AI tutor for technical learning. Help users understand complex technical concepts with clear explanations and practical examples.${contextContent ? ` Current lesson context: ${contextContent.slice(0, 1500)}` : ''}`
  };

  const completion = await openai.chat.completions.create({
    model,
    messages: [systemMessage, ...messages],
    max_tokens: subscriptionTier === 'premium' ? 1000 : 500,
    temperature: 0.7,
  });

  return {
    content: completion.choices[0]?.message?.content || '',
    tokensUsed: completion.usage?.total_tokens || 0,
    model,
  };
}
