# Blog AI Suggestions Setup

This document explains how to set up and use the AI-powered blog suggestions feature.

## Overview

The blog suggestions system uses OpenAI's GPT-3.5-turbo model to generate high-quality, SEO-optimized blog post suggestions including:

- Compelling titles
- High-performing keywords
- Content outlines
- Trending topics
- Meta descriptions

## Setup

### 1. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (you won't be able to see it again)

### 2. Add to Environment Variables

Add the following to your `.env.local` file:

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

**Important:** Never commit this key to version control. It's already in `.gitignore`.

### 3. Cost Considerations

- **Model Used:** GPT-3.5-turbo (most cost-effective)
- **Estimated Cost:** ~$0.001-0.002 per suggestion request
- **Token Usage:** ~500-1500 tokens per request depending on type

**Cost Optimization:**

- The system includes fallback suggestions if the API key is not configured
- Suggestions are cached client-side to reduce API calls
- Uses GPT-3.5-turbo instead of GPT-4 for cost efficiency

### 4. Production Setup

For production deployments (e.g., Vercel):

1. Go to your project settings
2. Navigate to Environment Variables
3. Add `OPENAI_API_KEY` with your production key
4. Redeploy your application

## Usage

### In Blog Editor

1. Navigate to `/admin/blog/new` or edit an existing post
2. The AI Suggestions panel appears in the sidebar
3. Enter a topic or keyword in the input field
4. Suggestions are automatically generated based on:
   - Your topic/keyword
   - Selected category
   - Industry trends (car rental)

### Suggestion Types

#### Titles

- 10 compelling title suggestions
- SEO-optimized (50-60 characters)
- Click-worthy and engaging
- Based on current trends

#### Keywords

- 15 high-performing SEO keywords
- Mix of short and long-tail keywords
- Question-based keywords
- Local SEO keywords when relevant

#### Trending Topics

- 10 trending topics in the industry
- Includes why it's trending
- Target keywords for each topic
- Content angle suggestions

#### Content Outline

- Detailed blog post structure
- 5-7 main sections with sub-points
- SEO-optimized headings
- Introduction and conclusion guidance

### Applying Suggestions

- **Titles:** Click any title to apply it to your post
- **Keywords:** Click keywords to add them to meta keywords
- **Trending Topics:** Click to apply the topic title and keywords
- **Meta Description:** Click "Use this" to apply the suggested meta description

## Fallback Mode

If the OpenAI API key is not configured, the system provides fallback suggestions based on:

- Industry best practices
- Common SEO keywords
- Standard content structures

This ensures the feature works even without API access, though AI-generated suggestions will be more relevant and trend-aware.

## API Endpoint

The suggestions are generated via `/api/blog/suggestions` endpoint:

**Request:**

```json
POST /api/blog/suggestions
{
  "topic": "electric vehicle rentals",
  "category": "Technology",
  "industry": "car rental",
  "type": "full" // or "title", "keywords", "outline", "trending"
}
```

**Response:**

```json
{
  "suggestions": {
    "titles": ["..."],
    "keywords": ["..."],
    "outline": {...},
    "trendingTopics": [...],
    "metaDescription": "..."
  }
}
```

## Troubleshooting

### Suggestions Not Loading

1. **Check API Key:**

   - Verify `OPENAI_API_KEY` is set in environment variables
   - Restart development server after adding the key

2. **Check API Quota:**

   - Verify your OpenAI account has available credits
   - Check usage at https://platform.openai.com/usage

3. **Check Console:**
   - Open browser console for error messages
   - Check network tab for API request failures

### High API Costs

1. **Use Fallback Mode:**

   - Remove or don't set `OPENAI_API_KEY`
   - System will use fallback suggestions

2. **Limit Usage:**

   - Only generate suggestions when needed
   - Don't refresh suggestions unnecessarily

3. **Monitor Usage:**
   - Set up usage alerts in OpenAI dashboard
   - Set spending limits if needed

## Best Practices

1. **Use Specific Topics:**

   - More specific topics = better suggestions
   - Include industry context when possible

2. **Select Categories:**

   - Category selection improves relevance
   - Suggestions are tailored to category

3. **Review Before Applying:**

   - AI suggestions are starting points
   - Always review and customize for your brand voice

4. **Combine Suggestions:**
   - Mix and match from different suggestion types
   - Use trending topics for inspiration

## Security

- API key is only used server-side
- Never exposed to client-side code
- All requests require admin authentication
- Rate limiting recommended for production

## Future Enhancements

Potential improvements:

- Caching suggestions in database
- Learning from high-performing posts
- Integration with Google Trends API
- Multi-language support
- Custom industry templates
