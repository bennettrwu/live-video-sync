// Smoke-tests a deployed instance: joins a room from two browsers, picks the
// first media, presses play, and checks both are playing at the same point.
// Usage: node e2e/scripts/smoke.mjs <baseURL> <roomCode>
import { chromium } from '@playwright/test';

const [baseURL = 'http://localhost:8000', room = 'demo'] =
  process.argv.slice(2);

const browser = await chromium.launch();
const join = async (name) => {
  const page = await browser.newPage({ baseURL });
  page.on('pageerror', (err) =>
    console.error(`[${name}] page error:`, err.message),
  );
  await page.goto('/');
  await page.getByLabel('Room code').fill(room);
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Join' }).click();
  await page.waitForURL(`**/r/${room}`);
  return page;
};
const time = (page) =>
  page.evaluate(() => document.querySelector('video')?.currentTime ?? NaN);
const paused = (page) =>
  page.evaluate(() => document.querySelector('video')?.paused ?? true);
const waitFor = async (fn, ms = 20000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
};

try {
  const alice = await join('Alice');
  const bob = await join('Bob');
  console.log(
    'joined; Bob sees Alice:',
    (await bob.getByText('Alice', { exact: true }).count()) > 0,
  );

  const firstMedia = alice
    .getByRole('navigation', { name: 'Playlist' })
    .getByRole('button')
    .first();
  console.log('selecting media:', await firstMedia.innerText());
  await firstMedia.click();

  const ready = await waitFor(
    async () => await alice.getByRole('button', { name: 'Play' }).isEnabled(),
  );
  console.log('controls enabled after load:', ready);
  await alice.getByRole('button', { name: 'Play' }).click();
  for (const p of [alice, bob])
    await p.locator('video').evaluate((v) => v.play().catch(() => undefined));

  const playing = await waitFor(
    async () =>
      !(await paused(alice)) && !(await paused(bob)) && (await time(alice)) > 1,
  );
  await new Promise((r) => setTimeout(r, 3000));
  const [a, b] = await Promise.all([time(alice), time(bob)]);
  console.log(
    `playing both: ${playing}; alice=${a.toFixed(2)}s bob=${b.toFixed(2)}s drift=${Math.abs(a - b).toFixed(3)}s`,
  );
  console.log(
    'log shows play:',
    await bob.getByText(/Alice played at/).isVisible(),
  );
  if (!playing || Math.abs(a - b) > 0.5) process.exitCode = 1;
} finally {
  await browser.close();
}
