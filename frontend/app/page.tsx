'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loadFromLocalStorage } = useAppStore();

  useEffect(() => {
    loadFromLocalStorage();
    // Redirect to dashboard if authenticated, otherwise to login
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [isAuthenticated, router, loadFromLocalStorage]);

  return null;
}
