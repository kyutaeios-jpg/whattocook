/**
 * SEO 색인 전략
 * 1. IndexNow — Bing, Naver, Yandex에 새 URL 즉시 알림
 * 2. Google sitemap ping — sitemap 변경 알림
 * 3. RSS 피드 — /rss.xml 엔드포인트
 */

const https = require("https");
const crypto = require("crypto");

const SITE_URL = "https://cookable.today";
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

// IndexNow API 키 (서버 시작 시 생성, /.well-known/에서 검증용으로 서빙)
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || crypto.randomUUID().replace(/-/g, "");

const INDEXNOW_ENGINES = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
];

// ── IndexNow: 개별 URL 알림 ──

async function notifyNewUrl(url) {
  const body = JSON.stringify({
    host: "cookable.today",
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: [url],
  });

  const results = [];
  for (const engine of INDEXNOW_ENGINES) {
    try {
      const result = await httpPost(engine, body);
      results.push({ engine, status: result });
      console.log(`[seo] IndexNow ${engine}: ${result}`);
    } catch (err) {
      results.push({ engine, error: err.message });
      console.error(`[seo] IndexNow ${engine} 실패:`, err.message);
    }
  }
  return results;
}

// ── IndexNow: 배치 URL 알림 ──

async function notifyUrls(urls) {
  if (!urls.length) return [];

  const body = JSON.stringify({
    host: "cookable.today",
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls.slice(0, 10000), // IndexNow 최대 10,000개
  });

  const results = [];
  for (const engine of INDEXNOW_ENGINES) {
    try {
      const result = await httpPost(engine, body);
      results.push({ engine, status: result, count: urls.length });
      console.log(`[seo] IndexNow batch ${engine}: ${result} (${urls.length}개)`);
    } catch (err) {
      results.push({ engine, error: err.message });
    }
  }
  return results;
}

// ── Google/Bing sitemap ping ──

async function pingSitemap() {
  const targets = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
  ];

  const results = [];
  for (const url of targets) {
    try {
      const status = await httpGet(url);
      results.push({ url, status });
      console.log(`[seo] Sitemap ping ${url}: ${status}`);
    } catch (err) {
      results.push({ url, error: err.message });
      console.error(`[seo] Sitemap ping 실패:`, err.message);
    }
  }
  return { pinged: results };
}

// ── RSS 피드 생성 ──

function generateRss(recipes) {
  const items = recipes.slice(0, 50).map((r) => {
    const slug = toSlug(r.title);
    const link = `${SITE_URL}/recipe/${r.id}/${slug}`;
    const pubDate = r.createdAt ? new Date(r.createdAt).toUTCString() : new Date().toUTCString();
    const ingredients = (r.ingredients || [])
      .map((i) => typeof i.name === "string" ? i.name : "")
      .filter(Boolean)
      .join(", ");

    return `    <item>
      <title><![CDATA[${r.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${r.channel}의 ${r.title} 레시피. 재료: ${ingredients}]]></description>
      <category>${r.category || "기타"}</category>
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>뭐해먹지? - 레시피 피드</title>
    <link>${SITE_URL}</link>
    <description>냉장고 속 재료로 만들 수 있는 유튜브 요리 레시피</description>
    <language>ko</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.join("\n")}
  </channel>
</rss>`;
}

// ── 한글 slug (index.js와 동일 로직) ──

function toSlug(title) {
  return (title || "")
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 80) || "recipe";
}

// ── HTTP 헬퍼 ──

function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      res.resume();
      resolve(res.statusCode);
    }).on("error", reject);
  });
}

// ── 초기화 ──

function init() {
  console.log(`[seo] IndexNow key: ${INDEXNOW_KEY}`);
  console.log(`[seo] 키 검증 URL: ${SITE_URL}/${INDEXNOW_KEY}.txt`);
}

module.exports = {
  INDEXNOW_KEY,
  notifyNewUrl,
  notifyUrls,
  pingSitemap,
  generateRss,
  init,
};
