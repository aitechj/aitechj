'use client';
import { useState, useEffect } from 'react';

export function UsageDashboard() {
  const [quota, setQuota] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuota();
  }, []);

  const fetchQuota = async () => {
    try {
      const response = await fetch('/api/ai/quota');
      const data = await response.json();
      setQuota(data);
    } catch (error) {
      console.error('Failed to fetch quota:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!quota) return <div>Unable to load usage data</div>;

  const percentage = (quota.used / quota.limit) * 100;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">AI Usage</h3>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Questions Used</span>
          <span>{quota.used}/{quota.limit}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <p>Resets: {new Date(quota.resetDate).toLocaleDateString()}</p>
      </div>

      {percentage >= 100 ? (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">
            You've reached your monthly limit. Upgrade your plan to continue asking questions.
          </p>
        </div>
      ) : percentage > 80 ? (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            You're approaching your monthly limit. Consider upgrading for more questions.
          </p>
        </div>
      ) : null}
    </div>
  );
}
