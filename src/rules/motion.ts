import { Rule, RuleResult, EvaluationContext } from './index'
import { ResolvedConfig, ViolationNode } from '../types'

export const motionRule: Rule = {
  id: 'motion',
  async evaluate(
    context: EvaluationContext,
    _config: ResolvedConfig,
  ): Promise<RuleResult> {
    const nodes: ViolationNode[] = []
    const incompleteReasons: string[] = []

    // Check for prefers-reduced-motion rules in stylesheets
    const hasReducedMotionQuery = await checkStylesheetsForReducedMotion(
      incompleteReasons,
    )

    // Check animated elements
    for (const el of context.candidates) {
      if (!(el instanceof HTMLElement)) continue

      const styles = window.getComputedStyle(el)
      if (styles.display === 'none' || styles.visibility === 'hidden') continue

      const hasAnimation = hasActiveAnimation(styles)
      const hasTransition = hasActiveTransition(styles)

      if (hasAnimation || hasTransition) {
        if (!hasReducedMotionQuery) {
          const type = hasAnimation ? 'animation' : 'transition'
          nodes.push({
            selector: getSelector(el),
            html: truncateHtml(el.outerHTML),
            reason: `Element has a CSS ${type} but no @media (prefers-reduced-motion: reduce) rule was found`,
            suggestion:
              'Add a @media (prefers-reduced-motion: reduce) rule that disables or reduces this animation',
          })
        }
      }
    }

    // Check autoplay videos
    const videos = context.candidates.filter(
      (el) => el instanceof HTMLVideoElement,
    ) as HTMLVideoElement[]

    for (const video of videos) {
      if (video.autoplay) {
        nodes.push({
          selector: getSelector(video),
          html: truncateHtml(video.outerHTML),
          reason:
            'Video has autoplay enabled without prefers-reduced-motion handling',
          suggestion:
            'Check prefers-reduced-motion via matchMedia and disable autoplay when reduced motion is preferred',
        })
      }
    }

    if (incompleteReasons.length > 0 && nodes.length === 0) {
      return { status: 'incomplete', reason: incompleteReasons[0] }
    }

    if (nodes.length === 0) return { status: 'pass' }

    return {
      status: 'violation',
      violation: {
        ruleId: 'motion',
        impact: 'serious',
        category: 'motion',
        title: 'Motion is not reduced for users who prefer it',
        description:
          'Page should respect prefers-reduced-motion to avoid triggering vestibular disorders',
        nodes,
      },
    }
  },
}

function hasActiveAnimation(styles: CSSStyleDeclaration): boolean {
  const name = styles.animationName
  const duration = styles.animationDuration

  if (!name || name === 'none') return false
  if (!duration || duration === '0s' || duration === '0ms') return false

  return true
}

function hasActiveTransition(styles: CSSStyleDeclaration): boolean {
  const property = styles.transitionProperty
  const duration = styles.transitionDuration

  if (!property || property === 'none') return false
  if (!duration || duration === '0s' || duration === '0ms') return false

  // Filter out very short transitions (hover feedback etc)
  const ms = parseDuration(duration)
  return ms > 200
}

function parseDuration(duration: string): number {
  const match = duration.match(/^([\d.]+)(ms|s)$/)
  if (!match) return 0
  const value = parseFloat(match[1])
  return match[2] === 's' ? value * 1000 : value
}

async function checkStylesheetsForReducedMotion(
  incompleteReasons: string[],
): Promise<boolean> {
  for (const sheet of Array.from(document.styleSheets)) {
    const found = await checkSheet(sheet, incompleteReasons)
    if (found) return true
  }
  return false
}

async function checkSheet(
  sheet: CSSStyleSheet,
  incompleteReasons: string[],
): Promise<boolean> {
  // Layer 1: try direct access
  try {
    return scanRulesForReducedMotion(sheet.cssRules)
  } catch {
    // SecurityError — cross-origin sheet
  }

  // Layer 2: try re-fetching
  if (sheet.href) {
    try {
      const response = await fetch(sheet.href)
      if (response.ok) {
        const text = await response.text()
        const parsed = new CSSStyleSheet()
        parsed.replaceSync(text)
        return scanRulesForReducedMotion(parsed.cssRules)
      }
    } catch {
      // CORS or network error
    }

    // Layer 3: give up on this sheet
    incompleteReasons.push(
      `Cross-origin stylesheet inaccessible: ${sheet.href}`,
    )
  }

  return false
}

function scanRulesForReducedMotion(rules: CSSRuleList): boolean {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSMediaRule) {
      if (rule.conditionText.includes('prefers-reduced-motion')) {
        return true
      }
    }
  }
  return false
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
