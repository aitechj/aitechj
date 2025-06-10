import { z } from 'zod';

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 2048);
};

export const validateChatInput = (messages: any[]): boolean => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return false;
  }

  return messages.every(msg => 
    msg.role && 
    ['user', 'assistant', 'system'].includes(msg.role) &&
    typeof msg.content === 'string' &&
    msg.content.length > 0 &&
    msg.content.length <= 2000
  );
};

export const ChatInputSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1).max(2048),
  })).min(1).max(50),
  contextContent: z.string().max(5000).optional(),
});
