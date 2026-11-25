import { test, expect } from "@playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.click("#start");
  await page.locator(".choice").first().click();
  await page.click("#designer-done");
  await page.waitForFunction(() => window.__game);
}

const stand = (page, room, x, extra = {}) =>
  page.evaluate(([room, x, extra]) => {
    Object.assign(window.__game.player, { room, x, y: 0, vy: 0, ...extra });
  }, [room, x, extra]);

const hints = (page) => page.locator("#actions .hint-chip").allTextContents();
const hint = (page, text) => page.locator("#actions .hint-chip", { hasText: text });

test("a hint shows the key when a door is close, and E uses it", async ({ page }) => {
  await startGame(page);
  await stand(page, "home", 1765);
  await expect(hint(page, "Enter Mum")).toBeVisible();
  await expect(hint(page, "Enter Mum").locator("kbd")).toHaveText("Enter");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__game.player.room === "mum");
});

test("T takes a potion from a shelf and the hint goes away when none are close", async ({ page }) => {
  await startGame(page);
  await stand(page, "myRoom", 740);
  await expect(hint(page, "Take potion")).toBeVisible();
  await page.keyboard.press("KeyT");
  await expect.poll(() => page.evaluate(() => window.__game.player.bag.length)).toBe(1);
  await stand(page, "myRoom", 1650);
  await expect(page.locator("#actions .hint-chip")).toHaveCount(0);
});

test("O opens the fridge, C sits and stands, H says hello", async ({ page }) => {
  await startGame(page);
  await stand(page, "homeKitchen", 1375);
  await expect(hint(page, "Open fridge")).toBeVisible();
  await page.keyboard.press("KeyO");
  await page.waitForFunction(() => window.__game.openFridges.has("homeKitchen"));
  await expect(hint(page, "Close fridge")).toBeVisible();

  await stand(page, "homeKitchen", 1520);
  await page.keyboard.press("KeyC");
  await page.waitForFunction(() => window.__game.player.seat);
  await expect(hint(page, "Stand up")).toBeVisible();
  await page.keyboard.press("KeyC");
  await page.waitForFunction(() => !window.__game.player.seat);

  await page.evaluate(() => {
    window.__game.parentControl.place("pinkDad", "pinkDad", 1000);
  });
  await stand(page, "pinkDad", 1050);
  await page.keyboard.press("KeyH");
  await page.waitForFunction(() => window.__game.talk.state.kid?.text.startsWith("Hello"));
});

test("T takes a potion out of my open cupboard and P puts it back", async ({ page }) => {
  await startGame(page);
  await stand(page, "myRoom", 375, { bag: [] });
  await page.evaluate(() => window.__game.cupboardPotions.push("#ff5fa2"));
  await expect(hint(page, "Open wardrobe")).toBeVisible();
  await page.keyboard.press("KeyO");
  await expect(hint(page, "Take potion out")).toBeVisible();
  await page.keyboard.press("KeyT");
  await expect.poll(() => page.evaluate(() => window.__game.player.bag)).toEqual(["#ff5fa2"]);
  await expect(hint(page, "Put potions away")).toBeVisible();
  await page.keyboard.press("KeyP");
  await expect.poll(() => page.evaluate(() => window.__game.cupboardPotions.length)).toBe(1);
});

test("an action key does nothing when its action is not available (unhappy path)", async ({ page }) => {
  await startGame(page);
  await stand(page, "home", 1100);
  for (const key of ["KeyE", "KeyT", "KeyO", "KeyC", "KeyP", "KeyG"]) await page.keyboard.press(key);
  await page.waitForTimeout(200);
  const state = await page.evaluate(() => ({ room: window.__game.player.room, bag: window.__game.player.bag.length, seat: !!window.__game.player.seat }));
  expect(state).toEqual({ room: "home", bag: 0, seat: false });
});

test.describe("on a touch phone", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 844, height: 390 } });

  test("tapping the action button does the action (no key needed)", async ({ page }) => {
    await startGame(page);
    await stand(page, "myRoom", 740);
    const button = hint(page, "Take potion");
    await expect(button).toBeVisible();
    await expect(button.locator("kbd")).toBeHidden();
    await button.dispatchEvent("pointerdown");
    await expect.poll(() => page.evaluate(() => window.__game.player.bag.length)).toBe(1);
  });
});

test("Enter does the main action", async ({ page }) => {
  await startGame(page);
  await stand(page, "home", 1765);
  await expect(hint(page, "Enter Mum")).toBeVisible();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__game.player.room === "mum");
});

test("Enter does nothing when there is no action (unhappy path)", async ({ page }) => {
  await startGame(page);
  await stand(page, "myRoom", 1650);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__game.player.room)).toBe("myRoom");
});

test("the hint is an overlay: the page does not move when it appears", async ({ page }) => {
  await startGame(page);
  await stand(page, "myRoom", 1650);
  await expect(page.locator("#actions .hint-chip")).toHaveCount(0);
  const before = await page.evaluate(() => document.getElementById("game").getBoundingClientRect().toJSON());
  const heightBefore = await page.evaluate(() => document.documentElement.scrollHeight);
  await stand(page, "home", 1765);
  await expect(hint(page, "Enter Mum")).toBeVisible();
  const after = await page.evaluate(() => document.getElementById("game").getBoundingClientRect().toJSON());
  expect(after).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(heightBefore);
  const inside = await page.evaluate(() => {
    const c = document.getElementById("game").getBoundingClientRect();
    const a = document.querySelector("#actions .hint-chip").getBoundingClientRect();
    return a.top >= c.top && a.bottom <= c.bottom;
  });
  expect(inside).toBe(true);
});
