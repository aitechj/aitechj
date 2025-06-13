'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface SubscriptionData {
  currentTier: string;
  queriesUsed: number;
  queriesLimit: number;
  periodEnd: string;
}

export default function SubscriptionPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      fetchSubscriptionData();
    }
  }, [user, authLoading, router]);

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/dashboard/stats', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData({
          currentTier: data.subscriptionTier,
          queriesUsed: data.queriesUsed,
          queriesLimit: data.queriesLimit,
          periodEnd: data.periodEnd
        });
      }
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    try {
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier })
      });

      if (response.ok) {
        await fetchSubscriptionData();
        alert(`Successfully upgraded to ${tier} plan!`);
      } else {
        alert('Upgrade failed. Please try again.');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Upgrade failed. Please try again.');
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

  if (!subscriptionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-red-600">Failed to load subscription data</div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="text-blue-600 font-bold text-xl">🤖 AI Portal</div>
              <nav className="flex space-x-8">
                <a href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</a>
                <a href="/subscription" className="text-blue-600 font-medium">Subscription</a>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Learning Plan</h1>
          <p className="text-gray-600">Unlock the full potential of AI-powered learning with our flexible subscription plans</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Current Subscription</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-800">
                You're currently on the{' '}
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  subscriptionData.currentTier === 'premium' ? 'bg-purple-100 text-purple-800' :
                  subscriptionData.currentTier === 'basic' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {subscriptionData.currentTier.charAt(0).toUpperCase() + subscriptionData.currentTier.slice(1)}
                </span>{' '}
                plan
              </p>
              <p className="text-blue-700 text-sm mt-1">
                {subscriptionData.queriesUsed} of {subscriptionData.queriesLimit} AI queries used this month
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-900 font-semibold">
                {subscriptionData.currentTier.charAt(0).toUpperCase() + subscriptionData.currentTier.slice(1)}
              </p>
              <p className="text-blue-700 text-sm">
                Expires: {formatDate(subscriptionData.periodEnd)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <div className="text-center mb-6">
              <div className="text-blue-600 text-4xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Basic</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                $8<span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600">Perfect for getting started with AI-powered learning</p>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center text-gray-700">
                <span className="text-green-500 mr-3">✓</span>
                50 AI queries per month
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-green-500 mr-3">✓</span>
                Access to Novice & Intermediate content
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-green-500 mr-3">✓</span>
                Progress tracking
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-green-500 mr-3">✓</span>
                Email support
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-green-500 mr-3">✓</span>
                Mobile app access
              </li>
            </ul>
            
            {subscriptionData.currentTier === 'basic' ? (
              <div className="w-full bg-gray-100 text-gray-500 py-3 px-4 rounded-lg text-center font-medium">
                Current Plan
              </div>
            ) : (
              <button
                onClick={() => handleUpgrade('basic')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Upgrade to Basic
              </button>
            )}
          </div>

          <div className="bg-white border-2 border-blue-500 rounded-lg p-8 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                🏆 Most Popular
              </span>
            </div>
            
            <div className="text-center mb-6">
              <div className="text-purple-600 text-4xl mb-4">👑</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                $12<span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600">For serious learners who want unlimited access</p>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center text-gray-700">
                <span className="text-green-500 mr-3">✓</span>
                200 AI queries per month
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-green-500 mr-3">✓</span>
                Access to ALL content levels (including Pro)
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-green-500 mr-3">✓</span>
                Advanced progress analytics
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-green-500 mr-3">✓</span>
                Priority support
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-green-500 mr-3">✓</span>
                Early access to new features
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-green-500 mr-3">✓</span>
                Downloadable resources
              </li>
            </ul>
            
            {subscriptionData.currentTier === 'premium' ? (
              <div className="w-full bg-gray-100 text-gray-500 py-3 px-4 rounded-lg text-center font-medium">
                Current Plan
              </div>
            ) : (
              <button
                onClick={() => handleUpgrade('premium')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Upgrade to Premium
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I change my plan anytime?</h3>
              <p className="text-gray-600 text-sm">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What happens to unused AI queries?</h3>
              <p className="text-gray-600 text-sm">
                AI queries reset monthly and don't roll over. Make sure to use them before your billing cycle ends!
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is there a free trial?</h3>
              <p className="text-gray-600 text-sm">
                New users get 30 days of Basic plan access to try out the platform.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How does billing work?</h3>
              <p className="text-gray-600 text-sm">
                You're billed monthly on the date you first subscribed. All payments are processed securely through Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
