import { test, expect } from "@playwright/test";

const SKIN = [232, 213, 181, 255];
const dadRooms = ["homeDad", "pinkDad", "blueDad", "yellowDad"];

async function startGame(page) {
  await page.goto("/");
  await page.click("#start");
  await page.locator(".choice").first().click();
  await page.click("#designer-done");
  await page.waitForFunction(() => window.__game);
}

const sample = (page, visit, id) =>
  page.evaluate(([visit, id]) => {
    const g = window.__game;
    g.parentControl.place(id, "pinkDad", 1000);
    g.player.room = visit;
    g.player.x = 900;
    return new Promise((resolve) => setTimeout(() => {
      const { x, y } = g.parentFace(id);
      resolve([...document.getElementById("game").getContext("2d").getImageData(x, y, 1, 1).data]);
    }, 150));
  }, [visit, id]);

for (const room of dadRooms) {
  test(`${room} has a dad standing in it`, async ({ page }) => {
    await startGame(page);
    const pixel = await page.evaluate((room) => {
      const g = window.__game;
      g.parentControl.place(room, room, 1000);
      g.player.room = room;
      g.player.x = 900;
      return new Promise((resolve) => setTimeout(() => {
        const { x, y } = g.parentFace(room);
        resolve([...document.getElementById("game").getContext("2d").getImageData(x, y, 1, 1).data]);
      }, 150));
    }, room);
    expect(pixel).toEqual(SKIN);
  });
}

test("there is no dad in my room (unhappy path)", async ({ page }) => {
  await startGame(page);
  expect(await sample(page, "myRoom", "pinkDad")).not.toEqual(SKIN);
});
