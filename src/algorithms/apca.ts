import { APCAcontrast, sRGBtoY, fontLookupAPCA } from 'apca-w3'
import { ContrastResult } from '../types'
import { parseColor, toRGB } from '../utils/color'

/**
 * Evaluates text contrast using the APCA (Accessible Perceptual Contrast Algorithm).
 *
 * Uses the full `fontLookupAPCA` matrix to determine pass/fail based on the
 * combination of Lc value, font size, and font weight — not simplified thresholds.
 *
 * @param textColor - CSS color string of the text.
 * @param bgColor - CSS color string of the background.
 * @param fontSize - Computed font size in pixels.
 * @param fontWeight - Computed font weight (100-900).
 * @returns A {@link ContrastResult} with `algorithm: 'apca'` and the Lc value.
 */
export function evaluateAPCA(
  textColor: string,
  bgColor: string,
  fontSize: number,
  fontWeight: number,
): ContrastResult {
  const textY = sRGBtoY(toRGB(parseColor(textColor)))
  const bgY = sRGBtoY(toRGB(parseColor(bgColor)))
  const lc = Math.abs(APCAcontrast(textY, bgY))

  return {
    value: lc,
    passes: apcaPasses(lc, fontSize, fontWeight),
    algorithm: 'apca',
  }
}

function apcaPasses(lc: number, fontSize: number, fontWeight: number): boolean {
  const lookup = fontLookupAPCA(lc)

  // fontWeight 100-900 maps to indices 1-9
  const weightIndex = Math.round(clampWeight(fontWeight) / 100)
  const minFontSize = lookup[weightIndex] as number

  // 999 = prohibited (too low contrast)
  // 777 = non-text only
  if (minFontSize >= 777) return false

  return fontSize >= minFontSize
}

function clampWeight(w: number): number {
  return Math.min(900, Math.max(100, w))
}
