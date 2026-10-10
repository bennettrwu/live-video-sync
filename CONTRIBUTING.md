# Contributing

House rules for this repository. The design itself is in `docs/design-spec.md`.

## Layout

npm workspaces with TypeScript project references. Libraries live in
`packages/`, deployables in `apps/`, end-to-end tests in `e2e/`. Every
workspace has the same scripts: `build`, `lint`, `format`, `test:unit`, and
where relevant `test:integration` and `dev`. Imports inside a workspace use
`#src/...` and `#tests/...`; imports across workspaces use the package name.

## Names

Names carry the meaning. A function, parameter, or variable should be
descriptive enough that a reader does not need a comment to know what it is.
Files are kebab-case; server feature files are `<feature>.router.ts`,
`<feature>.controller.ts`, `<feature>.service.ts`, `<feature>.repository.ts`.

## Comments and JSDoc

- Every exported function and class has a JSDoc block that says what it does,
  in one or two short sentences.
- `@param` lines are brief. Because parameter names are descriptive, the
  description is usually a few words. Expand only when a parameter is
  unintuitive or easy to get wrong.
- `@returns` says what comes back, briefly.
- Explain *behaviour* only when it is surprising or error-prone. Do not
  restate what the code visibly does.
- Inside function bodies, comments are rare. Use one only for logic that is
  not obvious from the names, and say *why*, not *what*.
- Separate the logical sections of a longer function (validate, parse, core
  logic, package result) with a blank line rather than a comment.

## Server layering

Each feature follows one dependency direction, wired with awilix through
`fastify-platform`:

| Layer      | Does                                                                        | Never does                     |
| ---------- | --------------------------------------------------------------------------- | ------------------------------ |
| router     | maps routes (HTTP and WebSocket) to controller methods, attaches schemas    | logic                          |
| controller | parses the validated request or message, calls one service, packages reply | business rules, data access    |
| service    | business logic; orchestrates repositories and other services               | touch Fastify request or reply |
| repository | data access: in-memory stores, files, databases, other services            | business rules                 |

Services receive dependencies through the constructor. Nothing reaches for a
global.

## Tests

Three tiers, each with its own runner config:

- **unit** (`tests/unit`): one module, no I/O, fakes injected.
- **integration** (`tests/integration`): a real server or a real engine
  pipeline in-process; real sockets allowed, no browser.
- **e2e** (`e2e/`): Playwright against the built frontend and a running
  sync-server, several browser contexts in one room.

Every test body reads as arrange, act, assert, with a one-word comment on
each break:

```ts
it('freezes the clock while a member is waiting', () => {
  // Arrange
  const room = roomWithMembers(['alice', 'bob']);

  // Act
  const next = roomReducer(room, stall('bob'), now);

  // Assert
  expect(positionAt(next.playback, now + 5000)).toBe(positionAt(room.playback, now));
});
```

When the arrange step is a single line it may be folded into the act, but the
`// Act` and `// Assert` markers stay. Test names describe the behaviour, not
the method.

## Formatting and linting

Prettier and ESLint are the source of truth; run `npm run format:fix` and
`npm run lint:fix` before pushing. CI runs format, lint, typecheck, build, and
unit tests on every pull request.
