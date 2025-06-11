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
            console.log('🔧 Setting up robust vanilla JS authentication - v3');
            
            function setupRobustAuth() {
              const form = document.querySelector('form');
              const button = document.querySelector('button[type="submit"]');
              const emailInput = document.querySelector('input[name="email"]');
              const passwordInput = document.querySelector('input[id="password"]') || document.querySelector('input[name="password"]');
              
              if (!form || !button || !emailInput || !passwordInput) {
                console.log('⏳ Waiting for form elements...');
                setTimeout(setupRobustAuth, 100);
                return;
              }
              
              console.log('✅ Robust auth: All form elements found');
              
              async function executeAuthentication() {
                console.log('🔧 ROBUST: Authentication execution started');
                
                const email = emailInput.value.trim();
                const password = passwordInput.value.trim();
                
                console.log('🔧 ROBUST: Credentials captured:', { 
                  email: email, 
                  hasPassword: !!password 
                });
                
                if (!email || !password) {
                  console.error('❌ ROBUST: Missing credentials');
                  alert('Please enter both email and password');
                  return false;
                }
                
                button.disabled = true;
                button.textContent = 'Signing in...';
                
                try {
                  console.log('🔧 ROBUST: Making API request to /api/auth/login');
                  const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                  });
                  
                  console.log('📡 ROBUST: API response received:', {
                    status: response.status,
                    ok: response.ok,
                    statusText: response.statusText
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    console.log('✅ ROBUST: Authentication successful:', data);
                    
                    if (data.tokens) {
                      console.log('💾 ROBUST: Storing authentication tokens');
                      if (data.tokens.accessToken) {
                        localStorage.setItem('aitechj_access_token', data.tokens.accessToken);
                      }
                      if (data.tokens.refreshToken) {
                        localStorage.setItem('aitechj_refresh_token', data.tokens.refreshToken);
                      }
                    }
                    
                    console.log('🔄 ROBUST: Redirecting to admin dashboard');
                    window.location.href = '/admin';
                    return true;
                    
                  } else {
                    const errorText = await response.text();
                    console.error('❌ ROBUST: Authentication failed:', errorText);
                    alert('Login failed: ' + errorText);
                    return false;
                  }
                } catch (error) {
                  console.error('🔥 ROBUST: Network error:', error);
                  alert('Network error occurred: ' + error.message);
                  return false;
                } finally {
                  button.disabled = false;
                  button.textContent = 'Sign in';
                }
              }
              
              function attachRobustHandlers() {
                console.log('🔧 ROBUST: Attaching multiple event handlers');
                
                form.onsubmit = function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔧 ROBUST: Form onsubmit triggered');
                  executeAuthentication();
                  return false;
                };
                
                button.onclick = function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔧 ROBUST: Button onclick triggered');
                  executeAuthentication();
                  return false;
                };
                
                try {
                  form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔧 ROBUST: Form addEventListener triggered');
                    executeAuthentication();
                  }, true);
                  
                  button.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔧 ROBUST: Button addEventListener triggered');
                    executeAuthentication();
                  }, true);
                } catch (err) {
                  console.warn('⚠️ ROBUST: addEventListener failed:', err);
                }
                
                const originalSubmit = form.submit;
                form.submit = function() {
                  console.log('🔧 ROBUST: Form.submit() override triggered');
                  executeAuthentication();
                };
                
                console.log('✅ ROBUST: All event handlers attached successfully');
              }
              
              attachRobustHandlers();
              
              window.testAuth = executeAuthentication;
              console.log('🔧 ROBUST: Test function available as window.testAuth()');
            }
            
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', setupRobustAuth);
            } else {
              setupRobustAuth();
            }
            
            setTimeout(setupRobustAuth, 500);
            setTimeout(setupRobustAuth, 1000);
            setTimeout(setupRobustAuth, 2000);
          `
        }} />

      </div>
    </div>
  );
}
