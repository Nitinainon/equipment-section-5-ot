import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the OT calendar shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Equipment Section 5 - OT<\/title>/i);
  assert.match(html, /Equipment Section 5 - OT/);
  assert.match(html, /ลง OT/);
  assert.match(html, /ค้นหาชื่อสมาชิก/);
  assert.match(html, /สรุปประจำเดือน/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("removes disposable starter preview references", async () => {
  const appFiles = await readdir(new URL("../app/", import.meta.url));
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");

  if (appFiles.includes("_sites-preview")) {
    const previewFiles = await readdir(new URL("../app/_sites-preview/", import.meta.url));
    assert.equal(previewFiles.length, 0);
  }

  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
