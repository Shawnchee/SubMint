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
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // No session found, redirect to login
          router.push('/authentication');
          setLoading(false); // Make sure to set loading to false here too!
          return;
        }
        
        // User is authenticated
        setUser(session.user);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/authentication');
      } finally {
        // Always set loading to false when done
        setLoading(false);
      }
    }
    
    checkAuth();
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        setLoading(false);
      }
    );
    
    // Cleanup listener
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return { user, loading };
}