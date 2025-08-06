"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Star, Quote } from "lucide-react"

interface Stats {
  totalBorrowers: number
  averageRating: number
  totalLoansProcessed: number
  approvalRate: number
}

export function BorrowerTestimonialsSection() {
  const [stats, setStats] = useState<Stats>({
    totalBorrowers: 0,
    averageRating: 0,
    totalLoansProcessed: 0,
    approvalRate: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch statistics from the API endpoint
      const response = await fetch('/api/borrower/stats')
      const data = await response.json()
      
      if (response.ok) {
        setStats({
          totalBorrowers: data.total_borrowers || 0,
          averageRating: data.average_rating || 4.8,
          totalLoansProcessed: data.total_loan_amount || 0,
          approvalRate: data.approval_rate || 0
        })
      } else {
        console.error('Error fetching stats:', data.error)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Sample testimonials - in production, these could come from a testimonials table
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Small Business Owner",
      content: "Credlio helped me build my credit reputation from scratch. After just 3 successful loans, I now get offers with 30% lower interest rates!",
      rating: 5,
      avatar: "SJ",
      location: "Kenya",
    },
    {
      name: "Michael Chen",
      role: "Freelancer",
      content: "The verification process was quick and easy. I love how transparent everything is - I can see exactly how lenders view my profile.",
      rating: 5,
      avatar: "MC",
      location: "South Africa",
    },
    {
      name: "Amara Okonkwo",
      role: "Entrepreneur",
      content: "As someone with no traditional credit history, Credlio gave me a chance to prove my reliability. Now I have multiple lenders offering me loans.",
      rating: 5,
      avatar: "AO",
      location: "Nigeria",
    },
  ]
  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold text-gray-900">
            Trusted by borrowers worldwide
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            See how Credlio has helped borrowers build their credit reputation and access better loans
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="relative overflow-hidden">
              {/* Quote Icon */}
              <div className="absolute right-4 top-4">
                <Quote className="h-8 w-8 text-gray-200" />
              </div>
              
              <CardContent className="p-6">
                {/* Rating */}
                <div className="mb-4 flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                {/* Content */}
                <p className="mb-6 text-gray-700">{testimonial.content}</p>
                
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">
                      {testimonial.role} • {testimonial.location}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="text-center">
            {loading ? (
              <Skeleton className="h-12 w-24 mx-auto mb-2" />
            ) : (
              <div className="text-4xl font-bold text-emerald-600">
                {stats.totalBorrowers > 1000 
                  ? `${Math.floor(stats.totalBorrowers / 1000)}K+` 
                  : stats.totalBorrowers}
              </div>
            )}
            <p className="mt-2 text-gray-600">Active Borrowers</p>
          </div>
          <div className="text-center">
            {loading ? (
              <Skeleton className="h-12 w-24 mx-auto mb-2" />
            ) : (
              <div className="text-4xl font-bold text-emerald-600">
                {stats.averageRating}/5
              </div>
            )}
            <p className="mt-2 text-gray-600">Average Rating</p>
          </div>
          <div className="text-center">
            {loading ? (
              <Skeleton className="h-12 w-24 mx-auto mb-2" />
            ) : (
              <div className="text-4xl font-bold text-emerald-600">
                ${stats.totalLoansProcessed > 1000000 
                  ? `${(stats.totalLoansProcessed / 1000000).toFixed(1)}M+` 
                  : stats.totalLoansProcessed > 1000
                  ? `${Math.floor(stats.totalLoansProcessed / 1000)}K+`
                  : stats.totalLoansProcessed}
              </div>
            )}
            <p className="mt-2 text-gray-600">Loans Processed</p>
          </div>
          <div className="text-center">
            {loading ? (
              <Skeleton className="h-12 w-24 mx-auto mb-2" />
            ) : (
              <div className="text-4xl font-bold text-emerald-600">
                {stats.approvalRate}%
              </div>
            )}
            <p className="mt-2 text-gray-600">Approval Rate</p>
          </div>
        </div>
      </div>
    </section>
  )
}