import { test, expect } from "@playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.click("#start");
  await page.locator(".choice").first().click();
  await page.click("#designer-done");
  await page.waitForFunction(() => window.__game);
}

test("every house room is nearly as spooky as the shop, never spookier", async ({ page }) => {
  await startGame(page);
  const { shop, houses } = await page.evaluate(() => {
    const rooms = window.__game.rooms;
    const skip = ["outside", "shop", "arena"];
    return {
      shop: rooms.shop.spooky,
      houses: Object.entries(rooms).filter(([k]) => !skip.includes(k)).map(([k, r]) => [k, r.spooky]),
    };
  });
  expect(houses.length).toBe(17);
  for (const [name, level] of houses) {
    expect(level, name).toBeLessThanOrEqual(shop);
    expect(level, name).toBeGreaterThanOrEqual(shop - 1);
  }
});

test("a house room is drawn with spooky decorations", async ({ page }) => {
  await startGame(page);
  const lit = async (room) => {
    await page.evaluate((room) => Object.assign(window.__game.player, { room, x: 700, y: 0 }), room);
    await page.waitForTimeout(150);
    // the ceiling bats are drawn at the top of the view
    return page.evaluate(() => {
      const d = document.getElementById("game").getContext("2d").getImageData(0, 0, 960, 60).data;
      let dark = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 60 && d[i + 1] < 60 && d[i + 2] < 70 && d[i + 3] > 0) dark++;
      return dark;
    });
  };
  expect(await lit("homeKitchen")).toBeGreaterThan(50);
  expect(await lit("blueDad")).toBeGreaterThan(50);
});
