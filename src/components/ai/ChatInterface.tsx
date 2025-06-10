'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { useQuota } from '@/contexts/QuotaContext';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { quota, refreshQuota, setQuota } = useQuota();
  const { getAuthHeaders } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);



  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: data.content }]);
        
        if (data.threadId) {
          localStorage.setItem('threadId', data.threadId);
          console.log('💾 Saved threadId to localStorage:', data.threadId);
        }
        
        if (data.guestToken && typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')) {
          const { setAuthToken } = await import('@/lib/auth/client-storage');
          setAuthToken('guest', data.guestToken);
        }
        
        if (quota) {
          setQuota((prev: any) => prev ? { ...prev, used: prev.used + 1 } : null);
        }
        
        try {
          await refreshQuota();
        } catch (error) {
          if (quota) {
            setQuota((prev: any) => prev ? { ...prev, used: prev.used - 1 } : null);
          }
        }
      }else {
        const errorMessage = response.status === 429 
          ? data.error || 'Monthly quota exceeded. Please upgrade your plan for more questions.'
          : `Error: ${data.error || 'Something went wrong'}`;
        setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: errorMessage }]);
        try {
          await refreshQuota();
        } catch (error) {
          console.error('Failed to refresh quota after error:', error);
        }
      }
    } catch (error) {
      setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-96 border rounded-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message: Message, index: number) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-800'
            }`}>
              {message.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t p-4">
        {quota && (
          <div className="text-sm text-gray-600 mb-2">
            Questions used: {quota.used}/{quota.quota} this month
            {quota.used >= quota.quota && (
              <span className="text-red-600 ml-2">Quota exceeded</span>
            )}
          </div>
        )}
        <div className="flex space-x-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!loading && input.trim() && (!quota || quota.used < quota.quota)) {
                  sendMessage();
                }
              }
            }}
          />
          <Button 
            onClick={sendMessage} 
            disabled={loading || !input.trim() || (quota ? quota.used >= quota.quota : false)}
          >
            {loading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
