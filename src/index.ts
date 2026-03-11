export { createAuditor } from './auditor'
export type {
  AuditorConfig,
  AuditResult,
  Violation,
  ViolationNode,
  ImpactLevel,
  ContrastResult,
} from './types'
export type { Rule, RuleResult, EvaluationContext } from './rules'
export { captureSnapshot } from './snapshot'
export type { DOMSnapshot } from './snapshot'
