import { test, expect } from "@playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.click("#start");
  await page.locator(".choice").first().click();
  await page.click("#designer-done");
  await page.waitForFunction(() => window.__game);
}

const place = (page, room, x, y = 0) =>
  page.evaluate(([room, x, y]) => { Object.assign(window.__game.player, { room, x, y, vy: 0 }); }, [room, x, y]);
const sports = (page) => page.evaluate(() => ({ ...window.__game.sports() }));

test("the arena can be entered from the street and left again", async ({ page }) => {
  await startGame(page);
  await place(page, "outside", 3050);
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__game.player.room === "arena");
  await page.evaluate(() => { window.__game.player.x = 150 + 65; });
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__game.player.room === "outside");
});

test("the arena front is drawn on the street", async ({ page }) => {
  await startGame(page);
  await place(page, "outside", 3050);
  await page.waitForTimeout(150);
  const pixel = await page.evaluate(() => [...document.getElementById("game").getContext("2d").getImageData(300, 400, 1, 1).data]);
  expect(pixel).not.toEqual([0, 0, 0, 0]);
});

test("jumping over a hurdle counts, walking into it bumps you back", async ({ page }) => {
  await startGame(page);
  await place(page, "arena", 650);
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => window.__game.player.x > 710 || window.__game.sports().bumps > 0);
  await page.keyboard.up("ArrowRight");
  let s = await sports(page);
  expect(s.bumps).toBeGreaterThan(0);
  expect(s.hurdles).toBe(0);
  expect(await page.evaluate(() => window.__game.player.x)).toBeLessThan(700);

  await place(page, "arena", 680, 80);
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => window.__game.sports().hurdles > 0);
  await page.keyboard.up("ArrowRight");
  s = await sports(page);
  expect(s.hurdles).toBe(1);
});

test("a race can be started, finished and the best time is kept", async ({ page }) => {
  await startGame(page);
  await place(page, "arena", 450);
  await page.keyboard.press("KeyF");
  await page.waitForFunction(() => window.__game.sports().racing);
  await page.waitForTimeout(300);
  await place(page, "arena", 2310);
  await page.waitForFunction(() => !window.__game.sports().racing);
  const s = await sports(page);
  expect(s.last).toBeGreaterThan(0.2);
  expect(s.best).toBe(s.last);
});

test("shooting a basket at the hoop scores, Enter works too", async ({ page }) => {
  await startGame(page);
  await place(page, "arena", 1850);
  await page.keyboard.press("KeyB");
  await page.waitForFunction(() => window.__game.sports().baskets === 1);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__game.sports().baskets === 2);
});

test("sports actions are not offered away from the start line and hoop (unhappy path)", async ({ page }) => {
  await startGame(page);
  await place(page, "arena", 1000);
  await page.keyboard.press("KeyF");
  await page.keyboard.press("KeyB");
  await page.waitForTimeout(150);
  const s = await sports(page);
  expect(s.racing).toBe(false);
  expect(s.baskets).toBe(0);
});

test("the race does not finish before the finish line (unhappy path)", async ({ page }) => {
  await startGame(page);
  await place(page, "arena", 450);
  await page.keyboard.press("KeyF");
  await page.waitForFunction(() => window.__game.sports().racing);
  await place(page, "arena", 2000);
  await page.waitForTimeout(300);
  const s = await sports(page);
  expect(s.racing).toBe(true);
  expect(s.best).toBeNull();
});
