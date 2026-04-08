/**
 * Google Indexing API 일괄 색인 요청 스크립트
 * 사용법: node scripts/submit-indexing.js
 *   - 자동으로 마지막 배치 번호를 추적하여 다음 배치 실행
 *   - 하루 200개씩 전송 (API 일일 한도)
 */

const { google } = require("googleapis");
const https = require("https");
const fs = require("fs");
const path = require("path");

const KEY_FILE = path.join(__dirname, "..", "secrets", "cookable-492713-a675861e595f.json");
const STATE_FILE = path.join(__dirname, "..", "secrets", "indexing-state.json");
const SITEMAP_URL = "https://cookable.today/sitemap.xml";
const BATCH_SIZE = 200;
const DELAY_MS = 300;

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { nextBatch: 0 };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function fetchSitemapUrls() {
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

async function main() {
  const state = loadState();
  const batchNum = state.nextBatch;

  console.log(`📥 사이트맵에서 URL 가져오는 중...`);
  const allUrls = await fetchSitemapUrls();
  console.log(`총 ${allUrls.length}개 URL 발견`);

  const totalBatches = Math.ceil(allUrls.length / BATCH_SIZE);
  console.log(`총 ${totalBatches}개 배치 (배치당 ${BATCH_SIZE}개)`);

  if (batchNum >= totalBatches) {
    console.log(`✅ 모든 배치 완료! 배치 카운터를 초기화합니다.`);
    saveState({ nextBatch: 0 });
    return;
  }

  const start = batchNum * BATCH_SIZE;
  const end = Math.min(start + BATCH_SIZE, allUrls.length);
  const urls = allUrls.slice(start, end);

  console.log(`\n🚀 배치 ${batchNum + 1}/${totalBatches} 실행 (URL ${start + 1}~${end})`);

  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });
  const client = await auth.getClient();

  let success = 0;
  let fail = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      await client.request({
        url: "https://indexing.googleapis.com/v3/urlNotifications:publish",
        method: "POST",
        data: { url, type: "URL_UPDATED" },
      });
      success++;
      if ((i + 1) % 50 === 0) {
        console.log(`  진행: ${i + 1}/${urls.length} (성공: ${success}, 실패: ${fail})`);
      }
    } catch (err) {
      fail++;
      console.error(`  ❌ ${url}: ${err.message}`);
    }
    if (i < urls.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  // 상태 저장
  saveState({ nextBatch: batchNum + 1, lastRun: new Date().toISOString(), lastResult: { success, fail } });

  console.log(`\n📊 배치 ${batchNum + 1}/${totalBatches} 결과: 성공 ${success}, 실패 ${fail}`);
  if (batchNum + 1 < totalBatches) {
    console.log(`⏭️  남은 배치: ${totalBatches - batchNum - 1}개 (내일 자동 실행)`);
  } else {
    console.log(`🎉 모든 URL 색인 요청 완료!`);
  }
}

main().catch(console.error);
