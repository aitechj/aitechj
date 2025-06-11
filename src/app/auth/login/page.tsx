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
    console.log('🔧 Setting up comprehensive vanilla JS authentication fallback');
    
    const setupVanillaAuth = () => {
      const checkElements = () => {
        const form = document.querySelector('form');
        const button = document.querySelector('button[type="submit"]');
        const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
        const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
        
        if (!form || !button || !emailInput || !passwordInput) {
          console.log('⏳ Waiting for form elements in useEffect...');
          setTimeout(checkElements, 100);
          return;
        }
        
        console.log('✅ All form elements found in useEffect, setting up handlers');
        
        const existingHandlers = (button as any)._vanillaAuthHandlers;
        if (existingHandlers) {
          button.removeEventListener('click', existingHandlers.click, true);
          form.removeEventListener('submit', existingHandlers.submit, true);
          console.log('🧹 Removed existing handlers');
        }
        
        const handleVanillaAuth = async (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          console.log('🔧 Vanilla JS authentication triggered from useEffect');
          console.log('🔧 Event type:', e.type, 'Target:', e.target);
          
          const email = emailInput.value.trim();
          const password = passwordInput.value.trim();
          
          console.log('🔧 Credentials captured from useEffect:', { 
            email: email, 
            hasPassword: !!password,
            emailLength: email.length,
            passwordLength: password.length
          });
          
          if (!email || !password) {
            console.error('❌ Missing credentials in useEffect handler');
            
            const existingError = document.querySelector('.auth-error');
            if (existingError) existingError.remove();
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'auth-error rounded-md bg-red-50 p-4 mt-4';
            errorDiv.innerHTML = '<div class="text-sm text-red-700">Please enter both email and password</div>';
            form.appendChild(errorDiv);
            
            return false;
          }
          
          (button as HTMLButtonElement).disabled = true;
          (button as HTMLButtonElement).textContent = 'Signing in...';
          
          const existingError = document.querySelector('.auth-error');
          if (existingError) existingError.remove();
          
          try {
            console.log('🔧 Making authentication request from useEffect');
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ email, password })
            });
            
            console.log('📡 Authentication response from useEffect:', {
              status: response.status,
              statusText: response.statusText,
              ok: response.ok,
              url: response.url
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log('✅ Authentication successful from useEffect:', data);
              
              if (data.tokens) {
                console.log('💾 Storing authentication tokens from useEffect');
                if (data.tokens.accessToken) {
                  localStorage.setItem('aitechj_access_token', data.tokens.accessToken);
                  console.log('💾 Access token stored successfully from useEffect');
                }
                if (data.tokens.refreshToken) {
                  localStorage.setItem('aitechj_refresh_token', data.tokens.refreshToken);
                  console.log('💾 Refresh token stored successfully from useEffect');
                }
                
                const storedAccess = localStorage.getItem('aitechj_access_token');
                const storedRefresh = localStorage.getItem('aitechj_refresh_token');
                console.log('🔍 Token storage verification from useEffect:', {
                  accessToken: !!storedAccess,
                  refreshToken: !!storedRefresh,
                  accessTokenLength: storedAccess ? storedAccess.length : 0
                });
              } else {
                console.log('⚠️ No tokens in response from useEffect, checking cookies');
                console.log('🍪 Current cookies from useEffect:', document.cookie);
              }
              
              console.log('🔄 Redirecting to admin dashboard from useEffect');
              console.log('🔄 About to set window.location.href to /admin');
              
              setTimeout(() => {
                console.log('🔄 Executing redirect via setTimeout');
                window.location.href = '/admin';
              }, 100);
              
              window.location.href = '/admin';
              
            } else {
              const errorText = await response.text();
              console.error('❌ Authentication failed from useEffect:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
              });
              
              let errorMessage = 'Login failed';
              try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorMessage;
                console.error('❌ Parsed error from useEffect:', errorData);
              } catch (e) {
                console.error('❌ Could not parse error response from useEffect');
              }
              
              const errorDiv = document.createElement('div');
              errorDiv.className = 'auth-error rounded-md bg-red-50 p-4 mt-4';
              errorDiv.innerHTML = `<div class="text-sm text-red-700">${errorMessage}</div>`;
              form.appendChild(errorDiv);
            }
          } catch (error) {
            console.error('🔥 Authentication error from useEffect:', error);
            console.error('🔥 Error details from useEffect:', {
              name: (error as Error).name,
              message: (error as Error).message,
              stack: (error as Error).stack
            });
            const errorDiv = document.createElement('div');
            errorDiv.className = 'auth-error rounded-md bg-red-50 p-4 mt-4';
            errorDiv.innerHTML = '<div class="text-sm text-red-700">Network error occurred. Please try again.</div>';
            form.appendChild(errorDiv);
          } finally {
            (button as HTMLButtonElement).disabled = false;
            (button as HTMLButtonElement).textContent = 'Sign in';
          }
          
          return false;
        };
        
        (button as any)._vanillaAuthHandlers = {
          click: handleVanillaAuth,
          submit: handleVanillaAuth
        };
        
        button.addEventListener('click', handleVanillaAuth, true);
        form.addEventListener('submit', handleVanillaAuth, true);
        
        console.log('✅ Vanilla JS authentication handlers attached from useEffect');
        
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleVanillaAuth(e);
          }
        };
        
        emailInput.addEventListener('keydown', handleKeyDown);
        passwordInput.addEventListener('keydown', handleKeyDown);
        
        console.log('✅ Keyboard handlers attached from useEffect');
        
        return () => {
          button.removeEventListener('click', handleVanillaAuth, true);
          form.removeEventListener('submit', handleVanillaAuth, true);
          emailInput.removeEventListener('keydown', handleKeyDown);
          passwordInput.removeEventListener('keydown', handleKeyDown);
          delete (button as any)._vanillaAuthHandlers;
          console.log('🧹 All event listeners removed from useEffect');
        };
      };
      
      return checkElements();
    };
    
    const cleanup = setupVanillaAuth();
    
    const timeout1 = setTimeout(setupVanillaAuth, 500);
    const timeout2 = setTimeout(setupVanillaAuth, 1000);
    
    return () => {
      if (cleanup) cleanup();
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, []); // No React dependencies - pure vanilla JS



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
