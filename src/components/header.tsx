"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase/client';
import { useAuth } from '@/hooks/check-auth';

export default function Header() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLoginClick = () => {
    router.push('/authentication');
  };

  const handleProfileClick = () => {
    router.push('/profile');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/authentication');
  };

  return (
    <header className="bg-indigo-900/90 backdrop-blur-md sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
              <div className="flex-shrink-0">
                <Link href="/" className="flex items-center">
                  <img 
                    src="/logoSubmint.svg" 
                    alt="SubMint Logo" 
                    className="h-24 w-24"
                  />
                  <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
                    SubMint
                  </span>
                </Link>
              </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {!loading && user ? (
              <>
                <div className="text-slate-300 text-sm">
                  Welcome, <span className="font-medium text-indigo-300">{user.user_metadata?.name || user.user_metadata?.full_name || user.email}</span>
                </div>
                <button
                  onClick={handleProfileClick}
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-white/10 rounded-md shadow-sm text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={handleLoginClick}
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-cyan-700 hover:from-indigo-500 hover:to-cyan-600 transition-all duration-300 transform hover:-translate-y-1"
              >
                Log In
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            >
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden border-t border-white/10`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {!loading && user ? (
            <>
              <div className="px-3 py-2 text-slate-300">
                Welcome, <span className="font-medium text-indigo-300">{user.user_metadata?.name || user.user_metadata?.full_name || user.email}</span>
              </div>
              <button
                onClick={handleProfileClick}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-slate-800 transition-colors"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={handleLoginClick}
              className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-cyan-700 hover:from-indigo-500 hover:to-cyan-600"
            >
              LOG IN
            </button>
          )}
        </div>
      </div>
    </header>
  );
}