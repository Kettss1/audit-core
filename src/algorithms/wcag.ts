import { ContrastResult } from '../types'
import { parseColor, toRGB } from '../utils/color'

/**
 * Evaluates text contrast using the WCAG 2.x contrast ratio formula.
 *
 * Computes relative luminance of both colors and derives the contrast ratio.
 * Pass/fail threshold is 4.5:1 for normal text and 3:1 for large text
 * (>=18pt or >=14pt bold).
 *
 * @param textColor - CSS color string of the text.
 * @param bgColor - CSS color string of the background.
 * @param isLargeText - Whether the text qualifies as "large" per WCAG (>=18pt or >=14pt bold).
 * @returns A {@link ContrastResult} with `algorithm: 'wcag'` and the contrast ratio.
 */
export function evaluateWCAG(
  textColor: string,
  bgColor: string,
  isLargeText: boolean,
): ContrastResult {
  const L1 = relativeLuminance(toRGB(parseColor(textColor)))
  const L2 = relativeLuminance(toRGB(parseColor(bgColor)))

  const lighter = Math.max(L1, L2)
  const darker = Math.min(L1, L2)
  const ratio = (lighter + 0.05) / (darker + 0.05)

  const threshold = isLargeText ? 3 : 4.5

  return {
    value: ratio,
    passes: ratio >= threshold,
    algorithm: 'wcag',
  }
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}
