import { FullConfig } from '@playwright/test';
/**
 * Global teardown for the test suite
 * Runs once after all tests complete
 */
declare function globalTeardown(config: FullConfig): Promise<void>;
export default globalTeardown;
//# sourceMappingURL=global-teardown.d.ts.map