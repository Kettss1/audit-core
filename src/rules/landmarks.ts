import { Rule, RuleResult, EvaluationContext } from './index'
import { ResolvedConfig, ViolationNode, ImpactLevel } from '../types'

export const landmarksRule: Rule = {
  id: 'landmarks',
  async evaluate(
    context: EvaluationContext,
    _config: ResolvedConfig,
  ): Promise<RuleResult> {
    const nodes: ViolationNode[] = []
    let worstImpact: ImpactLevel = 'minor'

    const candidateSet = new Set(context.candidates)

    // Query from root for full structural context
    const mains = Array.from(
      context.root.querySelectorAll('main, [role="main"]'),
    )
    const navs = Array.from(
      context.root.querySelectorAll('nav, [role="navigation"]'),
    )

    // No <main> landmark
    if (mains.length === 0) {
      nodes.push({
        selector: 'html',
        html: '',
        reason: 'Page has no main landmark',
        suggestion:
          'Add a <main> element wrapping the primary content of the page',
      })
      worstImpact = 'critical'
    }

    // Multiple <main> without aria-label
    if (mains.length > 1) {
      for (const main of mains) {
        if (!candidateSet.has(main)) continue
        if (!main.getAttribute('aria-label')?.trim()) {
          nodes.push({
            selector: getSelector(main),
            html: truncateHtml(main.outerHTML),
            reason:
              'Multiple main landmarks exist without aria-label to distinguish them',
            suggestion:
              'Add aria-label to each <main> to help screen readers differentiate them',
          })
          if (impactRank('serious') > impactRank(worstImpact)) {
            worstImpact = 'serious'
          }
        }
      }
    }

    // Multiple <nav> without aria-label
    if (navs.length > 1) {
      for (const nav of navs) {
        if (!candidateSet.has(nav)) continue
        if (!nav.getAttribute('aria-label')?.trim()) {
          nodes.push({
            selector: getSelector(nav),
            html: truncateHtml(nav.outerHTML),
            reason:
              'Multiple nav landmarks exist without aria-label to distinguish them',
            suggestion:
              'Add aria-label (e.g. "Main navigation", "Footer navigation") to each <nav>',
          })
          if (impactRank('moderate') > impactRank(worstImpact)) {
            worstImpact = 'moderate'
          }
        }
      }
    }

    if (nodes.length === 0) return { status: 'pass' }

    return {
      status: 'violation',
      violation: {
        ruleId: 'landmarks',
        impact: worstImpact,
        category: 'structure',
        title: 'Landmark regions are missing or improperly configured',
        description:
          'Pages should use landmark regions to help screen reader users navigate',
        nodes,
      },
    }
  },
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
  const role = el.getAttribute('role')
  if (role) return `[role="${role}"]`
  return tag
}

function truncateHtml(html: string, maxLength = 200): string {
  if (html.length <= maxLength) return html
  return html.slice(0, maxLength) + '...'
}
