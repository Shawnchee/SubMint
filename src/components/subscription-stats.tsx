"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, TrendingUp, Calendar, DollarSign, BarChart4, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

interface RecommendationCategory {
  title: string;
  score: number;
  recommendations: string[];

}

interface WebAlternative {
  name: string;
  savings: string;
  url: string;
  description: string;
}

interface SubscriptionAlternatives {
  for: string;
  alternatives: WebAlternative[];
}

interface HealthCheckResponse {
  overallScore: number;
  categories: RecommendationCategory[];
  webAlternatives?: SubscriptionAlternatives[];
  stats: {
    totalMonthly: number;
    totalYearly: number;
    annualizedSpending: number;
  };
  rawRecommendations?: string;
}

interface SubscriptionStatsProps {
  userId: string
  subscriptions: any[]
}

export default function SubscriptionStats({ userId, subscriptions = [] }: SubscriptionStatsProps) {
  const [loading, setLoading] = useState(false)
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Calculate subscription metrics
  const totalMonthly = subscriptions
    .filter((sub) => sub.billing_cycle === "monthly")
    .reduce((sum, sub) => sum + (sub.price || 0), 0)

  const totalDaily = totalMonthly / 30 // Approximate daily cost

  const totalYearly = totalMonthly * 12

  const mostExpensive =
    subscriptions.length > 0
      ? subscriptions.reduce((prev, current) => (prev.price > current.price ? prev : current), subscriptions[0])
      : null

  const runHealthCheck = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/subscription-health-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze subscriptions")
      }

      const data = await response.json()
      setHealthData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Color function for score
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-400";
    if (score >= 5) return "text-yellow-400";
    return "text-red-400";
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300 mb-2">
        Subscription Analytics
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800/40 backdrop-blur-md border border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-indigo-400" />
              Monthly Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">${totalMonthly.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/40 backdrop-blur-md border border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-cyan-400" />
              Daily Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">${totalDaily.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/40 backdrop-blur-md border border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center">
              <BarChart4 className="h-4 w-4 mr-2 text-indigo-400" />
              Yearly Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">${totalYearly.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/40 backdrop-blur-md border border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-cyan-400" />
              Most Expensive
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mostExpensive ? (
              <div>
                <p className="text-lg font-bold text-white">${mostExpensive.price.toFixed(2)}</p>
                <p className="text-xs text-slate-400 truncate">{mostExpensive.name}</p>
              </div>
            ) : (
              <p className="text-lg font-bold text-slate-500">None</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Health Check Section */}
      <Card className="bg-slate-800/40 backdrop-blur-md border border-white/10">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-white">AI Subscription Health Check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-300">
            Get personalized recommendations to optimize your subscription spending and identify potential savings.
          </p>

          <Button
            onClick={runHealthCheck}
            disabled={loading || subscriptions.length === 0}
            className="bg-gradient-to-r from-indigo-600 to-cyan-700 hover:from-indigo-500 hover:to-cyan-600 text-white cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>Run AI Health Check</>
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {healthData && (
            <div className="mt-6 space-y-6">
              {/* Overall Score */}
              <div className="p-5 bg-slate-700/50 rounded-md border border-indigo-500/30">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-medium text-white">
                    Overall Subscription Health
                  </h4>
                  <span className={`text-xl font-bold ${getScoreColor(healthData.overallScore)}`}>
                    {healthData.overallScore}/10
                  </span>
                </div>
                <Progress
                  value={healthData.overallScore * 10}
                  className={`h-2 bg-slate-600 ${
                    healthData.overallScore >= 8 
                      ? "progress-green"
                      : healthData.overallScore >= 5
                      ? "progress-yellow"
                      : "progress-red"
                  }`}
                />
              </div>

    {healthData.webAlternatives && healthData.webAlternatives.length > 0 && (
      <div className="p-5 bg-gradient-to-br from-indigo-900/60 to-cyan-900/60 rounded-md border border-indigo-400/40 shadow-lg">
        <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300 mb-4">
          Web-Based Savings Alternatives
        </h3>
        
        <div className="space-y-4">
          {healthData.webAlternatives.map((item, idx) => (
            <div key={idx} className="border-b border-indigo-500/20 pb-4 last:border-0 last:pb-0">
              <h4 className="text-white font-medium mb-2">Alternatives for <span className="text-indigo-300">{item.for}</span></h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {item.alternatives.map((alt, altIdx) => (
                  <div key={altIdx} className="bg-slate-800/50 rounded-md p-3 border border-white/5 hover:border-indigo-400/30 transition-all">
                    <div className="flex justify-between items-start mb-1">
                      <h5 className="font-medium text-cyan-300">{alt.name}</h5>
                      <span className="text-xs bg-green-900/60 text-green-300 px-2 py-0.5 rounded-full">
                        {alt.savings}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mb-2">{alt.description}</p>
                            <a 
                            href={alt.url.startsWith('http') ? alt.url : `https://${alt.url}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs text-indigo-400 font-mono hover:underline"
                            key={`alt-link-${altIdx}`}

                            >
                            {alt.url}
                            </a>                 
                             </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
    
    <div className="p-5 bg-gradient-to-br from-indigo-900/60 to-cyan-900/60 rounded-md border border-indigo-400/40 shadow-lg">
      <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300 mb-4">
        Smart Savings Recommendations
      </h3>
      
      <ul className="space-y-3">
        <li className="flex items-start gap-3 text-slate-200">
          <div className="bg-indigo-600/30 p-1 rounded-full mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
          </div>
          <span>
            <span className="font-medium text-indigo-300">Search for cheaper alternatives</span> - Compare pricing across different providers for similar services
          </span>
        </li>
        
        <li className="flex items-start gap-3 text-slate-200">
          <div className="bg-cyan-600/30 p-1 rounded-full mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <span>
            <span className="font-medium text-cyan-300">Consider open source alternatives</span> - Many paid services have free open source equivalents that may meet your needs
          </span>
        </li>
        
        <li className="flex items-start gap-3 text-slate-200">
          <div className="bg-indigo-600/30 p-1 rounded-full mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-300" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
            </svg>
          </div>
          <span>
            <span className="font-medium text-indigo-300">Look for bundles or family plans</span> - Many services offer discounts for multiple subscriptions or family accounts
          </span>
        </li>
        
        <li className="flex items-start gap-3 text-slate-200">
          <div className="bg-cyan-600/30 p-1 rounded-full mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
            </svg>
          </div>
          <span>
            <span className="font-medium text-cyan-300">Ask for discounts</span> - Contact customer service about loyalty discounts, annual payment options, or promotional offers
          </span>
        </li>
      </ul>
    </div>

              {healthData.categories && healthData.categories.map((category, index) => (
                <div key={index} className="p-5 bg-slate-700/50 rounded-md border border-indigo-500/30">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-md font-medium text-indigo-300">{category.title}</h4>
                    <span className={`font-medium ${getScoreColor(category.score)}`}>
                      {category.score}/10
                    </span>
                  </div>
                  
                  <ul className="space-y-2">
                    {category.recommendations.map((rec, recIndex) => (
                      <li key={recIndex} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="h-4 w-4 mt-1 text-indigo-400 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                    {category.recommendations.length === 0 && (
                      <li className="text-sm text-slate-400 italic">No recommendations in this category</li>
                    )}
                  </ul>
                </div>
              ))}

              {/* Fallback for unstructured response */}
              {healthData.rawRecommendations && !healthData.categories && (
                <div className="p-5 bg-slate-700/50 rounded-md border border-indigo-500/30">
                  <h4 className="text-md font-medium text-indigo-300 mb-3">Recommendations</h4>
                  <div className="text-sm text-slate-300 whitespace-pre-line">{healthData.rawRecommendations}</div>
                </div>
              )}
            </div>
          )}

          {subscriptions.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No subscriptions</AlertTitle>
              <AlertDescription>
                You don't have any subscriptions to analyze yet. Create your first subscription NFT to get started.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}