// Types
export type {
  ScheduleSlot,
  StaffMember,
  Room,
} from './types/schedule.types'

export type {
  ConstraintType,
  Constraint,
  ValidationResult,
  RuleFunction,
} from './types/constraint.types'

export type {
  GeneratorInput,
  GeneratorResult,
  UnresolvedSlot,
} from './types/generator.types'

// Constraints
export { validateSlot, validateSchedule } from './constraints/validator'

// Generator
export { generateSchedule } from './generator/generator'

// Utils
export {
  getWeekNumber,
  getShiftDurationMinutes,
  getDatesInRange,
  getDayOfWeek,
  doTimesOverlap,
  getMinutesBetween,
} from './utils'
