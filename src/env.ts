import { Capabilities } from './types'

export function detectCapabilities(): Capabilities {
  const isBrowser = typeof window !== 'undefined'

  const isHeadless =
    isBrowser &&
    (navigator.webdriver === true ||
      /HeadlessChrome/.test(navigator.userAgent))

  return {
    canEvaluatePseudoClasses: isBrowser && !isHeadless,
    hasRenderedLayout: isBrowser && !isHeadless,
  }
}
