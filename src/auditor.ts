import { AuditorConfig, ResolvedConfig, AuditResult, Violation } from './types'
import { DEFAULT_CONFIG } from './config'
import { detectCapabilities } from './env'
import { getAllRules, EvaluationContext } from './rules'

/**
 * Creates an auditor instance configured with the given options.
 *
 * The auditor detects environment capabilities automatically and provides
 * a `run()` method to evaluate accessibility rules against a DOM tree.
 *
 * @param userConfig - Partial configuration that overrides defaults. See {@link AuditorConfig}.
 * @returns An object with a `run(root)` method that performs the audit.
 *
 * @example
 * ```ts
 * const auditor = createAuditor({ contrastAlgorithm: 'wcag' })
 * const result = await auditor.run(document)
 * console.log(result.violations)
 * ```
 */
export function createAuditor(userConfig: Partial<AuditorConfig> = {}) {
  const config: ResolvedConfig = {
    ...DEFAULT_CONFIG,
    ...userConfig,
    capabilities: detectCapabilities(),
  }

  return {
    async run(root: Element | Document): Promise<AuditResult> {
      const rules = getAllRules(config)
      const violations: Violation[] = []
      const passes: string[] = []
      const incomplete: { ruleId: string; reason: string }[] = []

      const allElements = Array.from(root.querySelectorAll('*'))
      const excludeSelectors = config.exclude ?? []
      const candidates =
        excludeSelectors.length > 0
          ? allElements.filter(
              (el) => !excludeSelectors.some((sel) => el.closest(sel)),
            )
          : allElements

      const context: EvaluationContext = { root, candidates }

      for (const rule of rules) {
        const result = await rule.evaluate(context, config)

        if (result.status === 'violation') violations.push(result.violation)
        if (result.status === 'pass') passes.push(rule.id)
        if (result.status === 'incomplete')
          incomplete.push({ ruleId: rule.id, reason: result.reason })
      }

      return {
        violations,
        passes,
        incomplete,
        meta: {
          algorithm: config.contrastAlgorithm,
          rulesRun: rules.length,
          timestamp: Date.now(),
        },
      }
    },
  }
}
