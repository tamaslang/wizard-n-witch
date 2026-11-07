import { test, expect } from "@playwright/test";

const SKIN = [232, 213, 181, 255];
const mumRooms = ["mum", "pinkMum", "blueMum", "yellowMum"];

async function startGame(page) {
  await page.goto("/");
  await page.click("#start");
  await page.locator(".choice").first().click();
  await page.click("#designer-done");
  await page.waitForFunction(() => window.__game);
}

const forehead = (page, id, room = id, x = 1000) =>
  page.evaluate(([id, room, x]) => {
    const g = window.__game;
    g.parentControl.place(id, room, x);
    g.player.room = room;
    g.player.x = 900;
    return new Promise((resolve) => setTimeout(() => {
      const { x, y } = g.parentFace(id);
      resolve([...document.getElementById("game").getContext("2d").getImageData(x, y, 1, 1).data]);
    }, 150));
  }, [id, room, x]);

for (const room of mumRooms) {
  test(`${room} has a mum standing in it`, async ({ page }) => {
    await startGame(page);
    expect(await forehead(page, room)).toEqual(SKIN);
  });
}

test("there is no mum in a dad's room (unhappy path)", async ({ page }) => {
  await startGame(page);
  const pixel = await page.evaluate(() => {
    const g = window.__game;
    g.parentControl.place("pinkMum", "pinkMum", 1000);
    g.player.room = "pinkDad";
    g.player.x = 900;
    return new Promise((resolve) => setTimeout(() => {
      const { x, y } = g.parentFace("pinkMum");
      resolve([...document.getElementById("game").getContext("2d").getImageData(x, y, 1, 1).data]);
    }, 150));
  });
  expect(pixel).not.toEqual(SKIN);
});
