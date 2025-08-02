import { Suspense } from "react"
import { BorrowerHeroSection } from "@/components/borrower-landing/hero-section"
import { BorrowerBenefitsSection } from "@/components/borrower-landing/benefits-section"
import { BorrowerHowItWorksSection } from "@/components/borrower-landing/how-it-works-section"
import { BorrowerTestimonialsSection } from "@/components/borrower-landing/testimonials-section"
import { BorrowerCTASection } from "@/components/borrower-landing/cta-section"
import { BorrowerFAQSection } from "@/components/borrower-landing/faq-section"

export default function BorrowerLandingPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<div>Loading...</div>}>
        <BorrowerHeroSection />
      </Suspense>
      <BorrowerBenefitsSection />
      <BorrowerHowItWorksSection />
      <BorrowerTestimonialsSection />
      <BorrowerFAQSection />
      <BorrowerCTASection />
    </div>
  )
}