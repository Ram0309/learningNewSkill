declare global {
    namespace jest {
        interface Matchers<R> {
            toBeWithinRange(floor: number, ceiling: number): R;
        }
    }
    var testUtils: {
        wait: (ms: number) => Promise<void>;
        generateRandomString: (length: number) => string;
        generateRandomEmail: () => string;
    };
}
export {};
//# sourceMappingURL=jest.setup.d.ts.map