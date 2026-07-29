import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const cssRoot = join(packageRoot, "css");

async function listCssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listCssFiles(path));
    } else if (entry.name.endsWith(".css")) {
      files.push(path);
    }
  }

  return files.sort();
}

function contentType(path) {
  return {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8"
  }[extname(path)] || "application/octet-stream";
}

function testDocument(markup, beforeLoader = "") {
  return `<!doctype html>
    <body>
      ${markup}
      ${beforeLoader}
      <script src="/js/loader.js"></script>
    </body>`;
}

const routeDocuments = {
  "/v1": testDocument('<main data-pattern-version="v1"></main>'),
  "/v2": testDocument('<main data-pattern-version="v2"></main>'),
  "/v1-multiple": testDocument(
    '<main data-pattern-version="v1"></main>',
    '<div data-pattern-version="v1"></div>'
  ),
  "/no-marker": testDocument("<main></main>"),
  "/invalid": testDocument('<main data-pattern-version="v3"></main>'),
  "/conflict": testDocument(
    '<main data-pattern-version="v2"></main>',
    '<div data-pattern-version="v1"></div>'
  ),
  "/duplicate-shared": testDocument(
    '<main data-pattern-version="v1"></main>',
    '<script src="/js/shared.js"></script>'
  )
};

const server = createServer(async (request, response) => {
  try {
    if (routeDocuments[request.url]) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(routeDocuments[request.url]);
      return;
    }

    const relativePath = decodeURIComponent(request.url || "/").replace(/^\/+/, "");
    const filePath = join(packageRoot, relativePath);
    const content = await readFile(filePath);
    response.writeHead(200, { "content-type": contentType(filePath) });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });

