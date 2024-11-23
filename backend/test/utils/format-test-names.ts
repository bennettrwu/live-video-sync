export default function formatTestNames<T extends {[key: string]: unknown} | {name: string; test: T}>(
  tests: Array<T>,
): Array<[string, T]> {
  return tests.map(t => {
    if (typeof t.name === 'string') return [t.name, t];

    if (typeof t.name === 'string' && t.test) return [t.name, t.test] as [string, T];

    return [JSON.stringify(t), t];
  });
}
