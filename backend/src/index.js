require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk").default;

const app = express();
const PORT = process.env.PORT || 3001;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// CORS 설정
const allowedOrigins = [
  "http://localhost:5173",
  process.env.ALLOWED_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);

app.use(express.json());

// 헬스체크
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// YouTube URL → 레시피 추출
app.post("/api/extract", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "url is required" });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `다음 YouTube 요리 영상 URL을 분석해서 레시피 정보를 JSON으로 추출해줘.

URL: ${url}

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트는 포함하지 마.

{
  "title": "요리 이름",
  "channel": "채널명",
  "category": "한식/중식/일식/양식/디저트/기타",
  "time": "조리 시간 (예: 30분)",
  "difficulty": "쉬움/보통/어려움",
  "ingredients": [
    { "name": "재료명", "amount": "수량/용량" }
  ],
  "steps": [
    "조리 단계 1",
    "조리 단계 2"
  ]
}`,
        },
      ],
    });

    const text = message.content[0].text;

    // JSON 파싱 시도
    let recipe;
    try {
      recipe = JSON.parse(text);
    } catch {
      // JSON 블록이 코드펜스 안에 있을 수 있음
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        recipe = JSON.parse(match[1].trim());
      } else {
        throw new Error("Claude 응답을 JSON으로 파싱할 수 없습니다.");
      }
    }

    res.json(recipe);
  } catch (err) {
    console.error("Extract error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
