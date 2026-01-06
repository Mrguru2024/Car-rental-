'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/Toast/ToastProvider'

interface BlogSuggestionsProps {
  category?: string
  onSuggestionSelect?: (type: string, value: any) => void
  currentTitle?: string
  currentKeywords?: string[]
}

interface Suggestions {
  titles?: string[]
  keywords?: string[]
  outline?: any
  trendingTopics?: Array<{
    title: string
    keywords?: string[]
    reason?: string
  }>
  metaDescription?: string
}

export default function BlogSuggestions({
  category,
  onSuggestionSelect,
  currentTitle,
  currentKeywords = [],
}: BlogSuggestionsProps) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestions>({})
  const [activeTab, setActiveTab] = useState<'titles' | 'keywords' | 'trending' | 'outline'>('titles')
  const [topic, setTopic] = useState('')

  const fetchSuggestions = async (type: 'title' | 'keywords' | 'outline' | 'full' | 'trending' = 'full') => {
    setLoading(true)
    try {
      const response = await fetch('/api/blog/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic || currentTitle,
          category,
          industry: 'car rental',
          type,
        }),
      })

      const data = await response.json()
      
      if (data.error && !data.suggestions) {
        throw new Error(data.error)
      }

      setSuggestions(data.suggestions || {})
    } catch (error: any) {
      console.error('Error fetching suggestions:', error)
      showToast(error.message || 'Failed to fetch suggestions', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Auto-fetch suggestions when component mounts or topic changes
    if (currentTitle || topic) {
      const timeoutId = setTimeout(() => {
        fetchSuggestions('full')
      }, 500) // Debounce

      return () => clearTimeout(timeoutId)
    }
  }, [currentTitle, topic, category])

  const handleSelectTitle = (title: string) => {
    onSuggestionSelect?.('title', title)
    showToast('Title applied', 'success')
  }

  const handleSelectKeyword = (keyword: string) => {
    if (!currentKeywords.includes(keyword)) {
      onSuggestionSelect?.('keyword', keyword)
      showToast('Keyword added', 'success')
    }
  }

  const handleSelectTrending = (trending: any) => {
    onSuggestionSelect?.('trending', trending)
    showToast('Trending topic applied', 'success')
  }

  return (
    <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 sm:p-5 lg:p-6 border border-brand-white dark:border-brand-navy/50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 lg:mb-6">
        <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-brand-navy dark:text-brand-white flex items-center gap-2">
          <svg
            className="w-5 h-5 text-brand-blue dark:text-brand-blue-light"
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
          AI-Powered Suggestions
        </h3>
        <button
          onClick={() => fetchSuggestions('full')}
          disabled={loading}
          className="px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 lg:py-2.5 text-xs sm:text-sm lg:text-base bg-brand-blue dark:bg-brand-blue-light text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 touch-manipulation min-h-[44px] font-medium"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {/* Topic Input */}
      <div className="mb-4 sm:mb-5 lg:mb-6">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a topic or keyword to get suggestions..."
          className="w-full px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-3.5 text-sm sm:text-base lg:text-lg border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light touch-manipulation"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 lg:gap-3 mb-4 sm:mb-5 lg:mb-6 border-b border-brand-gray/20 dark:border-brand-navy/50 overflow-x-auto scrollbar-hide">
        {(['titles', 'keywords', 'trending', 'outline'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab)
              if (tab === 'titles') fetchSuggestions('title')
              else if (tab === 'keywords') fetchSuggestions('keywords')
              else if (tab === 'trending') fetchSuggestions('trending')
              else if (tab === 'outline') fetchSuggestions('outline')
            }}
            className={`px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm lg:text-base font-medium transition-colors whitespace-nowrap touch-manipulation min-h-[44px] flex items-center ${
              activeTab === tab
                ? 'border-b-2 border-brand-blue dark:border-brand-blue-light text-brand-blue dark:text-brand-blue-light'
                : 'text-brand-gray dark:text-brand-white/70 hover:text-brand-navy dark:hover:text-brand-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Suggestions Content */}
      <div className="min-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-brand-blue dark:text-brand-blue-light" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm text-brand-gray dark:text-brand-white/70">Generating smart suggestions...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Titles */}
            {activeTab === 'titles' && suggestions.titles && (
              <div className="space-y-2 sm:space-y-3">
                {suggestions.titles.map((title, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectTitle(title)}
                    className="w-full text-left px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-3.5 bg-brand-gray/5 dark:bg-brand-navy/30 rounded-lg hover:bg-brand-blue/10 dark:hover:bg-brand-blue/20 border border-brand-gray/10 dark:border-brand-navy/50 hover:border-brand-blue dark:hover:border-brand-blue-light transition-all duration-200 group touch-manipulation"
                  >
                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <span className="text-sm sm:text-base lg:text-lg text-brand-navy dark:text-brand-white group-hover:text-brand-blue dark:group-hover:text-brand-blue-light font-medium">
                        {title}
                      </span>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-brand-gray dark:text-brand-white/50 group-hover:text-brand-blue dark:group-hover:text-brand-blue-light opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Keywords */}
            {activeTab === 'keywords' && suggestions.keywords && (
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {suggestions.keywords.map((keyword, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectKeyword(keyword)}
                    disabled={currentKeywords.includes(keyword)}
                    className={`px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 lg:py-2.5 rounded-full text-xs sm:text-sm lg:text-base font-medium transition-all duration-200 touch-manipulation ${
                      currentKeywords.includes(keyword)
                        ? 'bg-brand-green/20 dark:bg-brand-green/30 text-brand-green dark:text-brand-green border border-brand-green/30'
                        : 'bg-brand-gray/10 dark:bg-brand-navy/50 text-brand-navy dark:text-brand-white hover:bg-brand-blue/10 dark:hover:bg-brand-blue/20 hover:border-brand-blue dark:hover:border-brand-blue-light border border-brand-gray/20 dark:border-brand-navy/50'
                    }`}
                  >
                    {currentKeywords.includes(keyword) ? '✓ ' : ''}
                    {keyword}
                  </button>
                ))}
              </div>
            )}

            {/* Trending Topics */}
            {activeTab === 'trending' && suggestions.trendingTopics && (
              <div className="space-y-3 sm:space-y-4">
                {suggestions.trendingTopics.map((trending, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectTrending(trending)}
                    className="w-full text-left p-3 sm:p-4 lg:p-5 bg-gradient-to-r from-brand-blue/5 to-brand-green/5 dark:from-brand-blue/10 dark:to-brand-green/10 rounded-lg hover:from-brand-blue/10 hover:to-brand-green/10 dark:hover:from-brand-blue/20 dark:hover:to-brand-green/20 border border-brand-blue/20 dark:border-brand-blue/30 transition-all duration-200 group touch-manipulation"
                  >
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-brand-navy dark:text-brand-white mb-1 sm:mb-2 group-hover:text-brand-blue dark:group-hover:text-brand-blue-light">
                          {trending.title}
                        </h4>
                        {trending.reason && (
                          <p className="text-xs sm:text-sm lg:text-base text-brand-gray dark:text-brand-white/70 mb-2 sm:mb-3">
                            {trending.reason}
                          </p>
                        )}
                        {trending.keywords && trending.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                            {trending.keywords.slice(0, 3).map((kw, i) => (
                              <span
                                key={i}
                                className="px-2 sm:px-2.5 lg:px-3 py-0.5 sm:py-1 bg-white/50 dark:bg-brand-navy/50 rounded text-xs sm:text-sm text-brand-gray dark:text-brand-white/70"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-brand-gray dark:text-brand-white/50 group-hover:text-brand-blue dark:group-hover:text-brand-blue-light opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Outline */}
            {activeTab === 'outline' && suggestions.outline && (
              <div className="space-y-3 sm:space-y-4">
                {typeof suggestions.outline === 'object' ? (
                  Object.entries(suggestions.outline).map(([key, value], index) => (
                    <div key={index} className="p-3 sm:p-4 lg:p-5 bg-brand-gray/5 dark:bg-brand-navy/30 rounded-lg border border-brand-gray/10 dark:border-brand-navy/50">
                      <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-brand-navy dark:text-brand-white mb-1 sm:mb-2 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <p className="text-xs sm:text-sm lg:text-base text-brand-gray dark:text-brand-white/70">
                        {String(value)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-3 sm:p-4 lg:p-5 bg-brand-gray/5 dark:bg-brand-navy/30 rounded-lg border border-brand-gray/10 dark:border-brand-navy/50">
                    <pre className="text-xs sm:text-sm lg:text-base text-brand-navy dark:text-brand-white whitespace-pre-wrap">
                      {String(suggestions.outline)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Meta Description */}
            {suggestions.metaDescription && activeTab === 'titles' && (
              <div className="mt-4 sm:mt-5 lg:mt-6 p-3 sm:p-4 lg:p-5 bg-brand-blue/5 dark:bg-brand-blue/10 rounded-lg border border-brand-blue/20 dark:border-brand-blue/30">
                <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                  <h4 className="text-xs sm:text-sm lg:text-base font-semibold text-brand-navy dark:text-brand-white">
                    Suggested Meta Description
                  </h4>
                  <button
                    onClick={() => onSuggestionSelect?.('metaDescription', suggestions.metaDescription)}
                    className="text-xs sm:text-sm text-brand-blue dark:text-brand-blue-light hover:underline touch-manipulation whitespace-nowrap"
                  >
                    Use this
                  </button>
                </div>
                <p className="text-xs sm:text-sm lg:text-base text-brand-gray dark:text-brand-white/70">
                  {suggestions.metaDescription}
                </p>
                <p className="text-xs sm:text-sm text-brand-gray dark:text-brand-white/50 mt-2 sm:mt-3">
                  {suggestions.metaDescription.length} characters
                </p>
              </div>
            )}

            {/* Empty State */}
            {!suggestions.titles && !suggestions.keywords && !suggestions.trendingTopics && !suggestions.outline && (
              <div className="text-center py-8 sm:py-12 lg:py-16">
                <p className="text-sm sm:text-base lg:text-lg text-brand-gray dark:text-brand-white/70 mb-4 sm:mb-6">
                  Enter a topic above to get AI-powered suggestions
                </p>
                <button
                  onClick={() => fetchSuggestions('full')}
                  className="px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-brand-blue dark:bg-brand-blue-light text-white rounded-lg hover:opacity-90 transition-opacity text-sm sm:text-base lg:text-lg touch-manipulation min-h-[44px] font-medium"
                >
                  Generate Suggestions
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
