import { z } from 'zod';
import { trackTokenUsage } from './cost-monitor';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

function createMockResponse(messages: ChatMessage[], model: string): {
  content: string;
  tokensUsed: number;
  model: string;
} {
  const lastMessage = messages[messages.length - 1];
  const isGPT4 = model.includes('gpt-4');
  
  const responses = [
    `Great question! ${isGPT4 ? '(GPT-4 Response)' : '(GPT-3.5 Response)'} Let me explain that concept step by step...`,
    `That's an excellent topic to explore! ${isGPT4 ? '(GPT-4 Response)' : '(GPT-3.5 Response)'} Here's what you need to know...`,
    `I'd be happy to help you understand that! ${isGPT4 ? '(GPT-4 Response)' : '(GPT-3.5 Response)'} Let's break it down...`
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  const mockTokens = isGPT4 ? 150 : 100;
  
  return {
    content: randomResponse + `\n\nYour question was: "${lastMessage.content}"`,
    tokensUsed: mockTokens,
    model
  };
}

export async function generateAIResponse(
  messages: ChatMessage[],
  subscriptionTier: string,
  contextContent?: string
) {
  const model = subscriptionTier === 'premium' || subscriptionTier === 'admin' ? 'gpt-4' : 'gpt-3.5-turbo';
  
  const systemMessage: ChatMessage = {
    role: 'system',
    content: `You are an expert AI tutor for technical learning. Help users understand complex technical concepts with clear explanations and practical examples.${contextContent ? ` Current lesson context: ${contextContent.slice(0, 1500)}` : ''}`
  };

  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key') {
      console.warn('⚠️ OpenAI API key not configured, using mock response');
      const mockResponse = createMockResponse([systemMessage, ...messages], model);
      await trackTokenUsage(mockResponse.tokensUsed, model);
      return mockResponse;
    }

    const { default: OpenAI } = await import('openai');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model,
      messages: [systemMessage, ...messages],
      max_tokens: subscriptionTier === 'guest' ? 150 : subscriptionTier === 'premium' || subscriptionTier === 'admin' ? 1000 : 500,
      temperature: 0.7,
    });

    const response = {
      content: completion.choices[0]?.message?.content || '',
      tokensUsed: completion.usage?.total_tokens || 0,
      model,
    };

    await trackTokenUsage(response.tokensUsed, model);
    return response;

  } catch (error) {
    console.error('OpenAI API error:', error);
    const mockResponse = createMockResponse([systemMessage, ...messages], model);
    await trackTokenUsage(mockResponse.tokensUsed, model);
    return mockResponse;
  }
}
