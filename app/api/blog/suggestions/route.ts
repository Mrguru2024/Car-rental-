/**
 * Blog Suggestions API
 * GET /api/blog/suggestions - Get keyword suggestions, trending topics, and SEO recommendations
 */

import { NextResponse } from 'next/server'

// Keyword suggestions based on car rental industry
const KEYWORD_SUGGESTIONS = [
  // Car rental related
  'car rental', 'rent a car', 'car rental near me', 'cheap car rental', 'car rental deals',
  'luxury car rental', 'suv rental', 'economy car rental', 'car rental discount',
  // Travel related
  'travel tips', 'road trip planning', 'vacation car rental', 'airport car rental',
  'long term car rental', 'weekly car rental', 'monthly car rental',
  // Industry trends
  'electric vehicle rental', 'hybrid car rental', 'sustainable travel', 'eco-friendly car rental',
  'peer to peer car rental', 'car sharing', 'car rental marketplace',
  // Maintenance and safety
  'car maintenance tips', 'rental car inspection', 'car rental insurance',
  'what to check when renting a car', 'car rental safety',
  // Destination specific
  'best car rental for road trips', 'city car rental guide', 'car rental for business travel',
]

// Trending topics (can be enhanced with real-time data from APIs)
const TRENDING_TOPICS = [
  { topic: 'Electric Vehicle Rentals', trend: 'up', category: 'Industry News' },
  { topic: 'Sustainable Travel', trend: 'up', category: 'Travel Guides' },
  { topic: 'Road Trip Planning', trend: 'up', category: 'Travel Guides' },
  { topic: 'Car Rental Insurance Options', trend: 'up', category: 'Car Rental Tips' },
  { topic: 'Peer-to-Peer Car Sharing', trend: 'up', category: 'Industry News' },
  { topic: 'Long-Term Car Rental Benefits', trend: 'up', category: 'Car Rental Tips' },
  { topic: 'Luxury Car Rental Guide', trend: 'up', category: 'Travel Guides' },
  { topic: 'Winter Car Rental Tips', trend: 'seasonal', category: 'Car Rental Tips' },
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const type = searchParams.get('type') || 'keywords' // keywords, trending, seo

    if (type === 'keywords') {
      // Filter keywords based on query
      const filtered = query
        ? KEYWORD_SUGGESTIONS.filter((keyword) =>
            keyword.toLowerCase().includes(query.toLowerCase())
          )
        : KEYWORD_SUGGESTIONS

      return NextResponse.json({
        success: true,
        data: filtered.slice(0, 20),
      })
    }

    if (type === 'trending') {
      // Filter trending topics based on query
      const filtered = query
        ? TRENDING_TOPICS.filter((topic) =>
            topic.topic.toLowerCase().includes(query.toLowerCase()) ||
            topic.category.toLowerCase().includes(query.toLowerCase())
          )
        : TRENDING_TOPICS

      return NextResponse.json({
        success: true,
        data: filtered.slice(0, 10),
      })
    }

    if (type === 'seo') {
      // Generate SEO suggestions based on title/excerpt
      const title = searchParams.get('title') || ''
      const excerpt = searchParams.get('excerpt') || ''

      const suggestions = {
        metaTitle: title.slice(0, 60) || 'Blog Post Title',
        metaDescription: excerpt.slice(0, 160) || 'Blog post description',
        suggestedKeywords: extractKeywords(title + ' ' + excerpt),
        readingTimeEstimate: Math.ceil((title.length + excerpt.length) / 200),
      }

      return NextResponse.json({
        success: true,
        data: suggestions,
      })
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
  } catch (error: any) {
    console.error('Blog suggestions error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction (can be enhanced with NLP libraries)
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 4)

  // Count word frequency
  const wordCount = new Map<string, number>()
  words.forEach((word) => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1)
  })

  // Return top keywords
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word)
}
