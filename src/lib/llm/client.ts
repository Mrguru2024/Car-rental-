/**
 * Model-Agnostic LLM Client
 * Routes LLM calls to different providers based on LLM_PROVIDER env var
 * Supports: Gemini, Groq, Ollama, OpenAI
 */

import type { LLMProvider, LLMConfig, LLMJsonRequest, LLMJsonResponse, LLMError } from './types'

/**
 * Get LLM configuration from environment variables
 */
function getLLMConfig(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER || 'openai') as LLMProvider

  if (!['gemini', 'groq', 'ollama', 'openai'].includes(provider)) {
    throw new Error(`Invalid LLM_PROVIDER: ${provider}. Must be one of: gemini, groq, ollama, openai`)
  }

  const config: LLMConfig = { provider }

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required when LLM_PROVIDER=gemini')
    }
    
    config.gemini = { apiKey, model }
  } else if (provider === 'groq') {
    const apiKey = process.env.GROQ_API_KEY
    const model = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile'
    
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is required when LLM_PROVIDER=groq')
    }
    
    config.groq = { apiKey, model }
  } else if (provider === 'ollama') {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const model = process.env.OLLAMA_MODEL || 'llama3.1'
    
    config.ollama = { baseUrl, model }
  } else if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai')
    }
    
    config.openai = { apiKey, model }
  }

  return config
}

/**
 * Call Gemini API
 */
async function callGemini(
  config: LLMConfig,
  request: LLMJsonRequest
): Promise<LLMJsonResponse> {
  if (!config.gemini) {
    throw new Error('Gemini config not found')
  }

  const { apiKey, model } = config.gemini
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${request.system}\n\n${request.user}\n\nReturn ONLY valid JSON. No markdown. No extra text.`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    const error: LLMError = {
      message: `Gemini API error: ${response.status} ${response.statusText}`,
      provider: 'gemini',
      rawResponse: errorText,
      statusCode: response.status,
    }
    throw error
  }

  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!content) {
    const error: LLMError = {
      message: 'No content in Gemini response',
      provider: 'gemini',
      rawResponse: JSON.stringify(data),
    }
    throw error
  }

  // Parse JSON response
  try {
    const parsed = JSON.parse(content)
    return { data: parsed }
  } catch (parseError) {
    const error: LLMError = {
      message: 'Invalid JSON response from Gemini',
      provider: 'gemini',
      rawResponse: content,
    }
    throw error
  }
}

/**
 * Call Groq API (OpenAI-compatible)
 */
async function callGroq(
  config: LLMConfig,
  request: LLMJsonRequest
): Promise<LLMJsonResponse> {
  if (!config.groq) {
    throw new Error('Groq config not found')
  }

  const { apiKey, model } = config.groq
  const url = 'https://api.groq.com/openai/v1/chat/completions'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: request.system,
          },
          {
            role: 'user',
            content: `${request.user}\n\nReturn ONLY valid JSON. No markdown. No extra text.`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 2000,
      }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    const error: LLMError = {
      message: `Groq API error: ${response.status} ${response.statusText}`,
      provider: 'groq',
      rawResponse: errorText,
      statusCode: response.status,
    }
    throw error
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    const error: LLMError = {
      message: 'No content in Groq response',
      provider: 'groq',
      rawResponse: JSON.stringify(data),
    }
    throw error
  }

  // Parse JSON response
  try {
    const parsed = JSON.parse(content)
    return { data: parsed }
  } catch (parseError) {
    const error: LLMError = {
      message: 'Invalid JSON response from Groq',
      provider: 'groq',
      rawResponse: content,
    }
    throw error
  }
}

/**
 * Call Ollama API (OpenAI-compatible)
 */
async function callOllama(
  config: LLMConfig,
  request: LLMJsonRequest
): Promise<LLMJsonResponse> {
  if (!config.ollama) {
    throw new Error('Ollama config not found')
  }

  const { baseUrl, model } = config.ollama
  const url = `${baseUrl}/v1/chat/completions`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: request.system,
          },
          {
            role: 'user',
            content: `${request.user}\n\nReturn ONLY valid JSON. No markdown. No extra text.`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        options: {
          num_predict: 2000,
        },
      }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    const error: LLMError = {
      message: `Ollama API error: ${response.status} ${response.statusText}`,
      provider: 'ollama',
      rawResponse: errorText,
      statusCode: response.status,
    }
    throw error
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    const error: LLMError = {
      message: 'No content in Ollama response',
      provider: 'ollama',
      rawResponse: JSON.stringify(data),
    }
    throw error
  }

  // Parse JSON response
  try {
    const parsed = JSON.parse(content)
    return { data: parsed }
  } catch (parseError) {
    const error: LLMError = {
      message: 'Invalid JSON response from Ollama',
      provider: 'ollama',
      rawResponse: content,
    }
    throw error
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  config: LLMConfig,
  request: LLMJsonRequest
): Promise<LLMJsonResponse> {
  if (!config.openai) {
    throw new Error('OpenAI config not found')
  }

  const { apiKey, model } = config.openai
  const url = 'https://api.openai.com/v1/chat/completions'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: request.system,
          },
          {
            role: 'user',
            content: `${request.user}\n\nReturn ONLY valid JSON. No markdown. No extra text.`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 2000,
      }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    const error: LLMError = {
      message: `OpenAI API error: ${response.status} ${response.statusText}`,
      provider: 'openai',
      rawResponse: errorText,
      statusCode: response.status,
    }
    throw error
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    const error: LLMError = {
      message: 'No content in OpenAI response',
      provider: 'openai',
      rawResponse: JSON.stringify(data),
    }
    throw error
  }

  // Parse JSON response
  try {
    const parsed = JSON.parse(content)
    return { data: parsed }
  } catch (parseError) {
    const error: LLMError = {
      message: 'Invalid JSON response from OpenAI',
      provider: 'openai',
      rawResponse: content,
    }
    throw error
  }
}

/**
 * Main LLM JSON function
 * Routes to the appropriate provider based on LLM_PROVIDER env var
 */
export async function llmJson<T = any>(request: LLMJsonRequest): Promise<T> {
  const config = getLLMConfig()
  let response: LLMJsonResponse<T>

  try {
    switch (config.provider) {
      case 'gemini':
        response = await callGemini(config, request)
        break
      case 'groq':
        response = await callGroq(config, request)
        break
      case 'ollama':
        response = await callOllama(config, request)
        break
      case 'openai':
        response = await callOpenAI(config, request)
        break
      default:
        throw new Error(`Unsupported provider: ${config.provider}`)
    }

    return response.data
  } catch (error: any) {
    // If it's an LLMError with rawResponse, we want to preserve that
    if (error.rawResponse) {
      const llmError: LLMError = {
        message: error.message || 'LLM call failed',
        provider: config.provider,
        rawResponse: error.rawResponse,
        statusCode: error.statusCode,
      }
      throw llmError
    }
    throw error
  }
}
