interface UnnamedTestItem {
  [key: string]: unknown;
  name?: never;
  test?: never;
}

interface NamedTestItem {
  [key: string]: unknown;
  name: string;
}

interface NamedNestedTestItem {
  name: string;
  test: unknown;
}

type TestItem = UnnamedTestItem | NamedTestItem | NamedNestedTestItem;

type FormattedTestItem<T> = T extends NamedNestedTestItem
  ? [T['name'], T['test']]
  : T extends NamedTestItem
    ? [T['name'], Omit<T, 'name'>]
    : [string, T];

export default function formatTestNames<T extends TestItem>(tests: Array<T>): Array<FormattedTestItem<T>> {
  return tests.map(t => {
    if (typeof t.name === 'string' && 'test' in t) return [t.name, t.test] as FormattedTestItem<T>;

    if (typeof t.name === 'string') {
      const {name, ...rest} = t;
      return [name, rest] as FormattedTestItem<T>;
    }

    return [JSON.stringify(t), t] as FormattedTestItem<T>;
  });
}

// const t = formatTestNames([{name: '1', asdf: 'asdf'}]);
