'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { ChatInterface } from '../../components/ai/ChatInterface';
import { UsageDashboard } from '../../components/ai/UsageDashboard';
import { CostMonitor } from '../../components/ai/CostMonitor';
import { ConversationHistory } from '../../components/ai/ConversationHistory';

const QuotaContext = createContext<{
  quota: any;
  refreshQuota: () => Promise<void>;
}>({
  quota: null,
  refreshQuota: async () => {},
});

export const useQuota = () => useContext(QuotaContext);

export default function AIChatPage() {
  const [quota, setQuota] = useState<any>(null);

  const refreshQuota = async () => {
    try {
      const response = await fetch('/api/ai/quota', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setQuota(data);
      }
    } catch (error) {
      console.error('Failed to refresh quota:', error);
    }
  };

  useEffect(() => {
    refreshQuota();
  }, []);

  return (
    <QuotaContext.Provider value={{ quota, refreshQuota }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">AI Learning Assistant</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ChatInterface />
            </div>
            
            <div className="lg:col-span-1 space-y-6">
              <UsageDashboard />
              <CostMonitor />
              <ConversationHistory />
            </div>
          </div>
        </div>
      </div>
    </QuotaContext.Provider>
  );
}
