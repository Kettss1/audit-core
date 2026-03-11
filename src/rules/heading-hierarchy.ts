import { Rule, RuleResult, EvaluationContext } from './index'
import { ResolvedConfig, ViolationNode, ImpactLevel } from '../types'

export const headingHierarchyRule: Rule = {
  id: 'heading-hierarchy',
  async evaluate(
    context: EvaluationContext,
    _config: ResolvedConfig,
  ): Promise<RuleResult> {
    // Query from root for full structural context
    const allHeadings = Array.from(
      context.root.querySelectorAll('h1, h2, h3, h4, h5, h6'),
    )

    if (allHeadings.length === 0) return { status: 'pass' }

    const nodes: ViolationNode[] = []
    let worstImpact: ImpactLevel = 'minor'

    // Track which elements are in the candidates set (not excluded)
    const candidateSet = new Set(context.candidates)

    // Check: no h1 at all
    const h1s = allHeadings.filter(
      (h) => h.tagName.toLowerCase() === 'h1',
    )
    if (h1s.length === 0) {
      nodes.push({
        selector: 'html',
        html: '',
        reason: 'Page has no h1 element',
        suggestion:
          'Add a single h1 element that describes the main content of the page',
      })
      worstImpact = 'serious'
    }

    // Check: multiple h1s
    if (h1s.length > 1) {
      for (const h1 of h1s.slice(1)) {
        if (!candidateSet.has(h1)) continue
        nodes.push({
          selector: getSelector(h1),
          html: truncateHtml(h1.outerHTML),
          reason: 'Page has multiple h1 elements',
          suggestion:
            'Use a single h1 for the page title. Use h2 for section headings',
        })
      }
      if (nodes.length > 0 && impactRank(worstImpact) < impactRank('minor')) {
        worstImpact = 'minor'
      }
    }

    // Check: skipped heading levels going downward
    const levels = allHeadings.map((h) =>
      parseInt(h.tagName.charAt(1), 10),
    )

    for (let i = 1; i < levels.length; i++) {
      const prev = levels[i - 1]
      const curr = levels[i]

      // Only flag downward skips (e.g. h2 -> h4)
      if (curr > prev + 1) {
        const heading = allHeadings[i]
        if (!candidateSet.has(heading)) continue

        nodes.push({
          selector: getSelector(heading),
          html: truncateHtml(heading.outerHTML),
          reason: `Heading level skips from h${prev} to h${curr}`,
          suggestion: `Use an h${prev + 1} instead, or add intermediate heading levels`,
        })
        if (impactRank('moderate') > impactRank(worstImpact)) {
          worstImpact = 'moderate'
        }
      }
    }

    if (nodes.length === 0) return { status: 'pass' }

    return {
      status: 'violation',
      violation: {
        ruleId: 'heading-hierarchy',
        impact: worstImpact,
        category: 'structure',
        title: 'Heading hierarchy is not logically ordered',
        description:
          'Headings should form a logical hierarchy without skipping levels',
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
  return el.tagName.toLowerCase()
}

function truncateHtml(html: string, maxLength = 200): string {
  if (html.length <= maxLength) return html
  return html.slice(0, maxLength) + '...'
}
