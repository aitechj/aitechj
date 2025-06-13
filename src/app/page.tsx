'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PasswordInput } from '../components/ui/PasswordInput';

export default function Home() {
  const [showSignup, setShowSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to AITechJ
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Master modern tech skills with AI as your personal tutor. Start learning for free today.
          </p>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setShowSignup(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
            >
              Free Learning
            </button>
            <a
              href="/auth/login"
              className="text-blue-600 hover:text-blue-800 px-8 py-3 rounded-lg font-semibold text-lg border border-blue-600 hover:border-blue-800 transition-colors"
            >
              Sign In
            </a>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            AI-Powered Technical Learning Platform
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                Interactive Learning
              </h3>
              <p className="text-gray-600">
                Engage with comprehensive tech curriculum designed for modern developers
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                AI Assistant
              </h3>
              <p className="text-gray-600">
                Get instant help and explanations from our advanced AI tutor
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                Track Progress
              </h3>
              <p className="text-gray-600">
                Monitor your learning journey with detailed progress tracking
              </p>
            </div>
          </div>
        </div>
      </div>

      {showSignup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Start Free Learning</h2>
              <button
                onClick={() => setShowSignup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  Password must contain: 8+ characters, uppercase, lowercase, number, and special character
                </div>
              </div>
              
              {error && (
                <div className="text-red-600 text-sm">
                  {error}
                  {error.includes('Password') && (
                    <div className="mt-1 text-xs">
                      Try: "MyPassw0rd!" or "SecureP@ss1"
                    </div>
                  )}
                </div>
              )}
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 px-4 rounded-md font-medium disabled:opacity-50"
              >
                {isLoading ? 'Creating Account...' : 'Create account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
