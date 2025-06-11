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

        <script dangerouslySetInnerHTML={{
          __html: `
            console.log('🔧 Setting up direct vanilla JS authentication');
            
            function setupDirectAuth() {
              const form = document.querySelector('form');
              const button = document.querySelector('button[type="submit"]');
              const emailInput = document.querySelector('input[name="email"]');
              const passwordInput = document.querySelector('input[name="password"]');
              
              if (!form || !button || !emailInput || !passwordInput) {
                console.log('⏳ Waiting for form elements...');
                setTimeout(setupDirectAuth, 100);
                return;
              }
              
              console.log('✅ Direct auth: All form elements found');
              
              async function handleDirectAuth(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🔧 Direct vanilla JS authentication triggered');
                
                const email = emailInput.value.trim();
                const password = passwordInput.value.trim();
                
                console.log('🔧 Direct auth credentials:', { 
                  email: email, 
                  hasPassword: !!password 
                });
                
                if (!email || !password) {
                  console.error('❌ Direct auth: Missing credentials');
                  alert('Please enter both email and password');
                  return false;
                }
                
                button.disabled = true;
                button.textContent = 'Signing in...';
                
                try {
                  console.log('🔧 Direct auth: Making API request');
                  const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                  });
                  
                  console.log('📡 Direct auth response:', {
                    status: response.status,
                    ok: response.ok
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Direct auth successful:', data);
                    
                    if (data.tokens) {
                      console.log('💾 Direct auth: Storing tokens');
                      if (data.tokens.accessToken) {
                        localStorage.setItem('aitechj_access_token', data.tokens.accessToken);
                      }
                      if (data.tokens.refreshToken) {
                        localStorage.setItem('aitechj_refresh_token', data.tokens.refreshToken);
                      }
                    }
                    
                    console.log('🔄 Direct auth: Redirecting to /admin');
                    window.location.href = '/admin';
                    
                  } else {
                    const errorText = await response.text();
                    console.error('❌ Direct auth failed:', errorText);
                    alert('Login failed: ' + errorText);
                  }
                } catch (error) {
                  console.error('🔥 Direct auth error:', error);
                  alert('Network error occurred');
                } finally {
                  button.disabled = false;
                  button.textContent = 'Sign in';
                }
                
                return false;
              }
              
              form.addEventListener('submit', handleDirectAuth);
              button.addEventListener('click', handleDirectAuth);
              
              console.log('✅ Direct auth handlers attached');
            }
            
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', setupDirectAuth);
            } else {
              setupDirectAuth();
            }
            
            setTimeout(setupDirectAuth, 1000);
          `
        }} />

      </div>
    </div>
  );
}
