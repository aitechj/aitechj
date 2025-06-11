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
        
        const newButton = button.cloneNode(true) as HTMLButtonElement;
        button.parentNode?.replaceChild(newButton, button);
        
        const handleVanillaAuth = async (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          console.log('🔧 Vanilla JS authentication triggered from useEffect');
          
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
            setError('Please enter both email and password');
            return false;
          }
          
          newButton.disabled = true;
          newButton.textContent = 'Signing in...';
          setIsLoading(true);
          setError('');
          
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
              router.push('/admin');
              setTimeout(() => {
                window.location.replace('/admin');
              }, 1000);
              
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
              
              setError(errorMessage);
            }
          } catch (error) {
            console.error('🔥 Authentication error from useEffect:', error);
            console.error('🔥 Error details from useEffect:', {
              name: (error as Error).name,
              message: (error as Error).message,
              stack: (error as Error).stack
            });
            setError('Network error occurred. Please try again.');
          } finally {
            newButton.disabled = false;
            newButton.textContent = 'Sign in';
            setIsLoading(false);
          }
          
          return false;
        };
        
        newButton.addEventListener('click', handleVanillaAuth, true);
        form.addEventListener('submit', handleVanillaAuth, true);
        
        console.log('✅ Vanilla JS authentication handlers attached from useEffect');
        
        emailInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleVanillaAuth(e);
          }
        });
        
        passwordInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleVanillaAuth(e);
          }
        });
        
        console.log('✅ Keyboard handlers attached from useEffect');
        
        return () => {
          newButton.removeEventListener('click', handleVanillaAuth, true);
          form.removeEventListener('submit', handleVanillaAuth, true);
          emailInput.removeEventListener('keydown', handleVanillaAuth);
          passwordInput.removeEventListener('keydown', handleVanillaAuth);
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
