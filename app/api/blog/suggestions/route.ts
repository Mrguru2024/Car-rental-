/**
 * Blog Suggestions API
 * Uses OpenAI to generate high-quality blog post suggestions based on trends
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/utils/roleHierarchy'

interface BlogSuggestionRequest {
  topic?: string
  category?: string
  industry?: string
  type?: 'title' | 'keywords' | 'outline' | 'full' | 'trending'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !isAdmin(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body: BlogSuggestionRequest = await request.json()
    const { topic, category, industry = 'car rental', type = 'full' } = body

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          suggestions: getFallbackSuggestions(topic, category, industry, type),
        },
        { status: 200 } // Return fallback suggestions instead of error
      )
    }

    // Generate suggestions using OpenAI
    const suggestions = await generateAISuggestions(
      openaiApiKey,
      topic,
      category,
      industry,
      type
    )

    return NextResponse.json({ suggestions })
  } catch (error: any) {
    console.error('Blog suggestions error:', error)
    
    // Return fallback suggestions on error
    const body = await request.json().catch(() => ({}))
    const fallback = getFallbackSuggestions(
      body.topic,
      body.category,
      body.industry || 'car rental',
      body.type || 'full'
    )
    
    return NextResponse.json({ suggestions: fallback })
  }
}

async function generateAISuggestions(
  apiKey: string,
  topic?: string,
  category?: string,
  industry: string = 'car rental',
  type: string = 'full'
) {
  const OpenAI = require('openai')
  const openai = new OpenAI({ apiKey })

  const systemPrompt = `You are an expert content strategist specializing in ${industry} and automotive content. 
Your task is to generate high-quality, SEO-optimized blog post suggestions that are:
- Relevant to current trends in the ${industry} industry
- SEO-friendly with high-performing keywords
- Engaging and valuable to readers
- Based on real search trends and user intent

Focus on practical, actionable content that helps readers make informed decisions.`

  let userPrompt = ''
  
  switch (type) {
    case 'title':
      userPrompt = `Generate 10 compelling blog post title suggestions for the ${industry} industry${topic ? ` about "${topic}"` : ''}${category ? ` in the "${category}" category` : ''}. 
Each title should be:
- 50-60 characters long
- Include high-performing SEO keywords
- Be engaging and click-worthy
- Address current trends or pain points

Return only the titles, one per line.`
      break

    case 'keywords':
      userPrompt = `Generate 15 high-performing SEO keywords and phrases for a blog post${topic ? ` about "${topic}"` : ''}${category ? ` in the "${category}" category` : ''} in the ${industry} industry.
Include:
- Primary keywords (1-2 words)
- Long-tail keywords (3-5 words)
- Question-based keywords
- Local SEO keywords if relevant

Return as a JSON array of strings.`
      break

    case 'outline':
      userPrompt = `Create a detailed blog post outline${topic ? ` for a post about "${topic}"` : ''}${category ? ` in the "${category}" category` : ''} in the ${industry} industry.
The outline should include:
- A compelling introduction hook
- 5-7 main sections with sub-points
- A strong conclusion with call-to-action
- SEO-optimized headings

Return as a structured outline with headings and bullet points.`
      break

    case 'trending':
      userPrompt = `Identify 10 trending topics in the ${industry} industry for blog content in 2024.
For each topic, provide:
- Topic title
- Why it's trending
- Target keywords
- Content angle

Return as a JSON array with objects containing: title, reason, keywords (array), angle.`
      break

    case 'full':
    default:
      userPrompt = `Generate comprehensive blog post suggestions${topic ? ` for a post about "${topic}"` : ''}${category ? ` in the "${category}" category` : ''} in the ${industry} industry.

Provide:
1. 5 compelling title suggestions (50-60 chars each)
2. 15 high-performing SEO keywords (mix of short and long-tail)
3. A brief content outline (5-7 main sections)
4. 3 trending related topics
5. Suggested meta description (150-160 chars)

Return as JSON with: titles (array), keywords (array), outline (object with sections), trendingTopics (array), metaDescription (string).`
      break
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: type === 'full' ? 1500 : 800,
    })

    const response = completion.choices[0]?.message?.content || ''
    
    // Parse the response based on type
    return parseAIResponse(response, type)
  } catch (error: any) {
    console.error('OpenAI API error:', error)
    throw error
  }
}

function parseAIResponse(response: string, type: string): any {
  try {
    // Try to parse as JSON first
    if (response.trim().startsWith('{') || response.trim().startsWith('[')) {
      return JSON.parse(response)
    }

    // Handle different response types
    switch (type) {
      case 'title':
        return {
          titles: response
            .split('\n')
            .filter((line: string) => line.trim())
            .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
            .slice(0, 10),
        }

      case 'keywords':
        // Try to extract keywords from various formats
        const keywordMatches = response.match(/["']([^"']+)["']/g) || []
        return {
          keywords: keywordMatches
            .map((k: string) => k.replace(/["']/g, ''))
            .slice(0, 15),
        }

      case 'trending':
        // Try to parse trending topics
        return {
          trending: response
            .split('\n')
            .filter((line: string) => line.trim() && !line.match(/^#/))
            .slice(0, 10)
            .map((line: string) => ({
              title: line.replace(/^\d+\.\s*/, '').trim(),
              keywords: [],
            })),
        }

      default:
        return { raw: response }
    }
  } catch (error) {
    return { raw: response }
  }
}

