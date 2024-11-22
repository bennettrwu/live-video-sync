import {vi, type Mocked} from 'vitest';

export default function fakeClass<A>(toFake: {new (...args: never[]): A}): Mocked<A> {
  const fakeClass: {[key: string]: () => unknown} = {};
  for (const method of Object.getOwnPropertyNames(toFake.prototype)) {
    if (method === 'constructor') continue;
    fakeClass[method] = vi.fn();
  }
  return fakeClass as Mocked<A>;
}
