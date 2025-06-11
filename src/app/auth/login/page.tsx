'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { PasswordInput } from '../../../components/ui/PasswordInput';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🚀 handleSubmit called - form submission triggered');
    e.preventDefault();
    console.log('🚀 preventDefault called, setting loading state');
    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const formEmail = formData.get('email') as string || email;
      const formPassword = formData.get('password') as string || password;
      
      console.log('🚀 Form values - React state:', { email, password });
      console.log('🚀 Form values - FormData:', { formEmail, formPassword });
      console.log('🚀 About to call login function with:', formEmail);
      
      const result = await login(formEmail, formPassword);
      console.log('🚀 Login function returned:', result);
      
      if (result.success) {
        console.log('🚀 Login successful, redirecting to /admin');
        router.push('/admin');
      } else {
        console.log('🚀 Login failed:', result.error);
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      console.error('🚀 Login error caught:', err);
      setError('Network error occurred');
    } finally {
      console.log('🚀 Setting loading to false');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const setupDOMEventListeners = () => {
      console.log('🔧 Setting up pure DOM event listeners (bypassing React)');
      
      const button = document.querySelector('button[type="submit"]');
      const form = document.querySelector('form');
      
      if (button && form) {
        console.log('✅ Found button and form elements');
        
        const handleDOMClick = async (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🔧 DOM click handler triggered - bypassing React entirely');
          
          setIsLoading(true);
          setError('');
          
          try {
            const formData = new FormData(form as HTMLFormElement);
            const formEmail = formData.get('email') as string;
            const formPassword = formData.get('password') as string;
            
            console.log('🔧 DOM FormData captured:', { formEmail, formPassword });
            
            if (!formEmail || !formPassword) {
              console.log('❌ Missing credentials from DOM FormData');
              setError('Please enter both email and password');
              return;
            }
            
            console.log('🔧 Calling login with DOM-captured credentials');
            const result = await login(formEmail, formPassword);
            console.log('🔧 DOM login result:', result);
            
            if (result.success) {
              console.log('🔧 DOM login successful, redirecting to /admin');
              router.push('/admin');
            } else {
              console.log('🔧 DOM login failed:', result.error);
              setError(result.error || 'Login failed');
            }
          } catch (err) {
            console.error('🔧 DOM login error:', err);
            setError('Network error occurred');
          } finally {
            setIsLoading(false);
          }
        };
        
        button.addEventListener('click', handleDOMClick);
        console.log('✅ DOM click listener attached to button');
        
        return () => {
          button.removeEventListener('click', handleDOMClick);
          console.log('🧹 DOM click listener removed');
        };
      } else {
        console.log('❌ Button or form not found for DOM listeners');
      }
    };
    
    const cleanup = setupDOMEventListeners();
    
    return cleanup;
  }, [login, router, setIsLoading, setError]);



  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to AITechJ Admin
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access the content management system
          </p>
        </div>
        <form ref={formRef} className="mt-8 space-y-6" method="post" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <Button
              ref={buttonRef}
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Demo credentials: admin@aitechj.com / admin123
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
