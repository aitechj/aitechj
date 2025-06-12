'use client';
import React, { useState, useEffect } from 'react';

interface Conversation {
  id: string;
  messages: any[];
  tokensUsed: number;
  createdAt: string;
}

export function ConversationHistory() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/ai/conversations?limit=20');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading conversations...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-black">Conversation History</h3>
      
      {conversations.length === 0 ? (
        <p className="text-sm text-black">No conversations yet. Start chatting to see your history!</p>
      ) : (
        <div className="space-y-3">
          {conversations.slice(0, 5).map((conv) => (
            <div key={conv.id} className="border-b pb-3 last:border-b-0">
              <div className="text-sm text-gray-800">
                {new Date(conv.createdAt).toLocaleDateString()}
              </div>
              <div className="text-sm mt-1">
                {conv.messages.length} messages • {conv.tokensUsed} tokens
              </div>
              {conv.messages.length > 0 && (
                <div className="text-sm text-gray-700 mt-1 truncate">
                  {conv.messages[0]?.content?.slice(0, 100)}...
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
