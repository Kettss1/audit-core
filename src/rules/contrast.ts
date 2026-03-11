import { Rule, RuleResult, EvaluationContext } from './index'
import { ResolvedConfig } from '../types'
import { evaluateAPCA } from '../algorithms/apca'
import { evaluateWCAG } from '../algorithms/wcag'
import { parseColor, compositeAlpha, RGBA } from '../utils/color'

export const contrastRule: Rule = {
  id: 'contrast',
  async evaluate(
    context: EvaluationContext,
    config: ResolvedConfig,
  ): Promise<RuleResult> {
    const nodes: import('../types').ViolationNode[] = []
    const incompleteReasons: string[] = []

    for (const el of context.candidates) {
      if (!(el instanceof HTMLElement)) continue
      if (!hasDirectTextContent(el)) continue

      const styles = window.getComputedStyle(el)
      if (isHidden(styles)) continue

      const fgColor = styles.color
      const bgResult = resolveBackgroundColor(el)

      if (bgResult.type === 'incomplete') {
        incompleteReasons.push(bgResult.reason)
        continue
      }

      const bgColor = bgResult.color
      const fontSize = parseFloat(styles.fontSize)
      const fontWeight = parseFontWeight(styles.fontWeight)

      const result =
        config.contrastAlgorithm === 'apca'
          ? evaluateAPCA(fgColor, bgColor, fontSize, fontWeight)
          : evaluateWCAG(fgColor, bgColor, isLargeText(fontSize, fontWeight))

      if (!result.passes) {
        const valueLabel =
          result.algorithm === 'apca'
            ? `Lc ${result.value.toFixed(1)}`
            : `${result.value.toFixed(2)}:1`

        nodes.push({
          selector: getSelector(el),
          html: truncateHtml(el.outerHTML),
          reason: `Contrast ${valueLabel} is below the required threshold`,
          suggestion:
            result.algorithm === 'apca'
              ? 'Increase contrast to meet APCA threshold for this font size and weight'
              : `Increase contrast to at least ${isLargeText(fontSize, fontWeight) ? '3:1' : '4.5:1'}`,
        })
      }
    }

    if (incompleteReasons.length > 0 && nodes.length === 0) {
      return {
        status: 'incomplete',
        reason: incompleteReasons[0],
      }
    }

    if (nodes.length === 0) {
      return { status: 'pass' }
    }

    return {
      status: 'violation',
      violation: {
        ruleId: 'contrast',
        impact: 'serious',
        category: 'contrast',
        title: 'Insufficient text contrast',
        description:
          'Text does not have sufficient contrast against its background',
        nodes,
      },
    }
  },
}

type BgResult =
  | { type: 'resolved'; color: string }
  | { type: 'incomplete'; reason: string }

function resolveBackgroundColor(el: Element): BgResult {
  let current: Element | null = el
  let composited: RGBA = [0, 0, 0, 0]

  while (current) {
    const styles = window.getComputedStyle(current)
    const bgValue = styles.backgroundColor

    if (hasBackgroundImage(styles)) {
      return {
        type: 'incomplete',
        reason: 'Element has a background image — cannot evaluate contrast automatically',
      }
    }

    if (bgValue && bgValue !== 'transparent' && bgValue !== 'rgba(0, 0, 0, 0)') {
      const parsed = parseColor(bgValue)

      if (composited[3] === 0) {
        composited = parsed
      } else {
        composited = compositeAlpha(composited, parsed)
      }

      if (composited[3] >= 1) {
        return {
          type: 'resolved',
          color: `rgb(${composited[0]}, ${composited[1]}, ${composited[2]})`,
        }
      }
    }

    current = current.parentElement
  }

  // Reached the root without a fully opaque background — assume white
  if (composited[3] > 0) {
    const over = compositeAlpha(composited, [255, 255, 255, 1])
    return {
      type: 'resolved',
      color: `rgb(${over[0]}, ${over[1]}, ${over[2]})`,
    }
  }

  return { type: 'resolved', color: 'rgb(255, 255, 255)' }
}

function hasBackgroundImage(styles: CSSStyleDeclaration): boolean {
  const bg = styles.backgroundImage
  return bg !== 'none' && bg !== ''
}

function hasDirectTextContent(el: Element): boolean {
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      return true
    }
  }
  return false
}

function isHidden(styles: CSSStyleDeclaration): boolean {
  return (
    styles.display === 'none' ||
    styles.visibility === 'hidden' ||
    styles.opacity === '0'
  )
}

function parseFontWeight(weight: string): number {
  const map: Record<string, number> = {
    normal: 400,
    bold: 700,
  }
  return map[weight] ?? (parseInt(weight, 10) || 400)
}

function isLargeText(fontSize: number, fontWeight: number): boolean {
  return fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700)
}

function getSelector(el: Element): string {
  if (el.id) return `#${el.id}`

  const parts: string[] = []
  let current: Element | null = el

  while (current && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase()

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/)
      if (classes.length > 0 && classes[0]) {
        selector += `.${classes[0]}`
      }
    }

    parts.unshift(selector)
    current = current.parentElement
  }

  return parts.join(' > ')
}

function truncateHtml(html: string, maxLength = 200): string {
  if (html.length <= maxLength) return html
  return html.slice(0, maxLength) + '...'
}
