'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  queriesUsed: number;
  queriesLimit: number;
  subscriptionTier: string;
  topicsCount: number;
  progressPercentage: number;
  periodEnd: string;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  difficultyLevel: number;
  category: string;
  estimatedTime: number;
  progress: number;
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      fetchDashboardData();
    }
  }, [user, authLoading, router]);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, topicsResponse] = await Promise.all([
        fetch('/api/dashboard/stats', { credentials: 'include' }),
        fetch('/api/public/topics', { credentials: 'include' })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (topicsResponse.ok) {
        const topicsData = await topicsResponse.json();
        setTopics(topicsData.topics || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'guest_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-red-600">Failed to load dashboard data</div>
      </div>
    );
  }

  const progressPercentage = stats.queriesLimit > 0 ? (stats.queriesUsed / stats.queriesLimit) * 100 : 0;
  const periodText = stats.subscriptionTier === 'free' ? 'this period' : 'this month';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="text-blue-600 font-bold text-xl">🤖 AI Portal</div>
              <nav className="flex space-x-8">
                <a href="/dashboard" className="text-blue-600 font-medium">Dashboard</a>
                <a href="/subscription" className="text-gray-600 hover:text-gray-900">Subscription</a>
              </nav>
            </div>
            <div className="relative">
              <button
                onClick={handleSignOut}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name || user?.email?.split('@')[0] || 'User'}! 👋
          </h1>
          <p className="text-gray-600">Continue your learning journey with AI-powered assistance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">AI Queries Used</h3>
              <div className="text-blue-600">ℹ️</div>
            </div>
            <div className="mb-4">
              <div className="text-2xl font-bold text-gray-900">
                {stats.queriesUsed}
              </div>
              <div className="text-sm text-gray-600">
                of {stats.queriesLimit} {periodText}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Subscription</h3>
              <div className="text-blue-600">⚡</div>
            </div>
            <div className="mb-4">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  stats.subscriptionTier === 'premium' ? 'bg-purple-100 text-purple-800' :
                  stats.subscriptionTier === 'basic' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {stats.subscriptionTier.charAt(0).toUpperCase() + stats.subscriptionTier.slice(1)}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Upgrade for more features
              </div>
            </div>
            {stats.subscriptionTier !== 'premium' && (
              <button
                onClick={() => router.push('/subscription')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm font-medium"
              >
                Upgrade
              </button>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Topics Available</h3>
              <div className="text-blue-600">📚</div>
            </div>
            <div className="mb-4">
              <div className="text-2xl font-bold text-gray-900">
                {stats.topicsCount}
              </div>
              <div className="text-sm text-gray-600">
                Access all difficulty levels
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Progress</h3>
              <div className="text-blue-600">🏆</div>
            </div>
            <div className="mb-4">
              <div className="text-2xl font-bold text-gray-900">
                {stats.progressPercentage}%
              </div>
              <div className="text-sm text-gray-600">
                Overall completion
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Learning Topics</h2>
                <p className="text-gray-600">Choose from our comprehensive technology curriculum</p>
              </div>
              <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                View All Topics
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.slice(0, 6).map((topic) => (
                <div key={topic.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-blue-600 text-2xl">📖</div>
                    <div className="text-xs text-gray-500">
                      {topic.difficultyLevel} levels
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2">{topic.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{topic.description}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>⏱️ {topic.estimatedTime || 2}-4 hours</span>
                    <span>👥 1.2k students</span>
                    <span>⭐ 4.8</span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="text-xs text-gray-600 mb-1">Progress</div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-gray-900 h-1 rounded-full"
                        style={{ width: `${topic.progress || 15}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{topic.progress || 15}%</div>
                  </div>
                  
                  <button className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2 px-4 rounded text-sm font-medium">
                    Continue Learning →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
