"use client"


import SubscriptionForm from "@/components/subscription-form";
import { useAuth } from "@/hooks/check-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {

  if (!loading && !user) {
  router.push("/authentication");
  }
}, [user, router, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"></div>
          <div className="mt-4 text-white text-lg">Loading...</div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white p-16">
      <SubscriptionForm />
    </div>
  );
}
