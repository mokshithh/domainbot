import { load as cheerioLoad } from "cheerio";
import crypto from "crypto";

export interface CrawledPage {
  url: string;
  title: string;
  cleanedText: string;
  rawHtml: string;
  contentHash: string;
}

export interface CrawlProgress {
  pagesFound: number;
  pagesCrawled: number;
  pageFailed: number;
  currentUrl: string;
  status: "crawling" | "done" | "error";
}

const SKIP_EXTENSIONS = /\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|pdf|zip|woff|woff2|ttf|eot|mp4|mp3|xml|json)(\?.*)?$/i;
const MAX_PAGES = 100;
const FETCH_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    u.search = ""; // strip query strings to deduplicate
    return u.toString().replace(/\/$/, "");
  } catch {
    return raw;
  }
}

function isSameDomain(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerioLoad(html);
  const links: string[] = [];
  const base = new URL(baseUrl);

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    let abs: string;
    try {
      abs = new URL(href, base).toString();
    } catch {
      return;
    }

    if (SKIP_EXTENSIONS.test(abs)) return;
    if (!abs.startsWith("http")) return;
    links.push(normalizeUrl(abs));
  });

  return [...new Set(links)];
}

function extractText(html: string): { title: string; text: string } {
  const $ = cheerioLoad(html);

  // Remove all noise elements
  $(
    [
      "script", "style", "noscript", "nav", "footer", "header", "aside",
      "[aria-hidden='true']", ".cookie-banner", "#cookie-banner",
      "[role='banner']", "[role='navigation']", "[role='complementary']",
      ".sidebar", "#sidebar", ".advertisement", ".ad", ".ads",
      "iframe", "[class*='cookie']", "[id*='cookie']",
      "[class*='popup']", "[class*='modal']", "[class*='overlay']",
    ].join(", ")
  ).remove();

  const title = $("title").text().trim() || $("h1").first().text().trim() || "";

  // Get readable text — prefer main content areas if present
  const mainContent = $("main, [role='main'], article, .content, #content, .main").first();
  const textSource = mainContent.length > 0 ? mainContent : $("body");

  const text = textSource
    .text()
    .replace(/\t/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, text };
}

async function fetchPage(url: string, retries = 0): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "DomainBot/1.0 (+https://domainbot.app; bot crawler)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    return await response.text();
  } catch {
    if (retries < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 500 * (retries + 1)));
      return fetchPage(url, retries + 1);
    }
    return null;
  }
}

async function trySitemap(domain: string): Promise<string[]> {
  const candidates = [
    `${domain}/sitemap.xml`,
    `${domain}/sitemap_index.xml`,
    `${domain}/sitemap/sitemap.xml`,
    `${domain}/sitemap/index.xml`,
  ];

  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "DomainBot/1.0 crawler" },
      });
      clearTimeout(timer);

      if (!res.ok) continue;
      const text = await res.text();

      // Extract <loc> tags (handles both sitemap and sitemap index)
      const locs = [...text.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) =>
        m[1].trim()
      );

      const pages = locs.filter(
        (l) =>
          l.startsWith("http") &&
          !SKIP_EXTENSIONS.test(l) &&
          isSameDomain(l, new URL(domain).origin)
      );

      if (pages.length > 0) return pages.slice(0, MAX_PAGES);
    } catch {
      // continue to next candidate
    }
  }

  return [];
}

export async function crawlDomain(
  rawDomain: string,
  onProgress?: (progress: CrawlProgress) => void
): Promise<CrawledPage[]> {
  // Normalize the domain into a full origin URL
  let origin = rawDomain.trim();
  if (!origin.startsWith("http")) origin = "https://" + origin;
  try {
    origin = new URL(origin).origin; // strips path/query
  } catch {
    throw new Error(`Invalid domain: ${rawDomain}`);
  }

  const visited = new Set<string>();
  const queue: string[] = [];
  const results: CrawledPage[] = [];
  let pageFailed = 0;

  // 1. Try sitemap first
  const sitemapUrls = await trySitemap(origin);
  if (sitemapUrls.length > 0) {
    queue.push(...sitemapUrls.map(normalizeUrl));
  } else {
    queue.push(origin);
  }

  onProgress?.({
    pagesFound: queue.length,
    pagesCrawled: 0,
    pageFailed: 0,
    currentUrl: queue[0] ?? origin,
    status: "crawling",
  });

  while (queue.length > 0 && results.length < MAX_PAGES) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    if (!isSameDomain(url, origin)) continue;
    if (SKIP_EXTENSIONS.test(url)) continue;

    onProgress?.({
      pagesFound: visited.size + queue.length,
      pagesCrawled: results.length,
      pageFailed,
      currentUrl: url,
      status: "crawling",
    });

    const html = await fetchPage(url);
    if (!html) {
      pageFailed++;
      continue;
    }

    const { title, text } = extractText(html);
    if (text.length < 100) continue; // skip near-empty pages

    const contentHash = crypto
      .createHash("md5")
      .update(text)
      .digest("hex");

    // Check for duplicate content
    const isDupe = results.some((r) => r.contentHash === contentHash);
    if (!isDupe) {
      results.push({ url, title, cleanedText: text, rawHtml: html, contentHash });
    }

    // Discover more links (BFS when no sitemap)
    if (sitemapUrls.length === 0) {
      const links = extractLinks(html, url);
      for (const link of links) {
        if (!visited.has(link) && !queue.includes(link)) {
          queue.push(link);
        }
      }
    }
  }

  return results;
}
