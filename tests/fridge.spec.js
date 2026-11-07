import { test, expect } from "@playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.click("#start");
  await page.locator(".choice").first().click();
  await page.click("#designer-done");
  await page.waitForFunction(() => window.__game);
}

const stand = (page, room, x) =>
  page.evaluate(([room, x]) => {
    Object.assign(window.__game.player, { room, x, y: 0, vy: 0 });
  }, [room, x]);

const open = (page, room) => page.evaluate((room) => window.__game.openFridges.has(room), room);

test("up opens and closes the fridge in the kitchen", async ({ page }) => {
  await startGame(page);
  await stand(page, "homeKitchen", 1375);
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction(() => window.__game.openFridges.has("homeKitchen"));
  await page.waitForTimeout(100);
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction(() => !window.__game.openFridges.has("homeKitchen"));
});

test("an open fridge shows yummy food", async ({ page }) => {
  await startGame(page);
  await stand(page, "homeKitchen", 1375);
  const count = () => page.evaluate(() => {
    const d = document.getElementById("game").getContext("2d").getImageData(0, 0, 960, 540).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 120 && d[i + 2] < 120) n++;
    return n;
  });
  await page.waitForTimeout(150);
  const closed = await count();
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(150);
  expect(await count()).toBeGreaterThan(closed);
});

test("up far from the fridge does not open it (unhappy path)", async ({ page }) => {
  await startGame(page);
  await stand(page, "homeKitchen", 700);
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(200);
  expect(await open(page, "homeKitchen")).toBe(false);
});

test("every mum and dad can open a fridge and close it again", async ({ page }) => {
  await startGame(page);
  const ids = ["mum", "pinkMum", "blueMum", "yellowMum", "homeDad", "pinkDad", "blueDad", "yellowDad"];
  for (const id of ids) {
    const result = await page.evaluate((id) => {
      const g = window.__game;
      g.parentControl.assign(id, "fridge");
      g.parentControl.advance(id, 600);
      const p = g.parents.find((q) => q.id === id);
      const wasOpen = g.openFridges.has(p.room);
      p.timer = 0;
      g.parentControl.step(0.05);
      const otherOpened = g.parents.some((q) => q !== p && q.opened && q.room === p.room);
      return { wasOpen, room: p.room, closed: !p.opened && (otherOpened || !g.openFridges.has(p.room)) };
    }, id);
    expect(result.room).toMatch(/Kitchen$/);
    expect(result.wasOpen).toBe(true);
    expect(result.closed).toBe(true);
  }
});
