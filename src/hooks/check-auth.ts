"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase/client';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/authentication');
          return;
        }
        
        setUser(session.user);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/authentication');
      } finally {
        setLoading(false);
      }
    }
    
    checkAuth();
  }, [router]);

  return { user, loading };
}