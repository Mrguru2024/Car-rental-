/**
 * Screening Provider Factory
 * Returns the appropriate provider based on configuration
 */

import { MockProvider } from './MockProvider'
import { CheckrProvider, isCheckrAvailable } from './CheckrProvider'
import type { ScreeningProvider } from './types'

/**
 * Get the screening provider instance
 * Uses MockProvider by default (free-now approach)
 * Can be configured to use Checkr when env vars are available
 */
export function getScreeningProvider(): ScreeningProvider {
  // For now, always use MockProvider (free-now build)
  // In production, can switch based on env vars:
  // if (isCheckrAvailable() && process.env.USE_CHECKR === 'true') {
  //   return new CheckrProvider()
  // }
  return new MockProvider()
}

export { MockProvider } from './MockProvider'
export { CheckrProvider, isCheckrAvailable } from './CheckrProvider'
export type * from './types'
