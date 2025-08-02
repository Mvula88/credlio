"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "How do I start building my credit score on Credlio?",
    answer: "Simply sign up, verify your identity, and start with small loans. Each successful repayment improves your trust score. The more consistent you are with payments, the faster your score improves."
  },
  {
    question: "Is there any fee to join as a borrower?",
    answer: "No, joining Credlio as a borrower is completely free. You only pay interest on the loans you take, and there are no hidden fees or charges."
  },
  {
    question: "How quickly can I get a loan approved?",
    answer: "Once your profile is verified, loan approvals can happen within minutes. Lenders can see your verified profile and reputation score instantly, making quick decisions possible."
  },
  {
    question: "What happens if I need an invitation code?",
    answer: "Some lenders may send you an invitation to join their trusted network. If you have an invitation code, you can enter it during signup for faster verification and potentially better initial loan terms."
  },
  {
    question: "Can I improve my interest rates over time?",
    answer: "Yes! As you build your reputation through successful repayments, you'll unlock better interest rates. Many borrowers see 20-30% reduction in rates after building a good payment history."
  },
  {
    question: "Is my financial information secure?",
    answer: "Absolutely. We use bank-level 256-bit encryption and follow strict data protection regulations. You control who sees your information, and we never share your data without your consent."
  }
]

export function BorrowerFAQSection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              Frequently asked questions
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to know about borrowing on Credlio
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 rounded-lg bg-gray-50 p-6 text-center">
            <p className="mb-4 text-gray-700">
              Still have questions? We're here to help!
            </p>
            <a
              href="mailto:support@credlio.com"
              className="font-medium text-emerald-600 hover:underline"
            >
              Contact our support team →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}