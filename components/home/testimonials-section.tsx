"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Star, Quote } from "lucide-react"

interface Testimonial {
  id: string
  name: string
  company: string
  content: string
  rating: number
  avatar?: string
}

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        // For now, using static data as testimonials don't need to be in DB
        // In production, these could come from a CMS or API
        const data: Testimonial[] = [
          {
            id: "1",
            name: "Sarah Johnson",
            company: "QuickLend Finance",
            content: "Credlio has transformed how we assess risk. The real-time verification has helped us reduce defaults by 40%.",
            rating: 5,
          },
          {
            id: "2",
            name: "Michael Chen",
            company: "TrustPay Solutions",
            content: "The platform is intuitive and the credit reports are comprehensive. It's exactly what our industry needed.",
            rating: 5,
          },
          {
            id: "3",
            name: "Amara Williams",
            company: "SecureCredit Solutions",
            content: "Best investment we've made. The ROI from reduced bad debt has been incredible. Highly recommend!",
            rating: 5,
          },
        ]
        setTestimonials(data)
      } catch (error) {
        console.error("Failed to fetch testimonials:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTestimonials()
  }, [])

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold text-gray-900">
            Trusted by industry leaders
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            See why thousands of financial professionals choose our platform for secure lending decisions.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {loading ? (
            // Skeleton loaders
            [...Array(3)].map((_, i) => (
              <Card key={i} className="h-full">
                <CardHeader>
                  <Skeleton className="mb-4 h-4 w-32" />
                  <Skeleton className="h-12 w-12" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="mb-4 h-20 w-full" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="mb-2 h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="group h-full transition-all duration-300 hover:shadow-xl">
                <CardHeader>
                  <div className="mb-3 flex items-center gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <Quote className="h-8 w-8 text-gray-200 transition-colors group-hover:text-gray-300" />
                </CardHeader>
                <CardContent>
                  <p className="mb-6 text-gray-700 leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-lg font-semibold text-gray-700">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </section>
  )
}