try {
  const cssFiles = await listCssFiles(cssRoot);
  const cssResults = [];

  for (const path of cssFiles) {
    const page = await browser.newPage();
    await page.setContent("<!doctype html><body></body>");
    await page.addStyleTag({ content: await readFile(path, "utf8") });
    const rules = await page.evaluate(() =>
      Array.from(document.styleSheets).reduce(
        (total, sheet) => total + sheet.cssRules.length,
        0
      )
    );
    cssResults.push({
      path: path.replace(`${packageRoot}/`, ""),
      rules
    });
    await page.close();
  }

  const behaviorPage = await browser.newPage();
  await behaviorPage.setContent(`<!doctype html>
    <body>
      <main id="root">
        <div id="wrapper" data-wf--content-wrapper--variant="center-alignment">
          <p id="child">Test</p>
        </div>
      </main>
    </body>`);
  await behaviorPage.addStyleTag({
    content: await readFile(join(cssRoot, "shared.css"), "utf8")
  });
  await behaviorPage.addStyleTag({
    content: await readFile(join(cssRoot, "v1.css"), "utf8")
  });
  await behaviorPage.addStyleTag({
    content: await readFile(join(cssRoot, "v2.css"), "utf8")
  });

  async function markerBehavior(version) {
    return behaviorPage.evaluate((marker) => {
      const root = document.querySelector("#root");
      root.setAttribute("data-pattern-version", marker);
      const bodyStyle = getComputedStyle(document.body);
      const wrapperStyle = getComputedStyle(document.querySelector("#wrapper"));
      const childStyle = getComputedStyle(document.querySelector("#child"));
      return {
        columns: bodyStyle.getPropertyValue("--site--column-count").trim(),
        sharedGridAlias: bodyStyle.getPropertyValue("--grid-12").trim(),
        v1TypeAlias: bodyStyle.getPropertyValue("--d1--font-size").trim(),
        wrapperTextAlign: wrapperStyle.textAlign,
        wrapperJustifyItems: wrapperStyle.justifyItems,
        childTextAlign: childStyle.textAlign
      };
    }, version);
  }

  const markerV1 = await markerBehavior("v1");
  const markerV2 = await markerBehavior("v2");
  await behaviorPage.close();

  async function loaderState(path) {
    const page = await browser.newPage();
    await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
    const state = await page.evaluate(() => window.__patternVersionSplit || null);
    await page.close();
    return state;
  }

  const [
    loaderV1,
    loaderV2,
    loaderMultiple,
    loaderInactive,
    loaderInvalid,
    loaderConflict,
    loaderDuplicate
  ] = await Promise.all([
    loaderState("/v1"),
    loaderState("/v2"),
    loaderState("/v1-multiple"),
    loaderState("/no-marker"),
    loaderState("/invalid"),
    loaderState("/conflict"),
    loaderState("/duplicate-shared")
  ]);

  const [
    sharedComponent,
    v1Component,
    v2Component,
    loaderSource,
    externalAssetsSource
  ] =
    await Promise.all([
      readFile(join(packageRoot, "components/shared.html"), "utf8"),
      readFile(join(packageRoot, "components/v1.html"), "utf8"),
      readFile(join(packageRoot, "components/v2.html"), "utf8"),
      readFile(join(packageRoot, "js/loader.js"), "utf8"),
      readFile(join(packageRoot, "external-assets.json"), "utf8")
    ]);
  const externalAssets = JSON.parse(externalAssetsSource);
  const ctaInject = externalAssets.features.find(
    ({ id }) => id === "cta-inject"
  );

  const checks = [
    {
      check: "All CSS files parsed",
      passed: cssResults.length === 18 && cssResults.every(({ rules }) => rules > 0)
    },
    {
      check: "Shared container variables activate on both versions",
      passed: markerV1.columns === "12" && markerV2.columns === "12"
    },
    {
      check: "Shared grid aliases activate on both versions",
      passed:
        markerV1.sharedGridAlias === "repeat(12, minmax(0, 1fr))" &&
        markerV2.sharedGridAlias === "repeat(12, minmax(0, 1fr))"
    },
    {
      check: "V1-only type aliases activate only on V1",
      passed:
        markerV1.v1TypeAlias.includes("clamp(") &&
        markerV2.v1TypeAlias === ""
    },
    {
      check: "V2 alignment activates only on V2",
      passed:
        markerV2.wrapperTextAlign === "center" &&
        markerV2.wrapperJustifyItems === "center" &&
        markerV2.childTextAlign === "center" &&
        markerV1.wrapperTextAlign === "start" &&
        markerV1.childTextAlign === "start"
    },
    {
      check: "V1 marker loads Shared and V1 runtimes without a pilot marker",
      passed:
        loaderV1?.phase === 5 &&
        loaderV1?.release === "0.5.1" &&
        loaderV1?.status === "ready" &&
        loaderV1?.version === "v1" &&
        loaderV1.loaded.includes("shared-runtime") &&
        loaderV1.loaded.includes("v1-runtime") &&
        loaderV1.failed.length === 0
    },
    {
      check: "V2 marker loads Shared and V2 runtimes without a pilot marker",
      passed:
        loaderV2?.phase === 5 &&
        loaderV2?.release === "0.5.1" &&
        loaderV2?.status === "ready" &&
        loaderV2?.version === "v2" &&
        loaderV2.loaded.includes("shared-runtime") &&
        loaderV2.loaded.includes("v2-runtime") &&
        loaderV2.failed.length === 0
    },
    {
      check: "Repeated matching markers resolve to one version",
      passed:
        loaderMultiple?.status === "ready" &&
        loaderMultiple?.version === "v1" &&
        loaderMultiple?.markerCount === 2
    },
    {
      check: "Loader stays inactive without a version marker",
      passed: loaderInactive === null
    },
    {
      check: "Invalid and conflicting markers fail closed",
      passed:
        loaderInvalid?.status === "blocked" &&
        loaderInvalid?.reason === "invalid-version-marker" &&
        loaderConflict?.status === "blocked" &&
        loaderConflict?.reason === "conflicting-version-markers"
    },
    {
      check: "Duplicate Shared runtime is skipped",
      passed:
        loaderDuplicate?.status === "ready" &&
        loaderDuplicate?.skipped.includes("shared-runtime") &&
        loaderDuplicate?.loaded.includes("v1-runtime")
    },
    {
      check: "Designer components reference the immutable 0.5.1 release",
      passed:
        sharedComponent.includes("@uk-version-split-v0.5.1/") &&
        v1Component.includes("@uk-version-split-v0.5.1/") &&
        v2Component.includes("@uk-version-split-v0.5.1/")
    },
    {
      check: "Permanent loader contains no Phase 4 pilot gate",
      passed:
        loaderSource.includes('querySelectorAll("[data-pattern-version]")') &&
        !loaderSource.includes("data-pattern-asset-pilot")
    },
    {
      check: "CTA injection loads only when both Finsweet injection markers exist",
      passed:
        JSON.stringify(ctaInject?.requiredSelectors) === JSON.stringify([
          '[fs-inject-element="target"]',
          '[fs-inject-element="element"]'
        ]) &&
        !ctaInject?.selector &&
        loaderSource.includes("feature.requiredSelectors.every") &&
        !loaderSource.includes("\"selector\": \"[data-cta-inject], [class*='cta']\"")
    }
  ];

  const result = {
    cssFiles: cssResults.length,
    cssRules: cssResults.reduce((total, file) => total + file.rules, 0),
    markerV1,
    markerV2,
    loaderV1,
    loaderV2,
    loaderMultiple,
    loaderInactive,
    loaderInvalid,
    loaderConflict,
    loaderDuplicate,
    checks,
    failures: checks.filter(({ passed }) => !passed).length
  };

  console.log(JSON.stringify(result, null, 2));
  if (result.failures > 0) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
