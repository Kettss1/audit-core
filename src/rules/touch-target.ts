import { Rule, RuleResult, EvaluationContext } from './index'
import { ResolvedConfig, ViolationNode, ImpactLevel } from '../types'

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  '[role="button"]',
  '[role="link"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'select',
].join(', ')

const TARGET_IDEAL = 44
const TARGET_MINIMUM = 24

export const touchTargetRule: Rule = {
  id: 'touch-target',
  async evaluate(
    context: EvaluationContext,
    config: ResolvedConfig,
  ): Promise<RuleResult> {
    if (!config.capabilities.hasRenderedLayout) {
      return {
        status: 'incomplete',
        reason:
          'Touch target sizes require a real browser with rendered layout — getBoundingClientRect returns zeros in headless environments',
      }
    }

    const nodes: ViolationNode[] = []
    let worstImpact: ImpactLevel = 'minor'

    for (const el of context.candidates) {
      if (!(el instanceof HTMLElement)) continue
      if (!el.matches(INTERACTIVE_SELECTOR)) continue

      // Skip inline links within body text
      if (isInlineLink(el)) continue

      const styles = window.getComputedStyle(el)
      if (styles.display === 'none' || styles.visibility === 'hidden') continue

      const rect = el.getBoundingClientRect()
      const width = rect.width
      const height = rect.height

      if (width === 0 || height === 0) continue

      if (width < TARGET_MINIMUM || height < TARGET_MINIMUM) {
        nodes.push({
          selector: getSelector(el),
          html: truncateHtml(el.outerHTML),
          reason: `Touch target is ${Math.round(width)}x${Math.round(height)}px — below the minimum ${TARGET_MINIMUM}x${TARGET_MINIMUM}px`,
          suggestion: `Increase the element size to at least ${TARGET_MINIMUM}x${TARGET_MINIMUM}px, ideally ${TARGET_IDEAL}x${TARGET_IDEAL}px`,
        })
        if (impactRank('critical') > impactRank(worstImpact)) {
          worstImpact = 'critical'
        }
      } else if (width < TARGET_IDEAL || height < TARGET_IDEAL) {
        nodes.push({
          selector: getSelector(el),
          html: truncateHtml(el.outerHTML),
          reason: `Touch target is ${Math.round(width)}x${Math.round(height)}px — below the recommended ${TARGET_IDEAL}x${TARGET_IDEAL}px`,
          suggestion: `Increase the element size to ${TARGET_IDEAL}x${TARGET_IDEAL}px for better touch accessibility`,
        })
      }
    }

    if (nodes.length === 0) return { status: 'pass' }

    return {
      status: 'violation',
      violation: {
        ruleId: 'touch-target',
        impact: worstImpact,
        category: 'interaction',
        title: 'Touch targets are too small',
        description:
          'Interactive elements should meet minimum touch target size for accessibility',
        nodes,
      },
    }
  },
}

function isInlineLink(el: Element): boolean {
  if (el.tagName.toLowerCase() !== 'a') return false

  const styles = window.getComputedStyle(el)
  if (styles.display !== 'inline') return false

  // Check if it's inside a paragraph or similar text container
  const parent = el.parentElement
  if (!parent) return false

  const parentTag = parent.tagName.toLowerCase()
  return ['p', 'li', 'td', 'th', 'dd', 'span', 'blockquote'].includes(
    parentTag,
  )
}

function impactRank(impact: ImpactLevel): number {
  const ranks: Record<ImpactLevel, number> = {
    minor: 0,
    moderate: 1,
    serious: 2,
    critical: 3,
  }
  return ranks[impact]
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
