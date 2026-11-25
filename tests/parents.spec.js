import { test, expect } from "@playwright/test";

const SKIN = [232, 213, 181, 255];
const ids = ["mum", "pinkMum", "blueMum", "yellowMum", "homeDad", "pinkDad", "blueDad", "yellowDad"];
const halls = ["home", "pink", "blue", "yellow"];

async function startGame(page) {
  await page.goto("/");
  await page.click("#start");
  await page.locator(".choice").first().click();
  await page.click("#designer-done");
  await page.waitForFunction(() => window.__game);
}

const doActivity = (page, id, activity) =>
  page.evaluate(([id, activity]) => {
    const c = window.__game.parentControl;
    c.assign(id, activity);
    c.advance(id, 600);
    const p = window.__game.parents.find((q) => q.id === id);
    return { state: p.state, pose: p.pose, room: p.room, house: p.house, x: p.x, carrying: p.carrying };
  }, [id, activity]);

for (const id of ids) {
  test(`${id} can cook, sit, sleep, shop, work, visit and walk`, async ({ page }) => {
    await startGame(page);

    const cook = await doActivity(page, id, "cook");
    expect(cook).toMatchObject({ state: "doing", pose: "cook", room: `${cook.house}Kitchen`.replace("homeKitchen", "homeKitchen") });

    expect(await doActivity(page, id, "sit")).toMatchObject({ state: "doing", pose: "sit" });
    expect(await doActivity(page, id, "sleep")).toMatchObject({ state: "doing", pose: "sleep", room: id });
    expect(await doActivity(page, id, "work")).toMatchObject({ state: "doing", pose: "work", room: "shop" });

    const shop = await doActivity(page, id, "shop");
    expect(shop).toMatchObject({ state: "doing", room: "shop", carrying: true });

    const visit = await doActivity(page, id, "visit");
    expect(halls).toContain(visit.room);
    expect(visit.room).not.toBe(visit.house);

    const before = await page.evaluate((id) => window.__game.parents.find((q) => q.id === id).x, id);
    const walk = await doActivity(page, id, "walk");
    expect(walk.state).toBe("doing");
    expect(walk.x !== before || walk.room).toBeTruthy();
  });
}

test("a sleeping mum lies on her bed with her head on the pillow", async ({ page }) => {
  await startGame(page);
  await doActivity(page, "mum", "sleep");
  const pixel = await page.evaluate(() => {
    const g = window.__game;
    g.player.room = "mum";
    g.player.x = 900;
    return new Promise((resolve) => setTimeout(() => {
      const { x, y } = g.parentFace("mum");
      resolve([...document.getElementById("game").getContext("2d").getImageData(x, y, 1, 1).data]);
    }, 150));
  });
  expect(pixel).toEqual(SKIN);
});

test("parents stay in the houses, outside and the shop (unhappy path)", async ({ page }) => {
  await startGame(page);
  const rooms = await page.evaluate(() => {
    const seen = new Set();
    for (let i = 0; i < 20 * 600; i++) {
      window.__game.parentControl.step(0.05);
      for (const p of window.__game.parents) seen.add(p.room);
    }
    return [...seen];
  });
  expect(rooms).not.toContain("myRoom");
  expect(rooms.length).toBeGreaterThan(8);
});

test("parents do things on their own as time passes", async ({ page }) => {
  await startGame(page);
  const activities = await page.evaluate(() => {
    const seen = new Set();
    for (let i = 0; i < 20 * 900; i++) {
      window.__game.parentControl.step(0.05);
      for (const p of window.__game.parents) if (p.state === "doing") seen.add(p.pose);
    }
    return [...seen];
  });
  expect(activities).toEqual(expect.arrayContaining(["cook", "sit", "sleep", "work", "stand"]));
});
