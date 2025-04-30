"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import supabase from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getOrCreateBurnerWallet } from '@/lib/burner-wallet';

export default function AuthForms() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Check for existing session on component mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
      }
    };
    
    checkSession();
    
    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setCurrentUser(session.user);
        } else {
          setCurrentUser(null);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  useEffect(() => {
    if (currentUser) {
      console.log("Current user:", currentUser);
    }
  }, [currentUser]);

  // Toggle between login and signup forms
  const toggleForm = () => {
    setIsLogin(!isLogin);
    setMessage({ type: '', content: '' });
  };

  // Comprehensive function to update or create user profile
  const updateUserProfile = async (user: any) => {
    try {
      if (!user) return;
      
      // Get the burner wallet for this user
      const burnerWallet = getOrCreateBurnerWallet();
      
      // Check if user already exists in our custom table
      const { data: existingUser, error: fetchError } = await supabase
        .from('user')
        .select('*')
        .eq('id', user.id)
        .single();
      
      console.log("Existing user data:", existingUser);
      
      // Prepare user data object with all necessary fields
      const userData = {
        id: user.id,
        email_address: user.email,
        name: user.user_metadata?.full_name || name || user.user_metadata?.name || 'User',
        burner_wallet_address: burnerWallet.publicKey.toString(),
        updated_at: new Date().toISOString()
      };
      
      if (existingUser) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('user')
          .update(userData)
          .eq('id', user.id);
          
        if (updateError) throw updateError;
      } else {
        // Create new user with complete data
        const { error: insertError } = await supabase
          .from('user')
          .insert([{
            ...userData,
            nft_address: [],
            created_at: new Date().toISOString()
          }]);
          

      }
      
      console.log('User profile updated successfully');
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', content: '' });
  
    try {
      if (isLogin) {
        // Login user
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
  
        if (error) throw error;
        
        setMessage({ type: 'success', content: 'Successfully logged in!' });
        
        // Redirect to dashboard after a brief delay
        setTimeout(() => router.push('/'), 1000);
        console.log("User logged in successfully:", data.user);
        console.log("User session:", data.session);
  
      } else {
        // Sign up new user
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
  
        if (error) throw error;
        
        console.log("User signed up successfully:", data.user);
        
        // Immediately create user profile after successful signup
        if (data.user) {
          try {
            // Get the burner wallet for this user
            const burnerWallet = getOrCreateBurnerWallet();
            
            // Create user record directly
            const { error: insertError } = await supabase
              .from('user')
              .insert([{
                id: data.user.id,
                email_address: data.user.email,
                name: name || data.user.user_metadata?.full_name || 'User',
                burner_wallet_address: burnerWallet.publicKey.toString(),
                nft_address: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]);
              
            if (insertError) {
              console.error('Error creating user profile:', insertError);
              // Still allow the signup to be considered successful
            } else {
              console.log('User profile created successfully');
            }
          } catch (profileError) {
            console.error('Error creating user profile:', profileError);
            // Still allow the signup to be considered successful
          }
        }
        
        setMessage({ 
          type: 'success', 
          content: 'Registration successful! Please check your email for verification.' 
        });
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        content: error.message || 'An error occurred during authentication.' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Social login handlers
  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth-callback`,
        },
      });
      
      if (error) throw error;
      
      // User profile will be updated in the auth-callback page
      
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        content: `Error signing in with ${provider}: ${error.message}` 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full relative">
        {/* Background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-800/30 to-cyan-800/30 rounded-xl blur-xl -z-10"></div>
        
        <div className="bg-slate-800/70 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 p-8">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="mx-auto h-14 w-14 relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 animate-pulse"></div>
              <div className="absolute inset-1 rounded-full bg-slate-800 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm4.28 10.28a.75.75 0 000-1.06l-3-3a.75.75 0 10-1.06 1.06l1.72 1.72H8.25a.75.75 0 000 1.5h5.69l-1.72 1.72a.75.75 0 101.06 1.06l3-3z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <h2 className="mt-4 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
              {isLogin ? 'Sign in to your account' : 'Create a new account'}
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              {isLogin 
                ? 'Enter your credentials to access your account' 
                : 'Fill in your information to get started'}
            </p>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Name field (sign up only) */}
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                  Name
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={!isLogin}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-slate-600 bg-slate-700/50 backdrop-blur-sm rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
                  />
                </div>
              </div>
            )}
            
            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-600 bg-slate-700/50 backdrop-blur-sm rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
              </div>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-600 bg-slate-700/50 backdrop-blur-sm rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
                />
              </div>
            </div>

            {/* Alert Message */}
            {message.content && (
              <div 
                className={`p-3 rounded-md ${
                  message.type === 'error' 
                    ? 'bg-red-900/50 border border-red-500/30 text-red-200' 
                    : 'bg-green-900/50 border border-green-500/30 text-green-200'
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
            )}

            {/* Submit button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-white bg-gradient-to-r from-indigo-600 to-cyan-700 hover:from-indigo-500 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  isLogin ? 'Sign in' : 'Sign up'
                )}
              </button>
            </div>
          </form>

          {/* Social Login */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-800 text-gray-400">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {/* Google */}
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-slate-700/50 hover:bg-slate-700 text-sm font-medium text-gray-300 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
                </svg>
              </button>

              {/* GitHub */}
              <button
                type="button"
                onClick={() => handleSocialLogin('github')}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-slate-700/50 hover:bg-slate-700 text-sm font-medium text-gray-300 transition-colors"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Toggle between login/signup */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-400">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <button
                type="button"
                onClick={toggleForm}
                className="font-medium text-indigo-400 hover:text-indigo-300 focus:outline-none transition-colors"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}