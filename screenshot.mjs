import { chromium } from "playwright";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = "screenshots";

fs.mkdirSync(OUT_DIR, { recursive: true });

let stepIndex = 0;
async function shot(page, name) {
  const file = `${OUT_DIR}/${String(++stepIndex).padStart(2, "0")}_${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(`✓ ${file}`);
}

// ─── helpers ──────────────────────────────────────────────────────────────────

async function waitForMessages(page, timeout = 10_000) {
  try {
    await page.waitForFunction(
      () => document.querySelectorAll("button").length > 0,
      { timeout }
    );
    // Wait for the message list to show actual messages (the "Open" button)
    await page.waitForSelector('button:has-text("Open")', { timeout });
    return true;
  } catch {
    return false;
  }
}

async function openFirstMessage(page) {
  const openBtn = page.locator('button:has-text("Open")').first();
  await openBtn.click();
  // Wait for modal backdrop to appear
  await page.waitForSelector(".fixed.inset-0", { timeout: 5_000 });
  await page.waitForTimeout(300); // let animation settle
}

async function closeModal(page) {
  // Try the footer "Fechar" button first, fallback to X icon
  const fechar = page.locator('button:has-text("Fechar")');
  if (await fechar.isVisible()) {
    await fechar.click();
  } else {
    await page.keyboard.press("Escape");
  }
  await page.waitForTimeout(200);
}

// ─── main flow ────────────────────────────────────────────────────────────────

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // ── 1. Page on first load (before API data arrives) ──────────────────────
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await shot(page, "page_initial_load");

  // ── 2. Page with data loaded ─────────────────────────────────────────────
  await page.waitForTimeout(2_000); // let polling fetch messages + logs
  await shot(page, "page_with_data");

  const hasMessages = await waitForMessages(page);

  if (!hasMessages) {
    console.log("⚠  No messages returned by the API — skipping modal states.");
    await browser.close();
    process.exit(0);
  }

  // ── 3. Modal open — Segments tab (default, all sections expanded) ─────────
  await openFirstMessage(page);
  await shot(page, "modal_segments_all_expanded");

  // ── 4. Modal — one section collapsed (click first section header) ─────────
  const sectionHeaders = page.locator(
    "button.w-full.flex.items-center.justify-between"
  );
  const firstSection = sectionHeaders.first();
  if (await firstSection.isVisible()) {
    await firstSection.click();
    await page.waitForTimeout(200);
    await shot(page, "modal_segments_first_section_collapsed");
    // Restore
    await firstSection.click();
    await page.waitForTimeout(200);
  }

  // ── 5. Modal — all sections collapsed ────────────────────────────────────
  const allSections = await sectionHeaders.all();
  for (const btn of allSections) {
    if (await btn.isVisible()) await btn.click();
  }
  await page.waitForTimeout(200);
  await shot(page, "modal_segments_all_collapsed");

  // Expand all back
  for (const btn of allSections) {
    if (await btn.isVisible()) await btn.click();
  }
  await page.waitForTimeout(200);

  // ── 6. Modal — Tree tab ───────────────────────────────────────────────────
  const treeTab = page.locator('button:has-text("Tree")');
  if (await treeTab.isVisible()) {
    await treeTab.click();
    await page.waitForTimeout(300);
    await shot(page, "modal_tree_all_expanded");

    // ── 7. Modal — Tree tab with root node collapsed ─────────────────────
    const treeNodes = page.locator("button").filter({ hasText: "∨" });
    const firstNode = treeNodes.first();
    if (await firstNode.isVisible()) {
      await firstNode.click();
      await page.waitForTimeout(200);
      await shot(page, "modal_tree_root_collapsed");
      // Restore
      const expandBtn = page.locator("button").filter({ hasText: ">" }).first();
      if (await expandBtn.isVisible()) {
        await expandBtn.click();
        await page.waitForTimeout(200);
      }
    }

    // Back to Segments tab
    await page.locator('button:has-text("Segments")').click();
    await page.waitForTimeout(200);
  }

  // ── 8. Modal — Warnings sidebar (if present) ─────────────────────────────
  const warnings = page.locator(".border-amber-200.bg-amber-50");
  if (await warnings.isVisible()) {
    await shot(page, "modal_with_warnings");
  } else {
    console.log("  (no warnings on this message — step skipped)");
  }

  // ── 9. Modal — Submit button "Enviando..." (loading state) ───────────────
  const submitBtn = page.locator('button:has-text("Submit")');
  if (await submitBtn.isVisible()) {
    // Intercept the commit network request so we can capture the loading state
    // before it resolves
    let resolveCommit;
    const commitHeld = new Promise((r) => (resolveCommit = r));

    await page.route("**/commit", async (route) => {
      await shot(page, "modal_submit_loading"); // capture before response
      resolveCommit();
      await route.continue();
    });

    await submitBtn.click();

    // Wait until we've captured the loading state (or 3s timeout)
    await Promise.race([commitHeld, page.waitForTimeout(3_000)]);
    await page.unrouteAll();

    // ── 10. Modal — after successful approval ─────────────────────────────
    try {
      // The Submit button should disappear after approval
      await page.waitForFunction(
        () => !document.querySelector('button[data-submit]'),
        { timeout: 5_000 }
      );
    } catch {
      // Fallback: just wait a moment
      await page.waitForTimeout(1_500);
    }
    await shot(page, "modal_after_approval");
  } else {
    console.log("  (message already approved or no Submit button — steps 9-10 skipped)");
  }

  // ── 11. Page after closing modal — approved badge + new log ──────────────
  await closeModal(page);
  await page.waitForTimeout(500);
  await shot(page, "page_after_approval");

  // ── 12. Log panel scrolled to bottom ─────────────────────────────────────
  const logPanel = page.locator(".overflow-y-auto").last();
  if (await logPanel.isVisible()) {
    await logPanel.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(200);
    await shot(page, "log_panel_scrolled_bottom");
  }

  await browser.close();
  console.log(`\nDone — ${stepIndex} screenshots saved to ./${OUT_DIR}/`);
})();
