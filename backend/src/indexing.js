/**
 * Google Indexing API 자동 색인 스케줄러
 * 매일 새벽 3시(KST)에 200개씩 색인 요청
 */

const { google } = require("googleapis");
const https = require("https");

const SITEMAP_URL = "https://cookable.today/sitemap.xml";
const BATCH_SIZE = 200;
const DELAY_MS = 300;

// 배치 상태 (메모리 — 서버 재시작 시 0부터 다시 시작, 어차피 재요청해도 무해)
let nextBatch = 0;

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (!raw) {
    console.log("[indexing] GOOGLE_SERVICE_ACCOUNT 환경변수 없음 — 스킵");
    return null;
  }
  const credentials = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });
}

function fetchSitemapUrls() {
  return new Promise((resolve, reject) => {
    https.get(SITEMAP_URL, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const urls = [];
        const regex = /<loc>([^<]+)<\/loc>/g;
        let match;
        while ((match = regex.exec(data))) urls.push(match[1]);
        resolve(urls);
      });
      res.on("error", reject);
    });
  });
}

async function runBatch() {
  const auth = getAuth();
  if (!auth) return;

  try {
    const allUrls = await fetchSitemapUrls();
    const totalBatches = Math.ceil(allUrls.length / BATCH_SIZE);

    if (nextBatch >= totalBatches) {
      console.log(`[indexing] 모든 배치 완료 — 초기화`);
      nextBatch = 0;
    }

    const start = nextBatch * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, allUrls.length);
    const urls = allUrls.slice(start, end);

    console.log(`[indexing] 배치 ${nextBatch + 1}/${totalBatches} 시작 (URL ${start + 1}~${end})`);

    const client = await auth.getClient();
    let success = 0;
    let fail = 0;

    for (let i = 0; i < urls.length; i++) {
      try {
        await client.request({
          url: "https://indexing.googleapis.com/v3/urlNotifications:publish",
          method: "POST",
          data: { url: urls[i], type: "URL_UPDATED" },
        });
        success++;
      } catch (err) {
        fail++;
        if (fail <= 3) console.error(`[indexing] ❌ ${urls[i]}: ${err.message}`);
      }
      if (i < urls.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    console.log(`[indexing] 배치 ${nextBatch + 1}/${totalBatches} 완료: 성공 ${success}, 실패 ${fail}`);
    nextBatch++;
  } catch (err) {
    console.error(`[indexing] 에러:`, err.message);
  }
}

function msUntilKST(hour) {
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const target = new Date(kst);
  target.setHours(hour, 0, 0, 0);
  if (target <= kst) target.setDate(target.getDate() + 1);
  return target.getTime() - kst.getTime();
}

function scheduleDaily() {
  const ms = msUntilKST(3);
  const hours = Math.round(ms / 3600000);
  console.log(`[indexing] 다음 실행: ${hours}시간 후 (KST 03:00)`);

  setTimeout(() => {
    runBatch();
    // 이후 24시간마다 반복
    setInterval(runBatch, 24 * 60 * 60 * 1000);
  }, ms);
}

module.exports = { scheduleDaily, runBatch };
