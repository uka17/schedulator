interface NextOccurrenceResult {
  result: Date;
  error?: string;
}

/**
 * Calculates next run date and time
 * @param {Record<string, unknown>} schedule Schedule for which next run date and time should be calculated
 * @returns {NextOccurrenceResult} Result of next occurrence calculation
 */
export declare function nextOccurrence(
  schedule: Record<string, unknown>
): NextOccurrenceResult;

/**
 * Prints summary of schedule object in human readable format. E.g. "Each 2 day(s) at 11:30:00"
 * @param {Record<string, unknown>} schedule Schedule for which summary should be printed
 * @param {Object} locale Optional. An object that contains one or more properties that specify comparison options (see Date.toLocaleString)
 * @param {string} options Optional. A locale string or array of locale (see Date.toLocaleString)
 * @returns {string} String with summary
 */
export declare function summary(
  schedule: Record<string, unknown>,
  locale?: Object,
  options?: string
): string;
