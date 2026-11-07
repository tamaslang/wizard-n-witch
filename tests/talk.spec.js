import { test, expect } from "@playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.click("#start");
  await page.locator(".choice").first().click();
  await page.click("#designer-done");
  await page.waitForFunction(() => window.__game);
}

const setup = (page, playerX = 1050) =>
  page.evaluate((playerX) => {
    const g = window.__game;
    g.parentControl.place("pinkDad", "pinkDad", 1000);
    Object.assign(g.player, { room: "pinkDad", x: playerX, y: 0, vy: 0 });
  }, playerX);

const bubbles = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__game.talk.state)));

test("down says hello, the parent greets back and asks a question, right answers", async ({ page }) => {
  await startGame(page);
  await setup(page);
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => window.__game.talk.state.kid?.text.startsWith("Hello"));
  expect((await bubbles(page)).parents.pinkDad.text).toMatch(/Hello|Well hello/);

  await page.waitForFunction(() => window.__game.talk.state.pending);
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => !window.__game.talk.state.pending && window.__game.talk.state.kid);
  await page.waitForFunction(() => /Lovely|wonderful|proud/.test(window.__game.talk.state.parents.pinkDad?.text ?? ""));
});

test("up asks a question and the parent answers", async ({ page }) => {
  await startGame(page);
  await setup(page);
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction(() => window.__game.talk.state.kid?.text.includes("?"));
  await page.waitForFunction(() => window.__game.talk.state.parents.pinkDad);
  expect((await bubbles(page)).parents.pinkDad.text).toMatch(/!/);
});

test("the speech bubble is drawn on screen", async ({ page }) => {
  await startGame(page);
  await setup(page);
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => window.__game.talk.state.parents.pinkDad);
  await page.waitForTimeout(100);
  const white = await page.evaluate(() => {
    const d = document.getElementById("game").getContext("2d").getImageData(0, 0, 960, 540).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255) n++;
    return n;
  });
  expect(white).toBeGreaterThan(500);
});

test("nobody answers when no parent is close (unhappy path)", async ({ page }) => {
  await startGame(page);
  await setup(page, 1500);
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => window.__game.talk.state.kid);
  await page.waitForTimeout(3000);
  const state = await bubbles(page);
  expect(state.parents).toEqual({});
  expect(state.pending).toBeNull();
});

test("right without a question does not answer (unhappy path)", async ({ page }) => {
  await startGame(page);
  await setup(page);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  expect((await bubbles(page)).kid).toBeNull();
});

test("a sleeping parent only snores (unhappy path)", async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => {
    const g = window.__game;
    g.parentControl.assign("pinkDad", "sleep");
    g.parentControl.advance("pinkDad", 600);
    Object.assign(g.player, { room: "pinkDad", x: g.parents.find((p) => p.id === "pinkDad").x + 50, y: 0, vy: 0 });
  });
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => window.__game.talk.state.parents.pinkDad);
  expect((await bubbles(page)).parents.pinkDad.text).toContain("Zzz");
  await page.waitForTimeout(3500);
  expect((await bubbles(page)).pending).toBeNull();
});
