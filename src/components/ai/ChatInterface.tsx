'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<any>(null);
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
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
        setQuota(data.quota);
      } else {
        const errorMessage = response.status === 429 
          ? data.error 
          : `Error: ${data.error || 'Something went wrong'}`;
        setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
        if (data.quota) setQuota(data.quota);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-96 border rounded-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
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
            {quota.used}/{quota.limit} questions used this month
            {quota.used >= quota.limit && (
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
                if (!loading && input.trim() && (!quota || quota.used < quota.limit)) {
                  sendMessage();
                }
              }
            }}
          />
          <Button 
            onClick={sendMessage} 
            disabled={loading || !input.trim() || (quota && quota.used >= quota.limit)}
          >
            {loading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
