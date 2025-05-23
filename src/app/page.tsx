"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/check-auth"
import { Button } from "@/components/ui/button"
import { ArrowRight, CreditCard, BarChart3, Shield } from "lucide-react"
import SubscriptionForm from "@/components/subscription-form"
import TypewriterComponent from "@/components/typewriter"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const featuresRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && user) {
      // If user is already logged in, we can keep them on the landing page
      // They can navigate to profile using the nav button
    }
  }, [user, router, loading])

  const handleGetStarted = () => {
    if (user) {
      document.getElementById("subscription-form")?.scrollIntoView({ behavior: "smooth" })
    } else {
      router.push("/authentication")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500"></div>
          <div className="mt-4 text-white text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full filter blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-cyan-300 to-purple-300 leading-normal">
              Manage Your
            </h1>

            <div className="text-3xl md:text-7xl font-extrabold text-white mb-6 h-24 flex items-center justify-center">
              <TypewriterComponent
                texts={["Cursor Pro", "GPT Plus", "YouTube Premium", "Spotify Premium", "Netflix", "Adobe Creative Cloud", "Amazon Prime","Apple One","Disney+","HBO Max","Microsoft 365","Dropbox Plus","Grammarly Premium","Crunchyroll Premium","Canva Pro", "Notion AI"]}
              />
            </div>

            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Subscriptions with NFTs</h2>

            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Tired of managing countless subscriptions across different platforms? Take control of all your digital
              services in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleGetStarted}
                className="bg-gradient-to-r cursor-pointer from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-8 py-6 rounded-lg text-lg font-medium transition-all duration-300 transform hover:-translate-y-1 shadow-lg"
              >
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Hero Image/Mockup */}
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-cyan-500/30 rounded-2xl blur-xl -z-10"></div>
            <div className="bg-slate-800/60 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-2 bg-slate-900/80 border-b border-white/10">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
              </div>
<div className="p-6 flex justify-center">
  <img
    src="/imagehero.png"
    alt="Dashboard Preview"
    className="rounded-lg shadow-lg w-full max-w-[800px] md:md:max-h-[1000px]"
  />
</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div ref={featuresRef} className="py-24 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-cyan-300">
              Why Choose Our Platform?
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Manage all your subscriptions in one place with the power of blockchain technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-xl p-8 transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center mb-6">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">NFT Subscriptions</h3>
              <p className="text-slate-300">
                Convert your subscriptions into NFTs for better tracking, management, and potential resale value.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-xl p-8 transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-lg flex items-center justify-center mb-6">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Analytics Dashboard</h3>
              <p className="text-slate-300">
                Visualize your spending patterns and get insights to optimize your subscription costs.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-xl p-8 transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Secure Wallet</h3>
              <p className="text-slate-300">
                Manage your subscription NFTs with our secure temporary wallet system, no crypto experience needed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-[#0F172A]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-2xl blur-xl"></div>
            <div className="relative bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-8 md:p-12 shadow-xl">
              <div className="md:flex items-center justify-between">
                <div className="mb-8 md:mb-0 md:mr-8">
                  <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                    Ready to simplify your subscription management?
                  </h2>
                  <p className="text-slate-300 text-lg">
                    Join thousands of users who have taken control of their digital subscriptions.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Button
                    onClick={handleGetStarted}
                    className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-8 py-4 rounded-lg text-lg font-medium transition-all duration-300"
                  >
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Form Section (if user is logged in) */}
      {user && (
        <div id="subscription-form" className="py-16 bg-slate-900 pt-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-cyan-300">
                Create a New Subscription NFT
              </h2>
              <p className="text-slate-300 text-lg">Add your subscription details below to create a new NFT</p>
            </div>
            <SubscriptionForm />
          </div>
        </div>
      )}
    </div>
  )
}
