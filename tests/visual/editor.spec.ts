import { test, expect, type Page } from "@playwright/test";
const open = async (page: Page, name: string) => {
  await page.goto(`/workspace/${name}?view=split`);
  await expect(page.locator(".diagram-output svg")).toBeVisible();
};
const node = (page: Page, id: string) =>
  page.locator(`[data-overlay-node="${id}"]`);
const center = async (locator: ReturnType<typeof node>) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Element bounds unavailable");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};
test("automatic split view renders its flowchart", async ({ page }) => {
  await open(page, "visual-auto-v3");
  expect(await page.locator(".preview").screenshot()).toMatchSnapshot(
    "automatic-preview.png",
  );
});
test("manual dimensions and precision inspector", async ({ page }) => {
  await open(page, "visual-manual-v3");
  await node(page, "idea").click();
  await page.getByLabel("Node X").fill("425");
  await page.getByLabel("Node Y").fill("220");
  await page.getByLabel("Node width").fill("120");
  await page.getByLabel("Node height").fill("64");
  await expect(page.getByLabel("Node width")).toHaveValue("120");
  await expect(node(page, "idea")).toHaveAttribute("width", "120");
  await expect(node(page, "idea")).toHaveAttribute("height", "64");
  await page.locator(".inspector .panel-title").click();
  expect(await page.locator(".workspace-shell").screenshot()).toMatchSnapshot(
    "manual-inspector.png",
  );
});
test("preview-only view minimizes chrome", async ({ page }) => {
  await page.goto("/workspace/visual-preview-v3?view=preview");
  await expect(page.locator(".editor")).toHaveCount(0);
  await expect(page.locator(".diagram-output svg")).toBeVisible();
  expect(await page.locator(".workspace-shell").screenshot()).toMatchSnapshot(
    "preview-only.png",
  );
});
test("modifier click selects multiple nodes and alignment updates geometry", async ({
  page,
}) => {
  await open(page, "multi-align");
  await node(page, "idea").click();
  await node(page, "build").click({ modifiers: ["Control"] });
  await expect(page.locator(".node-hit.selected")).toHaveCount(2);
  await page.getByLabel("Align nodes").selectOption("left");
  await expect
    .poll(async () =>
      page
        .locator(".node-hit.selected")
        .evaluateAll((items) =>
          items.map((item) => Number(item.getAttribute("x"))),
        ),
    )
    .toEqual([24, 24]);
});
test("marquee selects intersecting nodes", async ({ page }) => {
  await open(page, "marquee");
  const first = await node(page, "idea").boundingBox();
  const second = await node(page, "build").boundingBox();
  if (!first || !second) throw new Error("Node bounds unavailable");
  await page.mouse.move(first.x - 4, Math.min(first.y, second.y) - 4);
  await page.mouse.down();
  await page.mouse.move(
    second.x + second.width + 4,
    Math.max(first.y + first.height, second.y + second.height) + 4,
  );
  await page.mouse.up();
  await expect(page.locator(".node-hit.selected")).toHaveCount(2);
});
test("workspace undo and redo restore precision edits", async ({ page }) => {
  await open(page, "undo-redo");
  await node(page, "idea").click();
  const original = await page.getByLabel("Node X").inputValue();
  await page.getByLabel("Node X").fill("400");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByLabel("Node X")).toHaveValue(original);
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByLabel("Node X")).toHaveValue("400");
});
test("edge selection exposes routing and draggable waypoint controls", async ({
  page,
}) => {
  await open(page, "edge-waypoint");
  const edge = page.locator("[data-overlay-edge]").first();
  await edge.click({ force: true });
  await expect(page.getByLabel("Source anchor")).toBeVisible();
  await page.getByLabel("Source anchor").selectOption("east");
  await page.getByRole("button", { name: "Add Waypoint" }).click();
  const waypoint = page.locator("[data-waypoint]").first();
  await expect(waypoint).toBeVisible();
  const before = await waypoint.getAttribute("cx");
  const bounds = await waypoint.boundingBox();
  if (!bounds) throw new Error("Waypoint bounds unavailable");
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 20,
    bounds.y + bounds.height / 2 + 12,
  );
  await page.mouse.up();
  await expect(waypoint).not.toHaveAttribute("cx", before ?? "");
});
test("cancelled waypoint drag remains one undoable transaction", async ({
  page,
}) => {
  await open(page, "waypoint-cancel");
  await page.locator("[data-overlay-edge]").first().click({ force: true });
  await page.getByRole("button", { name: "Add Waypoint" }).click();
  const waypoint = page.locator("[data-waypoint]").first();
  const original = Number(await waypoint.getAttribute("cx"));
  const point = await center(waypoint);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 25, point.y + 10);
  await page
    .locator(".canvas")
    .dispatchEvent("pointercancel", {
      pointerId: 1,
      clientX: point.x + 25,
      clientY: point.y + 10,
    });
  await page.mouse.up();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect
    .poll(async () => Number(await waypoint.getAttribute("cx")))
    .toBeCloseTo(original, 1);
});
test("long node and group drags remain stable across expanded bounds", async ({
  page,
}) => {
  await open(page, "stable-drag");
  await page.getByLabel("Set zoom to 100%").click();
  await node(page, "idea").click();
  const original = Number(await page.getByLabel("Node X").inputValue());
  const start = await center(node(page, "idea"));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 220, start.y, { steps: 4 });
  await page.waitForTimeout(150);
  await page.mouse.move(start.x + 360, start.y, { steps: 4 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await page.getByLabel("Node X").inputValue()))
    .toBeCloseTo(original + 360, 0);
  await open(page, "stable-group");
  await page.getByLabel("Set zoom to 100%").click();
  await node(page, "idea").click();
  await node(page, "build").click({ modifiers: ["Control"] });
  await expect(page.locator(".node-hit.selected")).toHaveCount(2);
  const groupOriginal = Number(await node(page, "idea").getAttribute("x"));
  const groupStart = await center(node(page, "idea"));
  await page.mouse.move(groupStart.x, groupStart.y);
  await page.mouse.down();
  await page.mouse.move(groupStart.x + 220, groupStart.y, { steps: 4 });
  await page.waitForTimeout(150);
  await page.mouse.move(groupStart.x + 360, groupStart.y, { steps: 4 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await node(page, "idea").getAttribute("x")))
    .toBeCloseTo(groupOriginal + 360, 0);
});
test("cancelled and lost-capture gestures finish independent transactions", async ({
  page,
}) => {
  await open(page, "gesture-finalize");
  await page.getByLabel("Set zoom to 100%").click();
  await node(page, "idea").click();
  const original = Number(await page.getByLabel("Node X").inputValue());
  let point = await center(node(page, "idea"));
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 30, point.y);
  await page
    .locator(".canvas")
    .dispatchEvent("pointercancel", {
      pointerId: 1,
      clientX: point.x + 30,
      clientY: point.y,
    });
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
  point = await center(node(page, "idea"));
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 40, point.y);
  await page.mouse.up();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect
    .poll(async () => Number(await page.getByLabel("Node X").inputValue()))
    .toBeCloseTo(original + 30, 0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect
    .poll(async () => Number(await page.getByLabel("Node X").inputValue()))
    .toBeCloseTo(original, 0);
  const noOp = await center(node(page, "idea"));
  await page.mouse.move(noOp.x, noOp.y);
  await page.mouse.down();
  await page
    .locator(".canvas")
    .dispatchEvent("lostpointercapture", { pointerId: 1 });
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
});
test("large hierarchy auto-fits and shares one aligned display surface", async ({
  page,
}) => {
  await open(page, "large-hierarchy");
  await page.getByLabel("Diagram source").fill(`flowchart TD
svrcmbdoc22fs[svrcmbdoc22fs]
svrcmbdoc22fs --> nbci_files{nbci_files$}
svrcmbdoc22fs --> wci_files{wci_files$}
nbci_files --> all_departments[All Departments]
all_departments --> business_office[Business Office]
nbci_files --> administration[Administration]
nbci_files --> change_sheets[Change Sheets]
nbci_files --> custody[Custody]
nbci_files --> support_staff{Support Staff}
custody --> case_management[Case Management]
custody --> chaplain[Chaplain]
custody --> case_management_2[Case Management]`);
  await expect(node(page, "business_office")).toBeVisible();
  const canvas = await page.locator(".canvas").boundingBox();
  const diagram = await page.locator(".diagram").boundingBox();
  if (!canvas || !diagram) throw new Error("Canvas bounds unavailable");
  expect(diagram.width).toBeLessThanOrEqual(canvas.width);
  expect(diagram.height).toBeLessThanOrEqual(canvas.height);
  await node(page, "business_office").click();
  const rendered = await page
    .locator('[data-node-id="business_office"]')
    .boundingBox();
  const overlay = await node(page, "business_office").boundingBox();
  if (!rendered || !overlay) throw new Error("Node bounds unavailable");
  expect(Math.abs(rendered.x - overlay.x)).toBeLessThan(1);
  expect(Math.abs(rendered.y - overlay.y)).toBeLessThan(1);
  await page.getByLabel("Set zoom to 100%").click();
  await expect(page.locator(".zoom-tools output")).toHaveText("100%");
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await page.setViewportSize({ width: 1100, height: 760 });
  await expect
    .poll(
      async () => (await page.locator(".diagram").boundingBox())?.width ?? 0,
    )
    .toBeLessThanOrEqual(
      (await page.locator(".canvas").boundingBox())?.width ?? 0,
    );
  for (let index = 0; index < 60; index += 1)
    await page.getByLabel("Zoom in").click();
  await expect(page.locator(".zoom-tools output")).toHaveText("800%");
});
test("direct resize handles update geometry as one undoable transaction", async ({
  page,
}) => {
  await open(page, "direct-resize");
  await page.getByLabel("Set zoom to 100%").click();
  await node(page, "idea").click();
  await expect(page.locator("[data-resize-handle]")).toHaveCount(8);
  const width = Number(await page.getByLabel("Node width").inputValue());
  const height = Number(await page.getByLabel("Node height").inputValue());
  const handle = page.getByLabel("Resize se");
  const point = await center(handle);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 40, point.y + 30, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByLabel("Node width")).toHaveValue(String(width + 40));
  await expect(page.getByLabel("Node height")).toHaveValue(String(height + 30));
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByLabel("Node width")).toHaveValue(String(width));
  await expect(page.getByLabel("Node height")).toHaveValue(String(height));
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByLabel("Node width")).toHaveValue(String(width + 40));
});
test("multi-selection shows union bounds and keeps the group intact", async ({
  page,
}) => {
  await open(page, "selection-bounds-v4");
  await node(page, "idea").click();
  await node(page, "build").click({ modifiers: ["Control"] });
  await expect(page.locator("[data-selection-bounds]")).toBeVisible();
  const before = await node(page, "idea").getAttribute("x");
  const start = await center(node(page, "idea"));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 30, start.y + 20);
  await page.mouse.up();
  await expect(node(page, "idea")).not.toHaveAttribute("x", before ?? "");
  await expect(page.locator("[data-selection-bounds]")).toBeVisible();
});
test("object snapping displays a temporary guide", async ({ page }) => {
  await open(page, "smart-guide-v4");
  await page.getByLabel("Set zoom to 100%").click();
  await node(page, "idea").click();
  const start = await center(node(page, "idea"));
  const target = await center(node(page, "build"));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x - 2, start.y);
  await expect(page.locator("[data-alignment-guide]")).not.toHaveCount(0);
  await page.mouse.up();
  await expect(page.locator("[data-alignment-guide]")).toHaveCount(0);
});
test("double-clicking an edge segment inserts a projected waypoint", async ({
  page,
}) => {
  await open(page, "direct-edge-insert-v4");
  const edge = page.locator("[data-overlay-edge]").first();
  const point = await edge.evaluate((element) => {
    const polyline = element as SVGPolylineElement;
    const first = polyline.points.getItem(0);
    const second = polyline.points.getItem(1);
    const screen = new DOMPoint(
      (first.x + second.x) / 2,
      (first.y + second.y) / 2,
    ).matrixTransform(polyline.getScreenCTM()!);
    return { x: screen.x, y: screen.y };
  });
  await page.mouse.dblclick(point.x, point.y);
  await expect(page.locator("[data-waypoint]")).toHaveCount(1);
  await expect(page.getByLabel("Edge routing")).toHaveValue("manual");
});
test("Fit Selection centers an off-center node without changing workspace revision", async ({
  page,
}) => {
  await open(page, "fit-selection-v4");
  await node(page, "idea").click();
  await page.getByLabel("Node X").fill("-1500");
  await page.getByLabel("Node Y").fill("-900");
  await expect
    .poll(async () => Number(await node(page, "idea").getAttribute("x")))
    .toBeCloseTo(-1570, 0);
  const revision = await page.locator("footer .good").textContent();
  await page.getByLabel("Fit selection").click();
  const canvas = await page.locator(".canvas").boundingBox();
  const selected = await node(page, "idea").boundingBox();
  if (!canvas || !selected) throw new Error("Fit bounds unavailable");
  expect(
    Math.abs(selected.x + selected.width / 2 - (canvas.x + canvas.width / 2)),
  ).toBeLessThan(2);
  expect(
    Math.abs(selected.y + selected.height / 2 - (canvas.y + canvas.height / 2)),
  ).toBeLessThan(2);
  await expect(page.locator("footer .good")).toHaveText(revision ?? "");
});
test("resize handles remain available at minimum and maximum zoom", async ({
  page,
}) => {
  await open(page, "resize-zoom-v4");
  await node(page, "idea").click();
  for (let index = 0; index < 60; index += 1)
    await page.getByLabel("Zoom out").click();
  await expect(page.locator(".zoom-tools output")).toHaveText("20%");
  await expect(page.getByLabel("Resize e")).toBeVisible();
  for (let index = 0; index < 60; index += 1)
    await page.getByLabel("Zoom in").click();
  await expect(page.locator(".zoom-tools output")).toHaveText("800%");
  await expect(page.getByLabel("Resize e")).toBeVisible();
});
test("dragging directly over rendered labels moves nodes without native selection", async ({
  page,
}) => {
  await open(page, "label-drag-v4");
  await page.getByLabel("Set zoom to 100%").click();
  const dragLabel = async (id: string, dx: number) => {
    const label = page.locator(`[data-node-id="${id}"] text`);
    const point = await center(label);
    const before = Number(await node(page, id).getAttribute("x"));
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + dx, point.y + 12, { steps: 4 });
    await page.mouse.up();
    await expect
      .poll(async () => Number(await node(page, id).getAttribute("x")))
      .toBeCloseTo(before + dx, 0);
    await expect
      .poll(() =>
        page.evaluate(() => ({
          text: window.getSelection()?.toString() ?? "",
          ranges: window.getSelection()?.rangeCount ?? 0,
        })),
      )
      .toEqual({ text: "", ranges: 0 });
  };
  await dragLabel("idea", 35);
  await page.getByRole("button", { name: "Undo" }).click();
  await dragLabel("build", 30);
});
test("stale selection is cleared after switching between SCULPT windows", async ({
  page,
  context,
}) => {
  await open(page, "multi-window-selection-v4");
  await page.getByLabel("Set zoom to 100%").click();
  const label = page.locator('[data-node-id="idea"] text');
  await label.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await expect
    .poll(() => page.evaluate(() => window.getSelection()?.rangeCount ?? 0))
    .toBe(1);
  const second = await context.newPage();
  await second.goto("/workspace/multi-window-selection-v4?view=preview");
  await second.locator(".diagram-output svg").waitFor();
  await second.bringToFront();
  await page.bringToFront();
  const point = await center(label);
  const before = Number(await node(page, "idea").getAttribute("x"));
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 40, point.y, { steps: 4 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await node(page, "idea").getAttribute("x")))
    .toBeCloseTo(before + 40, 0);
  await expect
    .poll(() =>
      page.evaluate(() => ({
        text: window.getSelection()?.toString() ?? "",
        ranges: window.getSelection()?.rangeCount ?? 0,
      })),
    )
    .toEqual({ text: "", ranges: 0 });
  await second.close();
});
test("source text remains selectable while editable canvas blocks selectstart and dragstart", async ({
  page,
}) => {
  await open(page, "selection-scope-v4");
  const source = page.getByLabel("Diagram source");
  await source.focus();
  await source.press("Control+A");
  await expect
    .poll(() =>
      source.evaluate((element) => {
        const textarea = element as HTMLTextAreaElement;
        return (
          textarea.selectionStart === 0 &&
          textarea.selectionEnd === textarea.value.length
        );
      }),
    )
    .toBe(true);
  await expect(page.locator(".canvas")).toHaveClass(/editable/);
  const prevented = await page.locator(".canvas").evaluate((canvas) => {
    const select = new Event("selectstart", {
      bubbles: true,
      cancelable: true,
    });
    const drag = new Event("dragstart", { bubbles: true, cancelable: true });
    canvas.dispatchEvent(select);
    canvas.dispatchEvent(drag);
    return { select: select.defaultPrevented, drag: drag.defaultPrevented };
  });
  expect(prevented).toEqual({ select: true, drag: true });
});
test("direct insertion requires an actual editable edge hit", async ({
  page,
}) => {
  await open(page, "edge-hit-required-v4");
  const edge = page.locator("[data-overlay-edge]").first();
  await edge.click({ force: true });
  await expect(page.locator("[data-waypoint]")).toHaveCount(0);
  await page.locator(".canvas").dblclick({ position: { x: 20, y: 20 } });
  await expect(page.locator("[data-waypoint]")).toHaveCount(0);
  await edge.click({ force: true });
  await node(page, "idea").dblclick({ force: true });
  await expect(page.locator("[data-waypoint]")).toHaveCount(0);
  await expect(page.locator(".node-hit.selected")).toHaveCount(1);
});
test("locked members stay fixed while selected movable members share one snapped translation", async ({
  page,
}) => {
  await open(page, "locked-group-snap-v4");
  await page.getByLabel("Set zoom to 100%").click();
  await node(page, "idea").click();
  await page.getByLabel("Lock position").check();
  await node(page, "build").click({ modifiers: ["Control"] });
  await node(page, "review").click({ modifiers: ["Control"] });
  const before = await Promise.all(
    ["idea", "build", "review"].map(async (id) =>
      Number(await node(page, id).getAttribute("x")),
    ),
  );
  const point = await center(node(page, "build"));
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 45, point.y + 18, { steps: 4 });
  await page.mouse.up();
  const after = await Promise.all(
    ["idea", "build", "review"].map(async (id) =>
      Number(await node(page, id).getAttribute("x")),
    ),
  );
  expect(after[0]).toBe(before[0]);
  expect(after[1]! - before[1]!).toBeCloseTo(after[2]! - before[2]!, 6);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect
    .poll(async () => Number(await node(page, "build").getAttribute("x")))
    .toBeCloseTo(before[1]!, 6);
});
test("an entirely locked selection starts no movement transaction", async ({
  page,
}) => {
  await open(page, "all-locked-group-v4");
  for (const id of ["idea", "build"]) {
    await node(page, id).click();
    await page.getByLabel("Lock position").check();
  }
  await node(page, "idea").click();
  await node(page, "build").click({ modifiers: ["Control"] });
  const before = Number(await node(page, "idea").getAttribute("x"));
  const point = await center(node(page, "idea"));
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 60, point.y);
  await page.mouse.up();
  expect(Number(await node(page, "idea").getAttribute("x"))).toBe(before);
  await page.getByRole("button", { name: "Undo" }).click();
  await node(page, "build").click();
  await expect(page.getByLabel("Lock position")).not.toBeChecked();
});
test("resizing an auto-positioned locked node preserves its center through undo and redo", async ({
  page,
}) => {
  await open(page, "locked-resize-review-v4");
  await page.getByLabel("Set zoom to 100%").click();
  await node(page, "idea").click();
  const originalX = await page.getByLabel("Node X").inputValue();
  const originalY = await page.getByLabel("Node Y").inputValue();
  const originalWidth = Number(
    await page.getByLabel("Node width").inputValue(),
  );
  await page.getByLabel("Lock position").check();
  const handle = page.getByLabel("Resize e");
  const point = await center(handle);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 20, point.y);
  await page.mouse.up();
  await expect(page.getByLabel("Node X")).toHaveValue(originalX);
  await expect(page.getByLabel("Node Y")).toHaveValue(originalY);
  await expect(page.getByLabel("Node width")).toHaveValue(
    String(originalWidth + 20),
  );
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByLabel("Node X")).toHaveValue(originalX);
  await expect(page.getByLabel("Node Y")).toHaveValue(originalY);
  await expect(page.getByLabel("Node width")).toHaveValue(
    String(originalWidth),
  );
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByLabel("Node X")).toHaveValue(originalX);
  await expect(page.getByLabel("Node Y")).toHaveValue(originalY);
  await expect(page.getByLabel("Node width")).toHaveValue(
    String(originalWidth + 20),
  );
});
test("raw pointer jitter does not move or resize nodes before the gesture threshold", async ({
  page,
}) => {
  await open(page, "gesture-threshold-review-v4");
  await page.getByLabel("Set zoom to 100%").click();
  await node(page, "idea").click();
  const originalX = Number(await page.getByLabel("Node X").inputValue());
  let point = await center(node(page, "idea"));
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 0.5, point.y + 0.5);
  await expect(page.getByLabel("Node X")).toHaveValue(String(originalX));
  await expect(page.locator("[data-alignment-guide]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  await page.mouse.move(point.x + 20, point.y);
  await page.mouse.up();
  await expect
    .poll(async () => Number(await page.getByLabel("Node X").inputValue()))
    .not.toBe(originalX);
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
  await open(page, "resize-threshold-review-v4");
  await page.getByLabel("Set zoom to 100%").click();
  await node(page, "idea").click();
  const originalWidth = Number(
    await page.getByLabel("Node width").inputValue(),
  );
  point = await center(page.getByLabel("Resize e"));
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 0.5, point.y);
  await expect(page.getByLabel("Node width")).toHaveValue(
    String(originalWidth),
  );
  await expect(page.locator("[data-alignment-guide]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  await page.mouse.move(point.x + 20, point.y);
  await page.mouse.up();
  await expect
    .poll(async () => Number(await page.getByLabel("Node width").inputValue()))
    .toBeGreaterThan(originalWidth);
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
});
test("locked over-contracted resize snaps from its clamped edge and guide matches geometry", async ({
  page,
}) => {
  await open(page, "clamped-resize-review-v4");
  await page.getByLabel("Set zoom to 100%").click();
  await node(page, "idea").click();
  await page.getByLabel("Node X").fill("300");
  await page.getByLabel("Node width").fill("100");
  await expect
    .poll(async () => Number(await node(page, "idea").getAttribute("width")))
    .toBe(100);
  await page.getByLabel("Lock position").check();
  await node(page, "build").click();
  const targetWidth = Number(await page.getByLabel("Node width").inputValue());
  await page.getByLabel("Node X").fill(String(322 + targetWidth / 2));
  await expect
    .poll(async () => Number(await node(page, "build").getAttribute("x")))
    .toBeCloseTo(322, 6);
  await node(page, "idea").click();
  const originalX = await page.getByLabel("Node X").inputValue();
  const point = await center(page.getByLabel("Resize e"));
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x - 200, point.y);
  const guide = page.locator('[data-alignment-guide="x"]');
  await expect(guide).toHaveCount(1);
  await expect(page.getByLabel("Node width")).toHaveValue("44");
  await expect
    .poll(async () => Number(await node(page, "idea").getAttribute("width")))
    .toBe(44);
  const guideX = Number(await guide.getAttribute("x1"));
  const renderedRight =
    Number(await node(page, "idea").getAttribute("x")) +
    Number(await node(page, "idea").getAttribute("width"));
  expect(guideX).toBeCloseTo(renderedRight, 6);
  expect(guideX).toBeCloseTo(322, 6);
  await expect(page.getByLabel("Node X")).toHaveValue(originalX);
  await page.mouse.up();
});
test("Canvas owns continuous light and dark backgrounds while diagram SVG stays transparent", async ({
  page,
}) => {
  await open(page, "transparent-canvas-v4");
  const styles = async () =>
    page.evaluate(() => {
      const app = getComputedStyle(document.querySelector(".app")!);
      const canvas = getComputedStyle(document.querySelector(".canvas")!);
      const svg = getComputedStyle(
        document.querySelector(".diagram-output svg")!,
      );
      return {
        appBackground: app.backgroundColor,
        canvasBackground: canvas.backgroundColor,
        grid: canvas.backgroundImage,
        svgBackground: svg.backgroundColor,
        shadow: svg.boxShadow,
        radius: svg.borderRadius,
      };
    });
  let current = await styles();
  const initialBackground = current.appBackground;
  expect(current.canvasBackground).toBe(initialBackground);
  expect(current.grid).toContain("radial-gradient");
  expect(current.svgBackground).toBe("rgba(0, 0, 0, 0)");
  expect(current.shadow).toBe("none");
  expect(current.radius).toBe("0px");
  await page.getByRole("button", { name: /mode/ }).click();
  current = await styles();
  expect(current.appBackground).not.toBe(initialBackground);
  expect(current.canvasBackground).toBe(current.appBackground);
  expect(current.svgBackground).toBe("rgba(0, 0, 0, 0)");
  await node(page, "idea").click();
  const rendered = await page.locator('[data-node-id="idea"]').boundingBox();
  const overlay = await node(page, "idea").boundingBox();
  if (!rendered || !overlay) throw new Error("Node bounds unavailable");
  expect(Math.abs(rendered.x - overlay.x)).toBeLessThan(1);
  expect(Math.abs(rendered.y - overlay.y)).toBeLessThan(1);
  for (const view of ["preview", "presentation"]) {
    await page.goto(`/workspace/transparent-canvas-v4?view=${view}`);
    await expect(page.locator(".canvas")).toBeVisible();
    await expect(page.locator(".diagram-output svg")).toBeVisible();
    expect((await styles()).svgBackground).toBe("rgba(0, 0, 0, 0)");
  }
});
test("editable Canvas restores keyboard focus after node and waypoint clicks", async ({
  page,
}) => {
  await open(page, "canvas-focus-v4");
  const source = page.getByLabel("Diagram source");
  await source.focus();
  const originalSource = await source.inputValue();
  await node(page, "idea").click();
  await expect
    .poll(() =>
      page.evaluate(() => document.activeElement?.classList.contains("canvas")),
    )
    .toBe(true);
  const originalX = Number(await page.getByLabel("Node X").inputValue());
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => Number(await page.getByLabel("Node X").inputValue()))
    .toBe(originalX + 1);
  await expect(source).toHaveValue(originalSource);
  const xInput = page.getByLabel("Node X");
  await xInput.focus();
  const originalY = Number(await page.getByLabel("Node Y").inputValue());
  await node(page, "idea").click();
  await page.keyboard.press("ArrowDown");
  await expect
    .poll(async () => Number(await page.getByLabel("Node Y").inputValue()))
    .toBe(originalY + 1);
  await page.locator("[data-overlay-edge]").first().click({ force: true });
  await page.getByRole("button", { name: "Add Waypoint" }).click();
  await source.focus();
  await page.locator("[data-waypoint]").first().click();
  await expect
    .poll(() =>
      page.evaluate(() => document.activeElement?.classList.contains("canvas")),
    )
    .toBe(true);
  await page.keyboard.press("Delete");
  await expect(page.locator("[data-waypoint]")).toHaveCount(0);
});
test("Canvas controls retain normal focus instead of transferring it to the Canvas", async ({
  page,
}) => {
  await open(page, "canvas-control-focus-v4");
  const zoom = page.getByLabel("Zoom in");
  await zoom.click();
  await expect
    .poll(() =>
      page.evaluate(() => document.activeElement?.getAttribute("aria-label")),
    )
    .toBe("Zoom in");
  const snap = page.getByLabel("Snap to objects");
  await snap.click();
  await expect
    .poll(() =>
      page.evaluate(() => document.activeElement?.getAttribute("aria-label")),
    )
    .toBe("Snap to objects");
});
test("visible grid lattice follows diagram coordinates through pan zoom Fit and Fit Selection", async ({
  page,
}) => {
  await open(page, "grid-coordinate-v4");
  const alignment = async () =>
    page.evaluate(() => {
      const canvas = document.querySelector<HTMLElement>(".canvas")!;
      const svg = document.querySelector<SVGSVGElement>(".diagram-output svg")!;
      const style = getComputedStyle(canvas);
      const box = canvas.getBoundingClientRect();
      const origin = new DOMPoint(0, 0).matrixTransform(svg.getScreenCTM()!);
      return {
        expectedX:
          box.left +
          box.width / 2 +
          Number.parseFloat(style.getPropertyValue("--grid-offset-x")),
        expectedY:
          box.top +
          box.height / 2 +
          Number.parseFloat(style.getPropertyValue("--grid-offset-y")),
        originX: origin.x,
        originY: origin.y,
        size: Number.parseFloat(style.getPropertyValue("--grid")),
      };
    });
  await page.getByLabel("Set zoom to 100%").click();
  let value = await alignment();
  expect(value.originX).toBeCloseTo(value.expectedX, 4);
  expect(value.originY).toBeCloseTo(value.expectedY, 4);
  expect(value.size).toBe(20);
  const canvas = await page.locator(".canvas").boundingBox();
  if (!canvas) throw new Error("Canvas bounds unavailable");
  const before = value;
  await page.keyboard.down("Alt");
  await page.mouse.move(canvas.x + 20, canvas.y + 20);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 57, canvas.y + 43);
  await page.mouse.up();
  await page.keyboard.up("Alt");
  value = await alignment();
  expect(value.originX - before.originX).toBeCloseTo(37, 5);
  expect(value.originY - before.originY).toBeCloseTo(23, 5);
  expect(value.expectedX - before.expectedX).toBeCloseTo(37, 5);
  await page.getByLabel("Set zoom to 100%").click();
  await page.getByLabel("Zoom in").click();
  value = await alignment();
  expect(value.size).toBeCloseTo(23, 5);
  expect(value.originX).toBeCloseTo(value.expectedX, 4);
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  value = await alignment();
  expect(value.originX).toBeCloseTo(value.expectedX, 4);
  await node(page, "idea").click();
  await page.getByLabel("Node X").fill("-1500");
  await page.getByLabel("Fit selection").click();
  value = await alignment();
  expect(value.originX).toBeCloseTo(value.expectedX, 4);
  expect(value.originY).toBeCloseTo(value.expectedY, 4);
});
test('locked selection primary uses a deterministic movable group grid reference', async ({ page }) => {
  await open(page, 'locked-primary-grid-v4');
  await page.getByLabel('Set zoom to 100%').click();
  await page.getByLabel('Snap to objects').uncheck();
  await page.getByText('Snap to grid', { exact: true }).click();
  await node(page, 'idea').click();
  await page.getByLabel('Lock position').check();
  await node(page, 'build').click({ modifiers: ['Control'] });
  await node(page, 'review').click({ modifiers: ['Control'] });
  const before = await Promise.all(['idea', 'build', 'review'].map(async (id) => Number(await node(page, id).getAttribute('x'))));
  const start = await center(node(page, 'idea'));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 13, start.y + 7);
  await page.mouse.up();
  const after = await Promise.all(['idea', 'build', 'review'].map(async (id) => Number(await node(page, id).getAttribute('x'))));
  expect(after[0]).toBe(before[0]);
  expect(after[1]! - before[1]!).toBeCloseTo(after[2]! - before[2]!, 6);
  await node(page, 'build').click();
  const buildCenter = Number(await page.getByLabel('Node X').inputValue());
  expect(Math.abs(buildCenter % 20)).toBeLessThan(.001);
});
