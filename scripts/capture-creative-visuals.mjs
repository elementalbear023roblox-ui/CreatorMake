import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:4173";
const outputDirectory = path.resolve(process.argv[3] ?? "test-results/creative-visuals");
const demonstrations = [
  ["demo-retro-game-show", "Demo · 90s Game Show"],
  ["demo-modern-roblox", "Demo · Modern Adventure"],
  ["demo-futuristic", "Demo · Orbital Command"],
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];

for (const [id, name] of demonstrations) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseUrl}${baseUrl.includes("?") ? "&" : "?"}visual=${id}-${Date.now()}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Insert Add objects and assets$/ }).click();
  await page.getByRole("button", { name: "Design kits", exact: true }).click();
  const card = page.locator(".design-kit-card").filter({ hasText: name });
  await card.getByRole("button", { name: /^Insert (interface|component)$/ }).click();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Preview project" }).click();
  await page.locator(".preview-canvas").waitFor();
  await page.waitForTimeout(350);
  const file = path.join(outputDirectory, `${id}.png`);
  await page.screenshot({ path: file, fullPage: false });
  results.push({ id, name, file, objects: await page.locator(".canvas-element").count(), errors });
  await context.close();
}

await browser.close();
console.log(JSON.stringify({ baseUrl, outputDirectory, results }, null, 2));
