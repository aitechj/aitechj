'use client';
import { ChatInterface } from '../../components/ai/ChatInterface';
import { UsageDashboard } from '../../components/ai/UsageDashboard';
import { CostMonitor } from '../../components/ai/CostMonitor';
import { ConversationHistory } from '../../components/ai/ConversationHistory';
import { QuotaProvider } from '@/contexts/QuotaContext';

export default function AIChatPage() {
  return (
    <QuotaProvider>
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
    </QuotaProvider>
  );
}
