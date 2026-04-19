import { FullConfig } from '@playwright/test';
/**
 * Global setup for the test suite
 * Runs once before all tests
 */
declare function globalSetup(config: FullConfig): Promise<void>;
export default globalSetup;
//# sourceMappingURL=global-setup.d.ts.map