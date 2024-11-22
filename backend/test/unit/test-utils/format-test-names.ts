export default function formatTestNames<T extends {[key: string]: unknown}>(tests: Array<T>): Array<[string, T]> {
  return tests.map(t => {
    if (typeof t.name === 'string') return [t.name, t];

    return [JSON.stringify(t), t];
  });
}
