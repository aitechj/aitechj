'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { shouldUseLocalStorage } from '@/lib/auth/environment';

interface QuotaData {
  used: number;
  quota: number;
  resetDate: string;
}

interface QuotaContextType {
  quota: QuotaData | null;
  refreshQuota: (retryCount?: number) => Promise<void>;
  setQuota: React.Dispatch<React.SetStateAction<QuotaData | null>>;
}

const QuotaContext = createContext<QuotaContextType>({
  quota: null,
  refreshQuota: async () => {},
  setQuota: () => {},
});

export const useQuota = () => useContext(QuotaContext);

interface QuotaProviderProps {
  children: ReactNode;
}

export function QuotaProvider({ children }: QuotaProviderProps) {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const { getAuthHeaders } = useAuth();

  const refreshQuota = async (retryCount = 0) => {
    try {
      const threadId = localStorage.getItem('threadId');
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json'
      };
      if (threadId) {
        headers['X-Thread-ID'] = threadId;
      }
      
      console.log('🔍 QuotaContext: Making quota API call with cookies only (no Authorization header)');
      const response = await fetch('/api/ai/quota', {
        credentials: 'include',
        headers
      });
      if (response.ok) {
        const data = await response.json();
        setQuota({
          used: data.used,
          quota: data.quota,
          resetDate: data.resetDate
        });
        
        if (shouldUseLocalStorage() && data.guestToken) {
          const { setAuthToken } = await import('@/lib/auth/client-storage');
          setAuthToken('guest', data.guestToken);
        }
      } else {
        throw new Error(`Quota API returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to refresh quota:', error);
      
      if (retryCount < 3) { // QUOTA_CONFIG.RETRY_ATTEMPTS would be ideal but not accessible here
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        setTimeout(() => {
          refreshQuota(retryCount + 1);
        }, delay);
      }
    }
  };

  useEffect(() => {
    refreshQuota();
  }, []);

  return (
    <QuotaContext.Provider value={{ quota, refreshQuota, setQuota }}>
      {children}
    </QuotaContext.Provider>
  );
}
