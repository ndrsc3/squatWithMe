// Sign up a throwaway user through the real UI, then drive the rep counter end to end:
// + and −, a typed value, persistence across reload, and 100 recording the day.
// Users are named e2e-…; e2e/clean-dev.ts deletes them from dev before each run.
import { expect, test, type Page } from '@playwright/test';

const shot = (page: Page, name: string) =>
    page.screenshot({ path: `e2e/.results/shots/${name}-${test.info().project.name}.png`, fullPage: true });

/** Wait for the debounced save of `count` to land. */
const saved = (page: Page, count: number) =>
    page.waitForResponse(
        (r) => r.url().includes('/api/squat-reps') && r.request().method() === 'POST' && r.request().postDataJSON()?.count === count,
    );

test('rep counter: count, persist, 100 records the day', async ({ page }) => {
    const username = `e2e-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}-${test.info().project.name}`;

    await page.goto('/');
    await page.locator('#show-signup').click();
    await page.locator('#signup-username').fill(username);
    await page.locator('#signup-password').fill('e2e-password-1');
    await page.locator('#signup-displayname').fill('E2E');
    const signedUp = page.waitForResponse((r) => r.url().includes('/api/auth-signup'));
    await page.locator('#signup-submit').click();
    const signup = await signedUp;
    expect(signup.ok(), `signup ${signup.status()}: ${await signup.text()}`).toBe(true);

    const count = page.locator('#rep-count');
    const button = page.locator('#squat-button');
    const status = page.locator('#squat-status');
    await expect(count).toBeVisible();
    await expect(count).toHaveValue('0');
    await expect(page.getByText('For those who lack discipline...')).toBeVisible();
    await shot(page, '1-signed-in');

    // + three times, − once: one debounced write of 2.
    const twoSaved = saved(page, 2);
    for (let i = 0; i < 3; i++) await page.locator('#rep-plus').click();
    await page.locator('#rep-minus').click();
    await expect(count).toHaveValue('2');
    await twoSaved;

    await page.reload();
    await expect(count).toHaveValue('2');

    // A typed value; 99 doesn't record the day.
    const ninetyNine = saved(page, 99);
    await count.fill('99');
    await count.press('Enter');
    await count.blur();
    expect((await (await ninetyNine).json()).recorded).toBe(false);
    await expect(button).toBeVisible();
    await shot(page, '2-ninety-nine');

    // One more: 100 records the day and swaps the button for the done status.
    const hundred = saved(page, 100);
    await page.locator('#rep-plus').click();
    expect((await (await hundred).json()).recorded).toBe(true);
    await expect(status).toContainText('100 squats today');
    await expect(button).toBeHidden();
    await expect(page.locator('#you-status')).toHaveText('Squatted today 💪');
    await expect(page.locator('#user-streak')).toHaveText('1');
    await shot(page, '3-recorded');

    await page.reload();
    await expect(count).toHaveValue('100');
    await expect(status).toContainText('100 squats today');
    await expect(page.locator('#you-status')).toHaveText('Squatted today 💪');
});
