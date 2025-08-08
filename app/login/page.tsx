'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Form } from '@heroui/form';
import { Input } from '@heroui/input';
import { InputOtp } from '@heroui/input-otp';
import { Button } from '@heroui/button';

import { useUserStore } from '@/lib/store/userStore';

export default function LoginPage() {
  const loginUser = useUserStore((state) => state.login);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);

  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const memberEmail = 'member@valid.email';
  const memberPass = 'Member123!';
  const memberOtp = '151588';

  const partnerEmail = 'partner@valid.email';
  const partnerPass = 'Partner123!';
  const partnerOtp = '262699';

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!email || !password || !otp) {
      setError('Please fill in all fields.');
      setIsLoading(false);

      return;
    }

    let userType: 'member' | 'partner' | null = null;
    let userEmail: string | null = null;

    if (email === memberEmail && password === memberPass && otp === memberOtp) {
      userType = 'member';
      userEmail = email;
    } else if (email === partnerEmail && password === partnerPass && otp === partnerOtp) {
      userType = 'partner';
      userEmail = email;
    } else {
      setError('Invalid email, password, or OTP.');
    }

    setIsLoading(false);

    if (userType && userEmail) {
      loginUser(userType, userEmail);
    }
  };

  return (
    <div className="user-form-wrapper">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-gray-100">Login</h1>
      <Form
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-white p-8 shadow-md dark:bg-gray-800"
        onSubmit={handleSubmit}
      >
        <Input
          isInvalid={!!error && email !== memberEmail && email !== partnerEmail}
          label="Email"
          placeholder="Enter your email"
          type="email"
          value={email}
          onValueChange={setEmail}
        />
        <Input
          isInvalid={!!error && password !== memberPass && password !== partnerPass}
          label="Password"
          placeholder="Enter your password"
          type="password"
          value={password}
          onValueChange={setPassword}
        />
        <InputOtp
          isInvalid={!!error && otp !== memberOtp && otp !== partnerOtp}
          label="OTP"
          length={6}
          value={otp}
          onValueChange={setOtp}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button color="primary" isDisabled={isLoading} isLoading={isLoading} type="submit">
          {isLoading ? 'Logging In...' : 'Log In'}
        </Button>
      </Form>
    </div>
  );
}