function getFallbackSuggestions(
  topic?: string,
  category?: string,
  industry: string = 'car rental',
  type: string = 'full'
): any {
  const baseKeywords = [
    'car rental',
    'rent a car',
    'vehicle rental',
    'car hire',
    'rental car',
    'best car rental',
    'cheap car rental',
    'car rental tips',
    'rental car guide',
    'car rental deals',
    'luxury car rental',
    'economy car rental',
    'car rental insurance',
    'rental car comparison',
    'car rental near me',
  ]

  const trendingTopics = [
    {
      title: 'Electric Vehicle Rentals: The Future of Car Sharing',
      keywords: ['electric car rental', 'EV rental', 'sustainable car rental'],
      reason: 'Growing demand for eco-friendly transportation',
    },
    {
      title: 'How to Save Money on Car Rentals: Insider Tips',
      keywords: ['cheap car rental', 'car rental discounts', 'save money car rental'],
      reason: 'Always popular - cost-saving content',
    },
    {
      title: 'Car Rental Insurance: What You Need to Know',
      keywords: ['rental car insurance', 'CDW insurance', 'car rental coverage'],
      reason: 'High search volume, complex topic',
    },
  ]

  switch (type) {
    case 'title':
      return {
        titles: [
          `${topic || 'Complete Guide'} to ${industry} in 2024`,
          `Best ${category || 'Tips'} for ${industry}: Expert Advice`,
          `How to Choose the Right ${topic || 'Service'} for Your Needs`,
          `${industry} ${category || 'Guide'}: Everything You Need to Know`,
          `Top 10 ${topic || 'Strategies'} for ${industry} Success`,
        ],
      }

    case 'keywords':
      return {
        keywords: baseKeywords.slice(0, 15),
      }

    case 'trending':
      return {
        trending: trendingTopics,
      }

    case 'full':
    default:
      return {
        titles: [
          `${topic || 'Complete Guide'} to ${industry} in 2024`,
          `Best ${category || 'Tips'} for ${industry}: Expert Advice`,
          `How to Choose the Right ${topic || 'Service'} for Your Needs`,
          `${industry} ${category || 'Guide'}: Everything You Need to Know`,
          `Top 10 ${topic || 'Strategies'} for ${industry} Success`,
        ],
        keywords: baseKeywords,
        outline: {
          introduction: 'Hook and overview',
          section1: 'Key points and benefits',
          section2: 'Practical tips and strategies',
          section3: 'Common mistakes to avoid',
          section4: 'Expert recommendations',
          conclusion: 'Summary and call-to-action',
        },
        trendingTopics,
        metaDescription: `Discover expert insights and tips for ${industry}${topic ? ` about ${topic}` : ''}. Learn best practices, avoid common mistakes, and make informed decisions.`,
      }
  }
}
