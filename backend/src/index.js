require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk").default;
const db = require("./db");
const yt = require("./youtube");

const app = express();
const PORT = process.env.PORT || 3001;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 프론트엔드 정적 파일 서빙 (CORS보다 먼저 — 같은 도메인 요청)
const path = require("path");
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// CORS 설정
app.use(cors());

app.use(express.json());

// 헬스체크
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ── 레시피 CRUD ──

app.get("/api/recipes", async (_req, res) => {
  try {
    const recipes = await db.getAllRecipes();
    res.json(recipes);
  } catch (err) {
    console.error("GET /api/recipes error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/recipes/:id", async (req, res) => {
  try {
    const recipe = await db.getRecipeById(req.params.id);
    if (!recipe) return res.status(404).json({ error: "not found" });
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/recipes", async (req, res) => {
  try {
    const recipe = await db.createRecipe(req.body);
    res.status(201).json(recipe);
  } catch (err) {
    console.error("POST /api/recipes error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/recipes/:id", async (req, res) => {
  try {
    const recipe = await db.updateRecipe(req.params.id, req.body);
    if (!recipe) return res.status(404).json({ error: "not found" });
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/recipes/:id", async (req, res) => {
  try {
    await db.deleteRecipe(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 동의어 사전 조회
app.get("/api/ingredients/synonyms", async (_req, res) => {
  try {
    const synonyms = await db.getSynonyms();
    res.json(synonyms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 재료 카테고리 캐시 조회 (Claude 호출 없음 — 서비스 페이지용)
app.get("/api/ingredients/cached-categories", async (_req, res) => {
  try {
    const allNames = await db.getAllIngredientNames();
    const cached = await db.getCachedCategories(allNames);
    res.json(cached);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 재료 카테고리 전체 조회 (재료별 등장 레시피 수 포함)
app.get("/api/ingredients/categories", async (_req, res) => {
  try {
    const recipes = await db.getAllRecipes();
    const cached = await db.getCachedCategories(
      [...new Set(recipes.flatMap((r) => (r.ingredients || []).map((i) => typeof i.name === "string" ? i.name.trim() : "")).filter(Boolean))]
    );

    // 재료별 등장 횟수
    const freq = {};
    for (const r of recipes) {
      for (const ing of r.ingredients || []) {
        const name = typeof ing.name === "string" ? ing.name.trim() : "";
        if (name) freq[name] = (freq[name] || 0) + 1;
      }
    }

    // 카테고리별 그룹
    const result = {};
    for (const [name, count] of Object.entries(freq)) {
      const cat = cached[name] || "기타";
      if (!result[cat]) result[cat] = [];
      result[cat].push({ name, count, category: cat });
    }

    // 카테고리 내 빈도순 정렬
    for (const cat of Object.keys(result)) {
      result[cat].sort((a, b) => b.count - a.count);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 재료 카테고리 일괄 업데이트
app.put("/api/ingredients/categories", async (req, res) => {
  const { updates } = req.body; // [{ name, category }, ...]
  if (!updates?.length) return res.status(400).json({ error: "updates required" });
  try {
    const map = {};
    for (const u of updates) {
      if (u.name && u.category) map[u.name] = u.category;
    }
    await db.saveCachedCategories(map);
    res.json({ ok: true, count: Object.keys(map).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 동의어 자동 감지 (Claude 기반, 후보 제안)
app.post("/api/ingredients/suggest-synonyms", async (req, res) => {
  try {
    const allNames = await db.getAllIngredientNames();
    const existingSynonyms = await db.getSynonyms();

    const prompt = `아래는 요리 재료 목록이야. 같은 재료인데 이름만 다른 것들을 찾아줘.

기존에 등록된 동의어 예시 (이 스타일을 참고해):
${Object.entries(existingSynonyms).map(([a, c]) => `"${a}" → "${c}"`).join("\n")}

규칙:
- 표기법만 다른 것: "간 마늘"="다진 마늘", "달걀"="계란"
- 공백 차이: "돈가스 소스"="돈가스소스" → 하나로 통합
- 수식어 차이: "냉동 블루베리"→"블루베리", "다진 돼지고기"→"돼지고기 다짐육" 처럼 본질이 같으면 통합
- 절대 다른 재료를 합치지 마: 삼겹살≠대패삼겹살, 참기름≠고추기름, 굵은 소금≠고운 소금
- 확신 없으면 포함하지 마
- 대표명은 더 일반적이고 짧은 이름을 사용

반드시 JSON 배열로만 응답해. 각 항목은 [별칭, 대표명] 형태.
형식: [["별칭1", "대표명1"], ["별칭2", "대표명2"], ...]
없으면 빈 배열 []

재료 목록:
${allNames.join(", ")}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const parsed = parseClaudeJson(message.content[0].text);
    // 이미 등록된 동의어 제외
    const suggestions = (Array.isArray(parsed) ? parsed : [])
      .filter(([alias, canonical]) =>
        alias && canonical && alias !== canonical && !existingSynonyms[alias]
      )
      .map(([alias, canonical]) => ({ alias, canonical }));

    console.log(`[동의어 제안] ${suggestions.length}개 후보 생성`);
    res.json({ suggestions });
  } catch (err) {
    console.error("Suggest synonyms error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 동의어 수동 추가
app.post("/api/ingredients/synonyms", async (req, res) => {
  const { mappings } = req.body; // { "alias": "canonical", ... }
  if (!mappings) return res.status(400).json({ error: "mappings required" });
  try {
    await db.saveSynonyms(mappings);
    res.json({ ok: true, count: Object.keys(mappings).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 기존 DB의 재료 정리 (잘못된 재료 제거 + 동의어 적용)
app.post("/api/ingredients/cleanup", async (_req, res) => {
  try {
    const recipes = await db.getAllRecipes();
    const synonyms = await db.getSynonyms();
    let fixed = 0;
    for (const r of recipes) {
      const cleaned = (r.ingredients || [])
        .filter((ing) => {
          const name = typeof ing.name === "string" ? ing.name.trim() : "";
          return name.length > 0 && !/^[{}\[\]()]+$/.test(name);
        })
        .map((ing) => {
          const name = typeof ing.name === "string" ? ing.name.trim() : "";
          const canonical = synonyms[name] || synonyms[name.replace(/\s+/g, "")];
          return canonical ? { ...ing, name: canonical } : ing;
        });

      const changed = JSON.stringify(cleaned) !== JSON.stringify(r.ingredients);
      if (changed) {
        await db.updateRecipe(r.id, { ...r, ingredients: cleaned });
        fixed++;
      }
    }
    res.json({ ok: true, fixed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 동의어 테이블 초기화
app.delete("/api/ingredients/synonyms", async (_req, res) => {
  try {
    await db.pool.query("DELETE FROM ingredient_synonyms");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 재료 분류 캐시 초기화
app.delete("/api/ingredients/cache", async (_req, res) => {
  try {
    await db.pool.query("DELETE FROM ingredient_categories");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/recipes", async (_req, res) => {
  try {
    await db.deleteAllRecipes();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 설명란 → Claude → 레시피 구조화 ──

const RECIPE_PROMPT = `아래는 YouTube 요리 영상의 제목과 설명란 텍스트야.
설명란에 적힌 재료/분량 정보를 기반으로 레시피를 JSON으로 구조화해줘.

중요 규칙:
1. 설명란에 재료나 분량이 명시되어 있지 않으면 반드시 skip해.
2. 재료명은 설명란에 적힌 것을 정확히 그대로 사용해. 절대로 다른 이름으로 바꾸거나 추측하지 마.
   예: 설명란에 "삼겹살"이면 "삼겹살", "대패삼겹살"이면 "대패삼겹살"로 적어.
3. 설명란에 없는 재료를 추가하지 마.

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트는 포함하지 마.
skip하는 경우: { "skip": true, "reason": "사유" }

{
  "title": "요리 이름 (한국어, 간결하게)",
  "category": "한식/중식/일식/양식/디저트/기타",
  "time": "조리 시간 (예: 30분, 설명란에 없으면 생략 가능)",
  "difficulty": "쉬움/보통/어려움",
  "ingredients": [
    { "name": "재료명 (설명란 원문 그대로)", "amount": "수량/용량" }
  ],
  "steps": [
    "조리 단계 1",
    "조리 단계 2"
  ]
}

`;

function parseClaudeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1].trim());
    throw new Error("Claude 응답을 JSON으로 파싱할 수 없습니다.");
  }
}

// 동의어 적용 (수동 등록된 것만 — 자동 감지 비활성화)
async function normalizeIngredients(ingredients) {
  if (!ingredients.length) return ingredients;

  const synonyms = await db.getSynonyms();

  return ingredients.map((ing) => {
    const name = typeof ing.name === "string" ? ing.name.trim() : "";
    const canonical = synonyms[name] || synonyms[name.replace(/\s+/g, "")];
    return canonical ? { ...ing, name: canonical } : ing;
  });
}

async function processVideo(videoId, meta) {
  // 1) 영상 정보 (설명란) 가져오기
  const info = meta?.description
    ? meta
    : await yt.getVideoInfo(videoId);

  if (!info) {
    return { videoId, status: "skip", reason: "영상 정보를 가져올 수 없음" };
  }

  // 설명란에 재료 관련 키워드가 있는지 사전 체크
  const desc = (info.description || "");
  const descLower = desc.toLowerCase();
  const hasIngredientHint = /재료|분량|준비물|재료\]|만드는\s*법|ingredients|recipe|큰술|작은술|컵|\dg\b|\dml\b|\d개|모\)/.test(descLower);

  if (!hasIngredientHint) {
    const preview = desc.slice(0, 200).replace(/\n/g, " ");
    console.log(`[SKIP:키워드] ${videoId} "${info.title}" | 설명란 미리보기: ${preview}`);
    return {
      videoId, status: "skip", reason: "설명란에 재료 정보 없음",
      title: info.title, descriptionPreview: preview,
    };
  }

  const content =
    RECIPE_PROMPT +
    `제목: ${info.title}\n\n설명란:\n${desc.slice(0, 8000)}`;

  // 2) Claude로 구조화
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content }],
  });

  const parsed = parseClaudeJson(message.content[0].text);

  if (parsed.skip) {
    console.log(`[SKIP:Claude] ${videoId} "${info.title}" | 사유: ${parsed.reason}`);
    return {
      videoId, status: "skip", reason: parsed.reason,
      title: info.title, descriptionPreview: desc.slice(0, 200).replace(/\n/g, " "),
    };
  }

  // 3) 재료명 정규화 (동의어 통합) + 유효하지 않은 재료 제거
  const rawIngredients = await normalizeIngredients(parsed.ingredients || []);
  const ingredients = rawIngredients.filter((ing) => {
    const name = typeof ing.name === "string" ? ing.name.trim() : "";
    return name.length > 0 && !/^[{}\[\]()]+$/.test(name);
  });

  // 4) DB 저장
  const recipe = await db.createRecipe({
    title: parsed.title,
    channel: info.channel || meta?.channel || "",
    category: parsed.category,
    time: parsed.time,
    difficulty: parsed.difficulty,
    youtubeId: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    ingredients,
    steps: parsed.steps || [],
  });

  return { videoId, status: "ok", recipe };
}

// ── 단건 추출: POST /api/extract ──

app.post("/api/extract", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  const videoId = yt.extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: "유효한 YouTube URL이 아닙니다." });

  try {
    // 중복 체크
    const existing = await db.findByYoutubeId(videoId);
    if (existing) return res.json({ status: "duplicate", recipe: existing });

    const info = await yt.getVideoInfo(videoId);
    const result = await processVideo(videoId, info);
    res.json(result);
  } catch (err) {
    console.error("Extract error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── 재료 카테고리 분류: POST /api/ingredients/classify ──

const CLASSIFY_PROMPT = `아래 재료 목록을 다음 카테고리 중 하나로 분류해줘.
카테고리: 육류, 해산물, 채소, 과일, 견과류, 양념/소스, 곡물/면/두부, 유제품/계란, 액체/육수, 가공식품, 기타

가공식품 예시: 미트볼, 소시지, 햄, 어묵, 라면, 초콜릿, 과자, 통조림 등 공장 제조 식품

반드시 JSON 형식으로만 응답해. 다른 텍스트 포함하지 마.
형식: { "재료명": "카테고리", ... }

재료 목록:
`;

app.post("/api/ingredients/classify", async (req, res) => {
  const { names } = req.body;
  if (!names?.length) return res.json({});

  try {
    // 1) DB 캐시 조회
    const cached = await db.getCachedCategories(names);
    const uncached = names.filter((n) => !cached[n]);

    // 모두 캐시에 있으면 바로 반환
    if (uncached.length === 0) return res.json(cached);

    // 2) 미분류 재료를 30개씩 나눠서 Claude에 요청 (응답 잘림 방지)
    const newClassified = {};
    for (let i = 0; i < uncached.length; i += 30) {
      const batch = uncached.slice(i, i + 30);
      try {
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [
            { role: "user", content: CLASSIFY_PROMPT + batch.join(", ") },
          ],
        });
        const parsed = parseClaudeJson(message.content[0].text);
        Object.assign(newClassified, parsed);
        console.log(`[분류] ${batch.length}개 재료 Claude 분류 완료`);
      } catch (batchErr) {
        console.error(`[분류] 배치 에러 (${batch.length}개):`, batchErr.message);
        // 에러난 배치는 캐시하지 않음 — 다음 요청에서 재시도
      }

      // rate limit 보호
      if (i + 30 < uncached.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // 3) "기타"가 아닌 것만 DB에 캐시 저장
    const toCache = {};
    for (const [k, v] of Object.entries(newClassified)) {
      if (v !== "기타") toCache[k] = v;
    }
    if (Object.keys(toCache).length) await db.saveCachedCategories(toCache);

    // 4) 합쳐서 반환
    res.json({ ...cached, ...newClassified });
  } catch (err) {
    console.error("Classify error:", err);
    // 에러 시에도 캐시된 것은 반환
    try {
      const cached = await db.getCachedCategories(names);
      res.json(cached);
    } catch {
      res.status(500).json({ error: err.message });
    }
  }
});

// ── 일괄 재추출: POST /api/reextract ──

app.post("/api/reextract", async (req, res) => {
  const { recipeIds } = req.body;
  if (!recipeIds?.length) return res.status(400).json({ error: "recipeIds required" });

  const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  jobs.set(jobId, {
    status: "processing",
    total: recipeIds.length,
    processed: 0,
    saved: 0,
    skipped: 0,
    current: "",
    error: null,
  });

  res.json({ jobId });

  (async () => {
    const job = jobs.get(jobId);
    try {
      for (const id of recipeIds) {
        if (job.status === "cancelled") break;
        job.processed++;

        try {
          // 기존 레시피에서 youtubeId 가져오기
          const existing = await db.getRecipeById(id);
          if (!existing?.youtubeId) {
            job.skipped++;
            job.current = `(ID없음) ${id}`;
            continue;
          }

          job.current = existing.title || existing.youtubeId;

          // 기존 레시피 삭제
          await db.deleteRecipe(id);

          // 재추출
          const result = await Promise.race([
            processVideo(existing.youtubeId, null),
            new Promise((_, reject) => setTimeout(() => reject(new Error("타임아웃")), 30000)),
          ]);

          if (result.status === "ok") {
            job.saved++;
            await new Promise((r) => setTimeout(r, 1500));
          } else {
            job.skipped++;
          }
        } catch (err) {
          job.skipped++;
          console.error(`[재추출] ${id} 에러:`, err.message);
        }
      }
      if (job.status !== "cancelled") job.status = "done";
    } catch (err) {
      job.status = "error";
      job.error = err.message;
    }
  })();
});

// ── 채널 전체 추출: 비동기 작업 + 폴링 ──

const jobs = new Map(); // jobId → { status, progress, skipLog, error }

app.post("/api/extract/channel", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  jobs.set(jobId, {
    status: "collecting", // collecting | processing | done | error | cancelled
    url,
    total: 0,
    processed: 0,
    saved: 0,
    skipped: 0,
    duplicates: 0,
    current: "영상 목록 수집 중…",
    currentStatus: "",
    skipLog: [],
    error: null,
  });

  res.json({ jobId });

  // 백그라운드에서 처리
  (async () => {
    const job = jobs.get(jobId);
    try {
      // 재생목록 URL이면 재생목록에서, 아니면 채널에서 영상 가져오기
      const playlistId = yt.extractPlaylistId(url);
      let videos;
      if (playlistId) {
        videos = await yt.getAllVideoIds(playlistId, (loaded, total) => {
          job.current = `재생목록 수집 중… ${loaded}개${total ? ` / ~${total}개` : ""}`;
        });
      } else {
        videos = await yt.getChannelVideos(url, (loaded, total) => {
          job.current = `영상 목록 수집 중… ${loaded}개${total ? ` / ~${total}개` : ""}`;
        });
      }
      job.total = videos.length;
      job.status = "processing";
      job.current = "";

      for (const video of videos) {
        if (job.status === "cancelled") {
          console.log("[채널추출] 취소됨");
          break;
        }
        job.processed++;
        try {
          const existing = await db.findByYoutubeId(video.videoId);
          if (existing) {
            job.duplicates++;
            job.current = video.title;
            job.currentStatus = "duplicate";
            continue;
          }

          job.current = video.title;
          job.currentStatus = "processing";

          const result = await Promise.race([
            processVideo(video.videoId, video),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("타임아웃 (30초 초과)")), 30000)
            ),
          ]);

          if (result.status === "skip") {
            job.skipped++;
            job.currentStatus = "skip";
            job.skipLog.push({ title: video.title, reason: result.reason || "알 수 없음" });
          } else {
            job.saved++;
            job.currentStatus = "ok";
            // Claude 호출한 경우만 딜레이
            await new Promise((r) => setTimeout(r, 1500));
          }
        } catch (err) {
          job.skipped++;
          job.currentStatus = "error";
          job.skipLog.push({ title: video.title, reason: err.message });
        }
      }

      if (job.status !== "cancelled") job.status = "done";
    } catch (err) {
      job.status = "error";
      job.error = err.message;
      console.error("[채널추출] 에러:", err.message);
    }
  })();
});

// 작업 상태 조회
app.get("/api/jobs/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "작업을 찾을 수 없습니다" });
  res.json(job);
});

// 작업 취소
app.post("/api/jobs/:jobId/cancel", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "작업을 찾을 수 없습니다" });
  job.status = "cancelled";
  res.json({ ok: true });
});

// ── SPA fallback ──

app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    return res.sendFile(path.join(publicDir, "index.html"));
  }
  next();
});

// ── 서버 시작 ──

db.migrate().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
