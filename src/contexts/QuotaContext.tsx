'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface QuotaData {
  used: number;
  quota: number;
  resetDate: string;
}

interface QuotaContextType {
  quota: QuotaData | null;
  refreshQuota: () => Promise<void>;
}

const QuotaContext = createContext<QuotaContextType>({
  quota: null,
  refreshQuota: async () => {},
});

export const useQuota = () => useContext(QuotaContext);

interface QuotaProviderProps {
  children: ReactNode;
}

export function QuotaProvider({ children }: QuotaProviderProps) {
  const [quota, setQuota] = useState<QuotaData | null>(null);

  const refreshQuota = async () => {
    try {
      const response = await fetch('/api/ai/quota', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setQuota({
          used: data.used,
          quota: data.quota,
          resetDate: data.resetDate
        });
      } else {
        console.error('Quota API returned error:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
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
      {children}
    </QuotaContext.Provider>
  );
}
