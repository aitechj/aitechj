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
      
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            console.log('🔧 Initializing vanilla JS authentication fallback');
            
            function initVanillaAuth() {
              console.log('🔧 Setting up vanilla auth handlers');
              
              const checkElements = () => {
                const form = document.querySelector('form');
                const button = document.querySelector('button[type="submit"]');
                const emailInput = document.querySelector('input[name="email"]');
                const passwordInput = document.querySelector('input[name="password"]');
                
                if (!form || !button || !emailInput || !passwordInput) {
                  console.log('⏳ Waiting for form elements...');
                  setTimeout(checkElements, 100);
                  return;
                }
                
                console.log('✅ All form elements found, setting up handlers');
                
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                async function handleVanillaAuth(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation();
                  
                  console.log('🔧 Vanilla JS authentication triggered');
                  
                  const email = emailInput.value.trim();
                  const password = passwordInput.value.trim();
                  
                  console.log('🔧 Credentials captured:', { 
                    email: email, 
                    hasPassword: !!password,
                    emailLength: email.length,
                    passwordLength: password.length
                  });
                  
                  if (!email || !password) {
                    console.error('❌ Missing credentials');
                    alert('Please enter both email and password');
                    return false;
                  }
                  
                  newButton.disabled = true;
                  newButton.textContent = 'Signing in...';
                  
                  try {
                    console.log('🔧 Making authentication request');
                    const response = await fetch('/api/auth/login', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                      },
                      body: JSON.stringify({ email, password })
                    });
                    
                    console.log('📡 Authentication response:', {
                      status: response.status,
                      statusText: response.statusText,
                      ok: response.ok,
                      url: response.url
                    });
                    
                    if (response.ok) {
                      const data = await response.json();
                      console.log('✅ Authentication successful:', data);
                      
                      if (data.tokens) {
                        console.log('💾 Storing authentication tokens');
                        if (data.tokens.accessToken) {
                          localStorage.setItem('aitechj_access_token', data.tokens.accessToken);
                          console.log('💾 Access token stored successfully');
                        }
                        if (data.tokens.refreshToken) {
                          localStorage.setItem('aitechj_refresh_token', data.tokens.refreshToken);
                          console.log('💾 Refresh token stored successfully');
                        }
                        
                        const storedAccess = localStorage.getItem('aitechj_access_token');
                        const storedRefresh = localStorage.getItem('aitechj_refresh_token');
                        console.log('🔍 Token storage verification:', {
                          accessToken: !!storedAccess,
                          refreshToken: !!storedRefresh,
                          accessTokenLength: storedAccess ? storedAccess.length : 0
                        });
                      } else {
                        console.log('⚠️ No tokens in response, checking cookies');
                        console.log('🍪 Current cookies:', document.cookie);
                      }
                      
                      console.log('🔄 Redirecting to admin dashboard');
                      window.location.replace('/admin');
                      
                    } else {
                      const errorText = await response.text();
                      console.error('❌ Authentication failed:', {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorText
                      });
                      
                      let errorMessage = 'Login failed';
                      try {
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.error || errorMessage;
                        console.error('❌ Parsed error:', errorData);
                      } catch (e) {
                        console.error('❌ Could not parse error response');
                      }
                      
                      alert(errorMessage);
                    }
                  } catch (error) {
                    console.error('🔥 Authentication error:', error);
                    console.error('🔥 Error details:', {
                      name: error.name,
                      message: error.message,
                      stack: error.stack
                    });
                    alert('Network error occurred. Please try again.');
                  } finally {
                    newButton.disabled = false;
                    newButton.textContent = 'Sign in';
                  }
                  
                  return false;
                }
                
                newButton.addEventListener('click', handleVanillaAuth, true);
                form.addEventListener('submit', handleVanillaAuth, true);
                
                console.log('✅ Vanilla JS authentication handlers attached successfully');
                
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
                
                console.log('✅ Keyboard handlers attached');
              };
              
              checkElements();
            }
            
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', initVanillaAuth);
              console.log('⏳ Waiting for DOM to load');
            } else {
              console.log('✅ DOM already loaded, initializing immediately');
              initVanillaAuth();
            }
            
            setTimeout(initVanillaAuth, 500);
            setTimeout(initVanillaAuth, 1000);
            
          })();
        `
      }} />
    </div>
  );
}
