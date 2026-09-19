declare module "bun:test" {
  type TestFn = () => void | Promise<void>;
  export function describe(label: string, fn: () => void): void;
  export function it(label: string, fn: TestFn): void;
  export function test(label: string, fn: TestFn): void;
  export function beforeAll(fn: TestFn): void;
  export function afterAll(fn: TestFn): void;
  export function beforeEach(fn: TestFn): void;
  export function afterEach(fn: TestFn): void;
  export function mock<T extends (...args: never[]) => unknown>(fn?: T): T & { mock: { calls: unknown[][] } };
  export function spyOn(obj: object, method: string): { mock: { calls: unknown[][] } };
  export const expect: any;
}

declare const Bun: any;
