import { type Browser, type Page, expect, test } from '@playwright/test';

const ROOM = 'e2e';

async function join(browser: Browser, name: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  await page.getByLabel('Room code').fill(ROOM);
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Join' }).click();
  await expect(page).toHaveURL(new RegExp(`/r/${ROOM}$`));
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  return page;
}

async function currentTime(page: Page): Promise<number> {
  return page.evaluate(
    () => document.querySelector('video')?.currentTime ?? NaN,
  );
}

async function isPaused(page: Page): Promise<boolean> {
  return page.evaluate(() => document.querySelector('video')?.paused ?? true);
}

test.describe('a room with two viewers', () => {
  let alice: Page;
  let bob: Page;

  test.beforeAll(async ({ browser }) => {
    alice = await join(browser, 'Alice');
    bob = await join(browser, 'Bob');
  });

  test.afterAll(async () => {
    await alice.context().close();
    await bob.context().close();
  });

  test('both see each other in the member list and log', async () => {
    await expect(alice.getByText('Bob', { exact: true })).toBeVisible();
    await expect(bob.getByText('Alice', { exact: true })).toBeVisible();
    await expect(alice.getByText('Bob joined')).toBeVisible();
  });

  test('selecting media loads it paused at zero for everyone', async () => {
    await alice
      .getByRole('button', { name: 'Big Buck Bunny (clip A)' })
      .click();

    await expect(
      alice.getByText('Alice switched to Big Buck Bunny (clip A)'),
    ).toBeVisible();
    await expect.poll(() => isPaused(bob)).toBe(true);
    await expect.poll(() => currentTime(bob)).toBeLessThan(0.5);
  });

  test('play from one viewer starts playback for the other, in sync', async () => {
    await alice.getByRole('button', { name: 'Play' }).click();
    await alice
      .locator('video')
      .evaluate((video: HTMLVideoElement) =>
        video.play().catch(() => undefined),
      );

    await expect.poll(() => isPaused(bob), { timeout: 15_000 }).toBe(false);
    await bob
      .locator('video')
      .evaluate((video: HTMLVideoElement) =>
        video.play().catch(() => undefined),
      );
    await alice.waitForTimeout(3000);

    const [a, b] = await Promise.all([currentTime(alice), currentTime(bob)]);
    expect(a).toBeGreaterThan(1);
    expect(Math.abs(a - b)).toBeLessThan(0.5);
    await expect(bob.getByText(/Alice played at/)).toBeVisible();
  });

  test('a seek from one viewer moves the other', async () => {
    await bob.locator('video').evaluate((video: HTMLVideoElement) => {
      video.focus();
    });
    await bob.keyboard.press('l');

    await expect
      .poll(() => currentTime(alice), { timeout: 10_000 })
      .toBeGreaterThan(8);
    await expect(alice.getByText(/Bob seeked/)).toBeVisible();
  });

  test('pause from one viewer pauses the other', async () => {
    await bob.getByRole('button', { name: 'Pause' }).click();

    await expect.poll(() => isPaused(alice)).toBe(true);
    await expect(alice.getByText(/Bob paused at/)).toBeVisible();
  });

  test('switching media while playing lands everyone paused at the start', async () => {
    await alice.getByRole('button', { name: 'Play' }).click();
    await alice
      .getByRole('button', { name: 'Big Buck Bunny (clip B)' })
      .click();

    await expect.poll(() => isPaused(bob)).toBe(true);
    await expect.poll(() => currentTime(bob)).toBeLessThan(0.5);
    await expect(
      bob.getByText('Alice switched to Big Buck Bunny (clip B)'),
    ).toBeVisible();
  });
});
