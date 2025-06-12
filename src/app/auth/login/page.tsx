'use client';
export const dynamic = 'force-dynamic';

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
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const formEmail = formData.get('email') as string || email;
      const formPassword = formData.get('password') as string || password;
      const result = await login(formEmail, formPassword);

      if (result.success) {
        router.push('/admin');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
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
        <form ref={formRef} className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
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

        {/* Inject vanilla JS fallback */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
console.log("🔍 Login script loaded in: ", window.location.hostname);
console.log("🔍 Script execution timestamp: ", new Date().toISOString());

(function setup() {
  console.log("🔍 Setup function executing...");
  const form = document.querySelector('form');
  const button = document.querySelector('button[type="submit"]');
  const emailInput = document.querySelector('input[name="email"]');
  const passwordInput = document.querySelector('input[name="password"]');
  
  console.log("🔍 Form elements found:", {
    form: !!form,
    button: !!button,
    emailInput: !!emailInput,
    passwordInput: !!passwordInput
  });
  
  if (!form || !button || !emailInput || !passwordInput) {
    console.warn("⚠️ Missing required form elements - setup aborted");
    return;
  }

  async function executeAuthentication() {
    console.log('🧠 Running robust fallback authentication');
    console.log('📤 Attempting login...');
    
    const emailInput = document.querySelector('input[name="email"]');
    const passwordInput = document.querySelector('input[name="password"]');
    const email = emailInput?.value?.trim() || '';
    const password = passwordInput?.value?.trim() || '';
    
    console.log('🔍 Captured values:', { email, password: password ? '[REDACTED]' : '', passwordLength: password.length });
    
    if (!email || !password) {
      console.warn('⚠️ Missing email or password');
      return alert('Email and password are required.');
    }

    button.disabled = true;
    button.textContent = 'Signing in...';
    console.log('🔄 Button state updated, making fetch request...');

    try {
      console.log('🌐 Fetching /api/auth/login...');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      console.log('🧾 Response received:', { status: response.status, ok: response.ok });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Login success, response data:', data);
        console.log('🔄 Redirecting to /admin...');
        window.location.href = '/admin';
      } else {
        const errText = await response.text();
        console.error('❌ Login failed:', errText);
        alert('Login failed: ' + (errText || 'Unknown error'));
      }
    } catch (e) {
      console.error('🔥 Network error during fetch:', e);
      alert('Network error occurred');
    } finally {
      button.disabled = false;
      button.textContent = 'Sign in';
      console.log('🔄 Button state reset');
    }
  }

  console.log('🔗 Attaching event listeners...');
  
  button.addEventListener('click', (e) => {
    console.log('🖱️ Button click event triggered');
    e.preventDefault();
    e.stopPropagation();
    executeAuthentication();
  });

  form.addEventListener('submit', (e) => {
    console.log('📝 Form submit event triggered');
    e.preventDefault();
    e.stopPropagation();
    executeAuthentication();
  });
  
  console.log('✅ Event listeners attached successfully');
})();

console.log("🔍 Login script setup completed");
            `
          }}
        />
      </div>
    </div>
  );
}
