import { test, expect } from "@playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.click("#start");
  await page.locator(".choice").first().click();
  await page.click("#designer-done");
  await page.waitForFunction(() => window.__game);
}

const stand = (page, x, money) =>
  page.evaluate(([x, money]) => {
    const p = window.__game.player;
    Object.assign(p, { room: "shop", x, y: 0, vy: 0 });
    if (money !== undefined) p.money = money;
  }, [x, money]);
const state = (page) => page.evaluate(() => ({ kind: window.__game.player.helperKind, money: window.__game.player.money }));
const label = (page) => page.evaluate(() => window.__game.actions().map((a) => a.label));

test("buying an animal costs coins and it becomes your helper", async ({ page }) => {
  await startGame(page);
  await stand(page, 875, 20); // cat, 8 coins
  await page.waitForFunction(() => window.__game.actions().some((a) => a.label.startsWith("Buy cat")));
  await page.keyboard.press("KeyY");
  await page.waitForFunction(() => window.__game.player.helperKind === "cat");
  expect(await state(page)).toEqual({ kind: "cat", money: 12 });
});

test("every animal has a price and a spot in the shop", async ({ page }) => {
  await startGame(page);
  const pets = await page.evaluate(() => window.__game.pets);
  expect(pets.map((p) => p.kind).sort()).toEqual(["bat", "cat", "owl", "spider"]);
  for (const p of pets) expect(p.price).toBeGreaterThan(0);
});

test("a new animal replaces the old helper", async ({ page }) => {
  await startGame(page);
  await stand(page, 725, 20); // spider
  await page.keyboard.press("KeyY");
  await page.waitForFunction(() => window.__game.player.helperKind === "spider");
  await stand(page, 800); // bat
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__game.player.helperKind === "bat");
  expect((await state(page)).money).toBe(10);
});

test("not enough coins: the animal is not bought (unhappy path)", async ({ page }) => {
  await startGame(page);
  await stand(page, 950, 3); // owl, 10 coins
  await page.keyboard.press("KeyY");
  await page.waitForTimeout(200);
  const s = await state(page);
  expect(s.kind).not.toBe("owl");
  expect(s.money).toBe(3);
});

test("you cannot buy the animal you already have, or buy away from the cages (unhappy path)", async ({ page }) => {
  await startGame(page);
  await stand(page, 725, 20);
  await page.keyboard.press("KeyY");
  await page.waitForFunction(() => window.__game.player.helperKind === "spider");
  await page.waitForTimeout(150);
  expect((await label(page)).some((l) => l.startsWith("Buy"))).toBe(false);
  await stand(page, 500);
  await page.keyboard.press("KeyY");
  await page.waitForTimeout(150);
  expect((await state(page)).money).toBe(16);
});
