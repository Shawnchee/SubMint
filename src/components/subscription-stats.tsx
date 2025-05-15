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

interface HealthCheckResponse {
  overallScore: number;
  categories: RecommendationCategory[];
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

              {/* Categories */}
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