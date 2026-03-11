import { Rule, RuleResult, EvaluationContext } from './index'
import { ResolvedConfig, ViolationNode } from '../types'
import { evaluateWCAG } from '../algorithms/wcag'
import { evaluateAPCA } from '../algorithms/apca'

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]',
  '[role="link"]',
].join(', ')

export const focusVisibleRule: Rule = {
  id: 'focus-visible',
  async evaluate(
    context: EvaluationContext,
    config: ResolvedConfig,
  ): Promise<RuleResult> {
    if (!config.capabilities.canEvaluatePseudoClasses) {
      return {
        status: 'incomplete',
        reason:
          'Focus styles require a real browser environment to evaluate — cannot assess pseudo-classes in a headless context',
      }
    }

    const nodes: ViolationNode[] = []
    const previouslyFocused = document.activeElement

    for (const el of context.candidates) {
      if (!(el instanceof HTMLElement)) continue
      if (!el.matches(INTERACTIVE_SELECTOR)) continue

      const styles = window.getComputedStyle(el)
      if (styles.display === 'none' || styles.visibility === 'hidden') continue

      // Capture pre-focus styles
      const preFocus = captureVisualState(el)

      // Programmatically focus to read focus styles
      el.focus({ preventScroll: true })

      if (document.activeElement !== el) continue

      const postFocus = captureVisualState(el)

      // Check if there's any visible change indicating focus
      const hasVisibleFocus = detectFocusChange(preFocus, postFocus)

      if (!hasVisibleFocus) {
        nodes.push({
          selector: getSelector(el),
          html: truncateHtml(el.outerHTML),
          reason:
            'Element has no visible focus indicator — no change in outline, border, box-shadow, or background on focus',
          suggestion:
            'Add a visible focus style using :focus-visible { outline: 2px solid; } or equivalent',
        })
        continue
      }

      // Check focus indicator contrast against adjacent color
      const contrastIssue = checkFocusContrast(
        preFocus,
        postFocus,
        el,
        config,
      )
      if (contrastIssue) {
        nodes.push(contrastIssue)
      }
    }

    // Restore focus
    if (previouslyFocused instanceof HTMLElement) {
      previouslyFocused.focus({ preventScroll: true })
    } else {
      (document.activeElement as HTMLElement)?.blur?.()
    }

    if (nodes.length === 0) return { status: 'pass' }

    return {
      status: 'violation',
      violation: {
        ruleId: 'focus-visible',
        impact: 'serious',
        category: 'interaction',
        title: 'Interactive elements have no visible focus indicator',
        description:
          'Interactive elements must have a visible focus indicator for keyboard users',
        nodes,
      },
    }
  },
}

interface VisualState {
  outline: string
  outlineColor: string
  outlineWidth: string
  border: string
  borderColor: string
  boxShadow: string
  backgroundColor: string
}

function captureVisualState(el: HTMLElement): VisualState {
  const s = window.getComputedStyle(el)
  return {
    outline: s.outline,
    outlineColor: s.outlineColor,
    outlineWidth: s.outlineWidth,
    border: s.border,
    borderColor: s.borderColor,
    boxShadow: s.boxShadow,
    backgroundColor: s.backgroundColor,
  }
}

function detectFocusChange(before: VisualState, after: VisualState): boolean {
  // Check if outline was explicitly removed
  if (
    after.outlineWidth === '0px' &&
    after.boxShadow === 'none' &&
    after.border === before.border &&
    after.backgroundColor === before.backgroundColor
  ) {
    return false
  }

  // Any visual difference counts as a focus indicator
  return (
    before.outline !== after.outline ||
    before.border !== after.border ||
    before.boxShadow !== after.boxShadow ||
    before.backgroundColor !== after.backgroundColor
  )
}

function checkFocusContrast(
  before: VisualState,
  after: VisualState,
  el: HTMLElement,
  config: ResolvedConfig,
): ViolationNode | null {
  // Determine the focus indicator color and the adjacent color it needs contrast against
  let focusColor: string | null = null
  let adjacentColor: string | null = null

  if (before.outlineColor !== after.outlineColor && after.outlineWidth !== '0px') {
    // Outline changed — check outline color against background
    focusColor = after.outlineColor
    adjacentColor = after.backgroundColor
  } else if (before.borderColor !== after.borderColor) {
    // Border changed — check border color against background
    focusColor = after.borderColor
    adjacentColor = after.backgroundColor
  } else if (before.backgroundColor !== after.backgroundColor) {
    // Background changed — check new bg against old bg
    focusColor = after.backgroundColor
    adjacentColor = before.backgroundColor
  }

  if (!focusColor || !adjacentColor) return null

  // Skip if colors are unresolvable (e.g. "initial", "inherit")
  if (!isResolvedColor(focusColor) || !isResolvedColor(adjacentColor)) {
    return null
  }

  const meetsContrast =
    config.contrastAlgorithm === 'apca'
      ? checkAPCAFocusContrast(focusColor, adjacentColor)
      : checkWCAGFocusContrast(focusColor, adjacentColor)

  if (meetsContrast) return null

  return {
    selector: getSelector(el),
    html: truncateHtml(el.outerHTML),
    reason:
      'Focus indicator has insufficient contrast against adjacent colors',
    suggestion:
      'Use a focus indicator color with at least 3:1 contrast ratio (WCAG) or Lc 30 (APCA) against adjacent colors',
  }
}

function checkWCAGFocusContrast(
  focusColor: string,
  adjacentColor: string,
): boolean {
  const result = evaluateWCAG(focusColor, adjacentColor, true)
  // WCAG requires 3:1 for focus indicators (non-text contrast)
  return result.value >= 3
}

function checkAPCAFocusContrast(
  focusColor: string,
  adjacentColor: string,
): boolean {
  // For non-text elements like focus indicators, Lc 30 is the minimum
  const result = evaluateAPCA(focusColor, adjacentColor, 24, 400)
  return result.value >= 30
}

function isResolvedColor(color: string): boolean {
  return (
    color.startsWith('rgb') ||
    color.startsWith('#') ||
    color.startsWith('hsl') ||
    color.startsWith('oklch') ||
    color.startsWith('oklab')
  )
}

function getSelector(el: Element): string {
  if (el.id) return `#${el.id}`
  const tag = el.tagName.toLowerCase()
  const cls =
    el.className && typeof el.className === 'string'
      ? `.${el.className.trim().split(/\s+/)[0]}`
      : ''
  return tag + cls
}

function truncateHtml(html: string, maxLength = 200): string {
  if (html.length <= maxLength) return html
  return html.slice(0, maxLength) + '...'
}
