import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT_SITEMAP = 'https://www.pattern.com/sitemap.xml';
const MAX_CONCURRENCY = 12;
const outputArgument = process.argv.find((argument) => argument.startsWith('--output='));
const outputPath = outputArgument?.slice('--output='.length);

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Pattern-PVG-read-only-audit/1.0',
    },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
};

const extractLocations = (xml) =>
  [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) =>
    match[1]
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .trim(),
  );

const classify = (html) => {
  const explicitVersion = html.match(
    /<(?:html|body)\b[^>]*\bdata-pattern-version=["'](v1|v2|v2l|v3)["']/i,
  )?.[1]?.toLowerCase();
  if (explicitVersion) return explicitVersion;

  const pageMainClasses = [
    ...html.matchAll(/\bclass=["']([^"']*\bpage_main(?:_v3)?\b[^"']*)["']/gi),
  ]
    .map((match) => match[1].split(/\s+/))
    .flat();
  const classTokens = new Set(pageMainClasses);

  if (classTokens.has('page_main_v3') || classTokens.has('cc-v3')) return 'v3';
  if (classTokens.has('cc-v2l')) return 'v2l';
  if (classTokens.has('cc-v2')) return 'v2';
  if (classTokens.has('cc-v1')) return 'v1';
  if (classTokens.has('page_main')) return 'inferred-v2';
  return 'unknown';
};

const rootXml = await fetchText(ROOT_SITEMAP);
const rootLocations = extractLocations(rootXml);
const sitemapUrls = rootLocations.filter((url) => /\.xml(?:\?|$)/i.test(url));
const pageUrls = new Set(
  rootLocations.filter((url) => !/\.xml(?:\?|$)/i.test(url)),
);

for (const sitemapUrl of sitemapUrls) {
  const xml = await fetchText(sitemapUrl);
  extractLocations(xml)
    .filter((url) => !/\.xml(?:\?|$)/i.test(url))
    .forEach((url) => pageUrls.add(url));
}

const urls = [...pageUrls];
const results = new Array(urls.length);
let cursor = 0;

const worker = async () => {
  while (cursor < urls.length) {
    const index = cursor;
    cursor += 1;
    const url = urls[index];

    try {
      const response = await fetch(url, {
        headers: {
          'user-agent': 'Pattern-PVG-read-only-audit/1.0',
        },
        redirect: 'follow',
      });
      const html = await response.text();
      results[index] = {
        url,
        finalUrl: response.url,
        status: response.status,
        version: classify(html),
      };
    } catch (error) {
      results[index] = {
        url,
        finalUrl: null,
        status: null,
        version: 'error',
        error: error.message,
      };
    }
  }
};

await Promise.all(
  Array.from({ length: Math.min(MAX_CONCURRENCY, urls.length) }, worker),
);

const grouped = Object.groupBy(results, (result) => result.version);
const report = {
  auditedAt: new Date().toISOString(),
  rootSitemap: ROOT_SITEMAP,
  total: results.length,
  counts: Object.fromEntries(
    Object.entries(grouped).map(([version, rows]) => [version, rows.length]),
  ),
  routes: Object.fromEntries(
    Object.entries(grouped).map(([version, rows]) => [
      version,
      rows
        .map(({ error, finalUrl, status, url }) => ({
          url,
          finalUrl,
          status,
          ...(error ? { error } : {}),
        }))
        .sort((a, b) => a.url.localeCompare(b.url)),
    ]),
  ),
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;

if (outputPath) {
  const resolvedOutput = path.resolve(outputPath);
  await fs.mkdir(path.dirname(resolvedOutput), { recursive: true });
  await fs.writeFile(resolvedOutput, serialized, 'utf8');
  console.log(`Wrote ${results.length} routes to ${resolvedOutput}`);
} else {
  process.stdout.write(serialized);
}
