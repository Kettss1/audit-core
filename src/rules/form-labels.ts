import { Rule, RuleResult, EvaluationContext } from './index'
import { ResolvedConfig, ViolationNode, ImpactLevel } from '../types'

const INPUT_SELECTOR =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea'

export const formLabelsRule: Rule = {
  id: 'form-labels',
  async evaluate(
    context: EvaluationContext,
    _config: ResolvedConfig,
  ): Promise<RuleResult> {
    const nodes: ViolationNode[] = []
    let worstImpact: ImpactLevel = 'minor'

    for (const el of context.candidates) {
      if (!(el instanceof HTMLElement)) continue
      if (!el.matches(INPUT_SELECTOR)) continue

      const result = checkLabel(el, context.root)
      if (result) {
        nodes.push(result.node)
        if (impactRank(result.impact) > impactRank(worstImpact)) {
          worstImpact = result.impact
        }
      }
    }

    if (nodes.length === 0) return { status: 'pass' }

    return {
      status: 'violation',
      violation: {
        ruleId: 'form-labels',
        impact: worstImpact,
        category: 'semantics',
        title: 'Form inputs missing accessible labels',
        description:
          'Form inputs must have an associated label for screen reader users',
        nodes,
      },
    }
  },
}

interface LabelCheck {
  node: ViolationNode
  impact: ImpactLevel
}

function checkLabel(
  el: HTMLElement,
  root: Element | Document,
): LabelCheck | null {
  // 1. Explicit <label for="id">
  if (el.id) {
    const label = root.querySelector(`label[for="${CSS.escape(el.id)}"]`)
    if (label && label.textContent?.trim()) return null
  }

  // 2. Wrapped in <label>
  if (el.closest('label')?.textContent?.trim()) return null

  // 3. aria-label
  const ariaLabel = el.getAttribute('aria-label')?.trim()
  if (ariaLabel) return null

  // 4. aria-labelledby
  const labelledBy = el.getAttribute('aria-labelledby')
  if (labelledBy) {
    const refEl = root instanceof Document
      ? root.getElementById(labelledBy)
      : root.querySelector(`#${CSS.escape(labelledBy)}`)

    if (!refEl) {
      return {
        impact: 'serious',
        node: {
          selector: getSelector(el),
          html: truncateHtml(el.outerHTML),
          reason: `aria-labelledby references "${labelledBy}" which does not exist in the DOM`,
          suggestion:
            'Point aria-labelledby to an existing element ID, or use aria-label instead',
        },
      }
    }

    if (refEl.textContent?.trim()) return null
  }

  // 5. title attribute — acceptable but not ideal
  if (el.getAttribute('title')?.trim()) {
    return {
      impact: 'minor',
      node: {
        selector: getSelector(el),
        html: truncateHtml(el.outerHTML),
        reason:
          'Input is labelled only with a title attribute, which is not consistently exposed to assistive technology',
        suggestion: 'Use a <label> element or aria-label instead of title',
      },
    }
  }

  // 6. placeholder only — not a label substitute
  if (el.getAttribute('placeholder')?.trim()) {
    return {
      impact: 'serious',
      node: {
        selector: getSelector(el),
        html: truncateHtml(el.outerHTML),
        reason:
          'Input uses placeholder as its only label — placeholders disappear on input and are not accessible labels',
        suggestion:
          'Add a visible <label> element. The placeholder can remain as a hint',
      },
    }
  }

  // No label at all
  return {
    impact: 'critical',
    node: {
      selector: getSelector(el),
      html: truncateHtml(el.outerHTML),
      reason: 'Input has no accessible label',
      suggestion:
        'Add a <label> element with a for attribute, wrap in a <label>, or add aria-label',
    },
  }
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
  const type = el.getAttribute('type')
  const name = el.getAttribute('name')
  if (type) return `${tag}[type="${type}"]`
  if (name) return `${tag}[name="${name}"]`
  return tag
}

function truncateHtml(html: string, maxLength = 200): string {
  if (html.length <= maxLength) return html
  return html.slice(0, maxLength) + '...'
}
