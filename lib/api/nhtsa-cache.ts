/**
 * NHTSA API Response Caching
 * Caches makes and models responses to reduce API calls
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours for makes/models (they don't change often)

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

// In-memory cache (for serverless, consider Redis/Upstash for production)
const makesCache: CacheEntry<string[]> | null = null
const modelsCache = new Map<string, CacheEntry<any[]>>()

/**
 * Get cached makes or null if expired/missing
 */
export function getCachedMakes(): string[] | null {
  if (!makesCache || Date.now() > makesCache.expiresAt) {
    return null
  }
  return makesCache.data
}

/**
 * Set cached makes
 */
export function setCachedMakes(makes: string[]): void {
  // Note: In serverless, this won't persist across invocations
  // For production, use Redis/Upstash or database caching
  ;(globalThis as any).__nhtsa_makes_cache = {
    data: makes,
    expiresAt: Date.now() + CACHE_TTL_MS,
  }
}

/**
 * Get cached models for a make/year combination
 */
export function getCachedModels(make: string, year?: number): any[] | null {
  const key = `${make}-${year || 'all'}`
  const cached = modelsCache.get(key)
  if (!cached || Date.now() > cached.expiresAt) {
    modelsCache.delete(key)
    return null
  }
  return cached.data
}

/**
 * Set cached models
 */
export function setCachedModels(make: string, year: number | undefined, models: any[]): void {
  const key = `${make}-${year || 'all'}`
  modelsCache.set(key, {
    data: models,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
  
  // Limit cache size (keep last 100 entries)
  if (modelsCache.size > 100) {
    const firstKey = modelsCache.keys().next().value
    modelsCache.delete(firstKey)
  }
}
