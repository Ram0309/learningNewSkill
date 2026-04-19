import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

/**
 * UUID utility for generating unique execution IDs
 */
export class UUIDGenerator {
  private static readonly NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  /**
   * Generate a random UUID v4
   */
  static generateExecutionId(): string {
    return uuidv4();
  }

  /**
   * Generate a deterministic UUID v5 based on input
   * Useful for creating consistent IDs for the same input
   */
  static generateDeterministicId(input: string): string {
    return uuidv5(input, this.NAMESPACE);
  }

  /**
   * Generate execution ID with timestamp prefix for better sorting
   */
  static generateTimestampedId(): string {
    const timestamp = Date.now().toString(36);
    const uuid = uuidv4().split('-')[0];
    return `${timestamp}-${uuid}`;
  }

  /**
   * Generate test case ID based on test name and suite
   */
  static generateTestCaseId(testName: string, testSuite: string): string {
    const input = `${testSuite}:${testName}`;
    return this.generateDeterministicId(input);
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Extract timestamp from timestamped UUID
   */
  static extractTimestamp(timestampedId: string): number | null {
    try {
      const parts = timestampedId.split('-');
      if (parts.length >= 2) {
        return parseInt(parts[0], 36);
      }
      return null;
    } catch {
      return null;
    }
  }
}