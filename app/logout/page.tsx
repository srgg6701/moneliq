'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@heroui/button';

import { useUserStore } from '@/lib/store/userStore';

export default function LogoutPage() {
  const logoutUser = useUserStore((state) => state.logout);

  useEffect(() => {
    logoutUser();
  }, [logoutUser]);

  return (
    <div className="user-form-wrapper">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
        You have been logged out.
      </h1>
      <p className="mb-8 text-lg text-gray-700 dark:text-gray-300">
        Thank you for using our service.
      </p>
      <Link href="/login">
        <Button color="primary" variant="solid">
          Go to Login Page
        </Button>
      </Link>
    </div>
  );
}
