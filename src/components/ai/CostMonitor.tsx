'use client';
import React, { useState, useEffect } from 'react';

export function CostMonitor() {
  const [costData, setCostData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCostData();
    const interval = setInterval(fetchCostData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchCostData = async () => {
    try {
      const response = await fetch('/api/ai/cost');
      if (response.ok) {
        const data = await response.json();
        setCostData(data);
      }
    } catch (error) {
      console.error('Failed to fetch cost data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading cost data...</div>;
  if (!costData) return null;

  const warningPercentage = (costData.totalCost / costData.warningThreshold) * 100;
  const emergencyPercentage = (costData.totalCost / costData.emergencyThreshold) * 100;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">AI Cost Monitor</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Monthly Cost</span>
            <span>${costData.totalCost.toFixed(2)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                emergencyPercentage >= 100 ? 'bg-red-500' :
                warningPercentage >= 100 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(emergencyPercentage, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Tokens Used:</span>
            <div className="font-semibold">{costData.tokensUsed?.toLocaleString() || '0'}</div>
          </div>
          <div>
            <span className="text-gray-600">Warning Threshold:</span>
            <div className="font-semibold">${costData.warningThreshold}</div>
          </div>
        </div>

        {costData.shouldShutdown && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800 font-semibold">
              🚨 Emergency shutdown activated! Cost limit exceeded.
            </p>
          </div>
        )}

        {costData.shouldWarn && !costData.shouldShutdown && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ Warning: Approaching cost limit (${costData.warningThreshold})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
