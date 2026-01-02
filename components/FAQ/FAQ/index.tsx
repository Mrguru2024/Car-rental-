'use client'

import { useState } from 'react'
import { useToast } from '@/components/Toast/ToastProvider'

interface FAQItem {
  question: string
  answer: string
}

const defaultFAQs: FAQItem[] = [
  {
    question: 'How do I rent a car on Carsera?',
    answer: 'Browse available vehicles, select your dates, and complete the booking process. You\'ll need to verify your identity and provide payment information.',
  },
  {
    question: 'What documents do I need to rent a car?',
    answer: 'You\'ll need a valid driver\'s license, proof of insurance, and a credit card for payment. Some vehicles may require additional documentation.',
  },
  {
    question: 'How does the mileage limit work?',
    answer: 'Each vehicle listing shows its mileage limit. You can drive up to that limit during your rental period. Some vehicles offer unlimited miles.',
  },
  {
    question: 'What happens if I damage the vehicle?',
    answer: 'Carsera provides insurance coverage for all rentals. Contact support immediately if any damage occurs during your rental period.',
  },
  {
    question: 'Can I cancel my booking?',
    answer: 'Yes, you can cancel your booking. Cancellation policies vary by vehicle and are clearly stated at the time of booking.',
  },
  {
    question: 'How do I become a dealer on Carsera?',
    answer: 'Sign up as a dealer, complete the verification process, and start listing your vehicles. Our team will guide you through the onboarding process.',
  },
]

export default function FAQ() {
  const { showToast } = useToast()
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [askQuestion, setAskQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [aiResponse, setAiResponse] = useState<string | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const handleAskCarsera = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!askQuestion.trim()) {
      showToast('Please enter a question', 'error')
      return
    }

    setIsAsking(true)
    setAiResponse(null)

    try {
      // TODO: Integrate with actual AI service (OpenAI, Anthropic, etc.)
      // For now, this is a placeholder that simulates an AI response
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Simulated AI response - replace with actual API call
      const response = `Based on your question about "${askQuestion}", here's what I found:

Carsera is a platform that connects renters with trusted local dealers and private vehicle owners. You can browse available vehicles, book rentals, and manage your bookings all in one place.

For specific questions about:
- Booking process: Check our FAQ section above
- Vehicle availability: Browse our listings
- Account issues: Contact our support team

Would you like more specific information about any of these topics?`

      setAiResponse(response)
      setAskQuestion('')
    } catch (error) {
      showToast('Failed to get AI response. Please try again.', 'error')
      console.error('AI error:', error)
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-brand-navy dark:text-brand-white mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-brand-gray dark:text-brand-white/70">
          Find answers to common questions about Carsera
        </p>
      </div>

      {/* Ask Carsera AI Section */}
      <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 mb-12 border border-brand-white dark:border-brand-navy/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brand-blue dark:bg-brand-blue-light flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-brand-navy dark:text-brand-white">
            Ask Carsera
          </h2>
        </div>
        <p className="text-brand-gray dark:text-brand-white/70 mb-4">
          Have a question? Ask our AI assistant and get instant answers about Carsera.
        </p>

        <form onSubmit={handleAskCarsera} className="space-y-4">
          <div>
            <label htmlFor="ai-question" className="sr-only">
              Ask a question
            </label>
            <textarea
              id="ai-question"
              value={askQuestion}
              onChange={(e) => setAskQuestion(e.target.value)}
              placeholder="Ask anything about Carsera, bookings, vehicles, or policies..."
              rows={3}
              className="w-full px-4 py-3 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70 resize-none"
              disabled={isAsking}
            />
          </div>
          <button
            type="submit"
            disabled={isAsking || !askQuestion.trim()}
            className="w-full md:w-auto px-6 py-3 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAsking ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Thinking...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Ask Carsera
              </>
            )}
          </button>
        </form>

        {aiResponse && (
          <div className="mt-6 p-4 bg-brand-blue/10 dark:bg-brand-blue/20 rounded-lg border border-brand-blue/20 dark:border-brand-blue/30">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-blue dark:bg-brand-blue-light flex items-center justify-center flex-shrink-0 mt-1">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-brand-navy dark:text-brand-white whitespace-pre-line">
                  {aiResponse}
                </p>
                <button
                  onClick={() => setAiResponse(null)}
                  className="mt-3 text-sm text-brand-blue dark:text-brand-blue-light hover:underline"
                >
                  Clear response
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-4">
        {defaultFAQs.map((faq, index) => (
          <div
            key={index}
            className="bg-white dark:bg-brand-navy-light rounded-lg shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 overflow-hidden"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-brand-gray/5 dark:hover:bg-brand-navy/50 transition-colors"
            >
              <span className="font-semibold text-brand-navy dark:text-brand-white pr-4">
                {faq.question}
              </span>
              <svg
                className={`w-5 h-5 text-brand-blue dark:text-brand-blue-light flex-shrink-0 transition-transform ${
                  openIndex === index ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {openIndex === index && (
              <div className="px-6 pb-4">
                <p className="text-brand-gray dark:text-brand-white/70">
                  {faq.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
