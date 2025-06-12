'use client';
import { ChatInterface } from '../../components/ai/ChatInterface';
import { UsageDashboard } from '../../components/ai/UsageDashboard';
import { CostMonitor } from '../../components/ai/CostMonitor';
import { ConversationHistory } from '../../components/ai/ConversationHistory';
import { QuotaProvider } from '@/contexts/QuotaContext';
import { Button } from '../../components/ui/Button';
import { useRouter } from 'next/navigation';

export default function AIChatPage() {
  const router = useRouter();

  return (
    <QuotaProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => router.push('/')}
              className="mb-4"
            >
              ← Back to Home
            </Button>
          </div>
          
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
