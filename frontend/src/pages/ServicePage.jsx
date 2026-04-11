import { useState, useEffect, useMemo, useCallback } from "react";
import {
  computeMatch,
  computeSimilarity,
  getAllIngredients,
  getAllCategories,
} from "../lib/recipes";
import { fetchRecipes, fetchCachedCategories, fetchSynonyms, toSlug } from "../lib/api";

/* ───── 카테고리 이모지 ───── */
const EMOJI = {
  한식: "🍚", 중식: "🥟", 일식: "🍣", 양식: "🍝", 디저트: "🍰", 기타: "🍽️",
};

function getYoutubeId(recipe) {
  if (recipe.youtubeId) return recipe.youtubeId;
  if (!recipe.url) return "";
  try {
    const u = new URL(recipe.url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    return u.searchParams.get("v") || "";
  } catch { return ""; }
}

/* ───── 컴포넌트 ───── */

function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "10px 18px", borderRadius: 22,
      border: active ? "2px solid var(--accent)" : "1.5px solid var(--border-light)",
      background: active ? "var(--accent-bg)" : "var(--bg-card)",
      color: active ? "var(--accent)" : "var(--text)",
      fontSize: 15, fontWeight: active ? 600 : 400,
      cursor: "pointer", whiteSpace: "nowrap",
      boxShadow: active ? "0 2px 8px rgba(249,115,22,.15)" : "0 1px 3px rgba(0,0,0,.04)",
      transition: "all .15s",
    }}>
      {label}
    </button>
  );
}

function Pill({ text, variant = "default" }) {
  const s = {
    matched: { background: "var(--green-bg)", color: "var(--green)" },
    missing: { background: "var(--red-bg)", color: "var(--red)" },
    default: { background: "var(--bg-input)", color: "var(--text-muted)" },
  };
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 13, ...s[variant] }}>
      {text}
    </span>
  );
}

function MatchBar({ score }) {
  const pct = Math.round(score * 100);
  return (
    <div style={{ height: 5, borderRadius: 3, background: "var(--bg-input)", overflow: "hidden", margin: "8px 0" }}>
      <div style={{
        width: `${pct}%`, height: "100%", borderRadius: 3,
        background: pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--accent)" : "var(--red)",
        transition: "width .3s",
      }} />
    </div>
  );
}

function YoutubeEmbed({ videoId, title }) {
  if (!videoId) return null;
  return (
    <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 12, overflow: "hidden", background: "#000" }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
      />
    </div>
  );
}

/* ───── 쇼핑 링크 ───── */

const COUPANG_LPTAG = "AF8567820";

function shopUrl(name, shop) {
  const q = encodeURIComponent(name);
  if (shop === "naver") return `https://shopping.naver.com/ns/search?query=${q}&searchMethod=direct`;
  return `https://www.coupang.com/np/search?q=${q}&lptag=${COUPANG_LPTAG}&pageType=SEARCH&pageValue=${q}`;
}

const CoupangLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#E31837"/>
    <path d="M6 12a6 6 0 1112 0 6 6 0 01-12 0zm6-3.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" fill="#fff"/>
  </svg>
);
const NaverLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#03C75A"/>
    <path d="M7 7h3.2l3.6 5.2V7H17v10h-3.2L10.2 11.8V17H7V7z" fill="#fff"/>
  </svg>
);

function ShoppingLinks({ items }) {
  const [shop, setShop] = useState("coupang");
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}>부족한 재료 구매</h4>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { key: "coupang", label: "쿠팡", Logo: CoupangLogo },
            { key: "naver", label: "네이버", Logo: NaverLogo },
          ].map(({ key, label, Logo }) => (
            <button key={key} onClick={() => setShop(key)} style={{
              padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: shop === key ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
              background: shop === key ? "var(--accent-bg)" : "transparent",
              color: shop === key ? "var(--accent)" : "var(--text-muted)",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <Logo /> {label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((name) => (
          <a key={name} href={shopUrl(name, shop)} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: "var(--bg-input)", color: "var(--accent)", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>
            {shop === "coupang" ? <CoupangLogo /> : <NaverLogo />} {name} 검색
          </a>
        ))}
      </div>
    </div>
  );
}

/* ───── 선택된 재료 태그 (접기/펼치기) ───── */

function SelectedTags({ selected, toggle, clearAll }) {
  const [expanded, setExpanded] = useState(false);
  const items = [...selected];

  return (
    <div style={{ padding: "8px 20px 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 15, color: "var(--accent)", fontWeight: 700 }}>
          내 재료 {items.length}개
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {items.length > 6 && (
            <button onClick={() => setExpanded((v) => !v)} style={{
              background: "none", border: "none", color: "var(--text-muted)",
              fontSize: 12, cursor: "pointer",
            }}>
              {expanded ? "접기 ▲" : "펼치기 ▼"}
            </button>
          )}
          <button onClick={clearAll} style={{
            background: "none", border: "none", color: "var(--text-muted)",
            fontSize: 12, cursor: "pointer", textDecoration: "underline",
          }}>
            모두 해제
          </button>
        </div>
      </div>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 5,
        maxHeight: expanded ? "none" : 64, overflow: "hidden",
        position: "relative",
      }}>
        {items.map((name) => (
          <span key={name} onClick={() => toggle(name)} style={{
            padding: "4px 10px", borderRadius: 14,
            background: "var(--accent)", color: "#fff",
            fontSize: 12, cursor: "pointer", fontWeight: 500,
            display: "inline-flex", alignItems: "center", gap: 3,
          }}>
            {name} <span style={{ fontSize: 10, opacity: 0.7 }}>✕</span>
          </span>
        ))}
        {!expanded && items.length > 6 && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 24,
            background: "linear-gradient(transparent, var(--bg))",
          }} />
        )}
      </div>
    </div>
  );
}

/* ───── 공유 버튼 ───── */

function ShareButton({ recipe, style = {} }) {
  const [copied, setCopied] = useState(false);
  const url = `https://cookable.today/recipe/${recipe.id}/${toSlug(recipe.title)}`;
  const text = `${recipe.title} - 뭐해먹지?`;

  const handleShare = async (e) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleShare} style={{
      background: "var(--bg-input)", border: "none", borderRadius: 8,
      padding: "8px 14px", cursor: "pointer",
      display: "flex", alignItems: "center", gap: 6,
      color: copied ? "var(--green)" : "var(--text-muted)",
      fontSize: 14, fontWeight: 500,
      ...style,
    }}>
      {copied ? "✓ 복사됨" : "🔗 공유"}
    </button>
  );
}

/* ───── 레시피 카드 ───── */

function RecipeCard({ recipe, match, onClick, selected, selectedCount }) {
  const pct = Math.round(match.score * 100);
  const emoji = EMOJI[recipe.category] || EMOJI["기타"];
  const totalIng = recipe.ingredients?.length || 0;
  const hasSelection = selectedCount > 0;

  return (
    <div onClick={onClick} style={{
      background: "var(--bg-card)", border: selected ? "2px solid var(--accent)" : "1.5px solid var(--border)",
      borderRadius: 14, padding: "14px 16px", cursor: "pointer",
      boxShadow: selected ? "0 4px 12px rgba(249,115,22,.12)" : "0 1px 4px rgba(0,0,0,.04)",
      transition: "all .15s",
    }}>
      {/* 상단: 이모지 + 제목 + 채널 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: hasSelection ? 10 : 0 }}>
        <span style={{ fontSize: 26, flexShrink: 0 }}>{emoji}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-bright)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {recipe.title}
          </h3>
          <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
            {recipe.channel} · {recipe.difficulty}
          </span>
        </div>
      </div>

      {/* 하단: 재료 매칭 정보 (재료 선택 시만) */}
      {hasSelection && (
        <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
          {/* 재료 준비율 */}
          <div style={{
            flex: 1, background: "var(--bg-input)", borderRadius: 10, padding: "8px 12px",
            display: "flex", flexDirection: "column", justifyContent: "center",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>재료 준비율</span>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 18, fontWeight: 700,
                color: pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--accent)" : "var(--red)",
              }}>
                {pct}%
              </span>
            </div>
            <MatchBar score={match.score} />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {match.matched.length}/{totalIng}개 보유
            </span>
          </div>

          {/* 내 재료 일치 */}
          <div style={{
            width: 80, background: match.matchedCount === selectedCount ? "var(--green-bg)" : "var(--accent-bg)",
            borderRadius: 10, padding: "8px 10px",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700,
              color: match.matchedCount === selectedCount ? "var(--green)" : "var(--accent)",
            }}>
              {match.matchedCount}/{selectedCount}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>내 재료</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── 상세 패널 ───── */

function DetailPanel({ recipe, match, onClose }) {
  if (!recipe) return null;
  const emoji = EMOJI[recipe.category] || EMOJI["기타"];
  const ytId = getYoutubeId(recipe);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,.3)", zIndex: 99 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(440px, 100vw)", background: "var(--bg)", zIndex: 100,
        borderLeft: "1px solid var(--border)", overflowY: "auto",
        display: "flex", flexDirection: "column",
      }}>
        {/* 상단 고정 헤더 */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 20px", borderBottom: "1px solid var(--border)",
          background: "var(--bg-card)", position: "sticky", top: 0, zIndex: 1,
        }}>
          <ShareButton recipe={recipe} />
          <button onClick={onClose} style={{
            background: "var(--bg-input)", border: "none", borderRadius: 8,
            width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)", fontSize: 18, cursor: "pointer",
          }}>
            ✕
          </button>
        </div>

        {/* 콘텐츠 */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <span style={{ fontSize: 40 }}>{emoji}</span>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-bright)", marginTop: 8 }}>
              {recipe.title}
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
              {recipe.channel} · {recipe.difficulty}
            </p>
          </div>

          <YoutubeEmbed videoId={ytId} title={recipe.title} />

          {/* 재료 (분량 포함) */}
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>재료</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {(recipe.ingredients || []).map((ing, i) => {
                const name = typeof ing.name === "string" ? ing.name : "";
                const amount = typeof ing.amount === "string" ? ing.amount : "";
                if (!name.trim()) return null;
                const isMatched = match.matched.some((m) => m === name.trim().replace(/\s+/g, "").toLowerCase() || name.toLowerCase().replace(/\s+/g, "").includes(m));
                return (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 14px", borderRadius: 10,
                    background: isMatched ? "var(--green-bg)" : "var(--red-bg)",
                  }}>
                    <span style={{ fontSize: 15, color: "var(--text-bright)", fontWeight: 500 }}>
                      {isMatched ? "✓ " : "✗ "}{name}
                    </span>
                    <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{amount}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 조리 순서 */}
          {recipe.steps?.length > 0 && (
            <div>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>조리 순서</h4>
              <ol style={{ paddingLeft: 22, display: "flex", flexDirection: "column", gap: 8, margin: 0 }}>
                {recipe.steps.map((step, i) => (
                  <li key={i} style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.6 }}>
                    {typeof step === "string" ? step : ""}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {match.missing.length > 0 && <ShoppingLinks items={match.missing} />}
        </div>
      </div>
    </>
  );
}

/* ───── 비교 패널 ───── */

function ComparePanel({ r1, r2, onClose }) {
  const sim = computeSimilarity(r1, r2);
  const pct = Math.round(sim.jaccard * 100);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,.3)", zIndex: 99 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(440px, 100vw)", background: "var(--bg)", zIndex: 100,
        borderLeft: "1px solid var(--border)", overflowY: "auto",
        padding: "24px 20px", display: "flex", flexDirection: "column", gap: 18,
      }}>
        <button onClick={onClose} style={{ alignSelf: "flex-end", background: "none", border: "none", color: "var(--text-muted)", fontSize: 24, cursor: "pointer" }}>
          ✕
        </button>

        <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-bright)" }}>레시피 비교</h3>

        <div style={{ textAlign: "center", padding: 20, background: "var(--bg-card)", borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 40, fontWeight: 700, color: "var(--accent)" }}>{pct}%</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Jaccard 유사도</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 600, color: "var(--text-bright)" }}>
          <span>{EMOJI[r1.category] || ""} {r1.title}</span>
          <span style={{ color: "var(--text-muted)" }}>vs</span>
          <span>{EMOJI[r2.category] || ""} {r2.title}</span>
        </div>

        {sim.shared.length > 0 && (
          <div>
            <h4 style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 8 }}>공통 재료 ({sim.shared.length})</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {sim.shared.map((n) => <Pill key={n} text={n} variant="matched" />)}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 8 }}>{r1.title}만</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {sim.onlyIn1.map((n) => <Pill key={n} text={n} />)}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 8 }}>{r2.title}만</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {sim.onlyIn2.map((n) => <Pill key={n} text={n} />)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ───── 저장 키 ───── */

const MY_INGREDIENTS_KEY = "whattocook_my_ingredients";
function loadMyIngredients() {
  try { return new Set(JSON.parse(localStorage.getItem(MY_INGREDIENTS_KEY)) || []); }
  catch { return new Set(); }
}
function saveMyIngredients(set) {
  localStorage.setItem(MY_INGREDIENTS_KEY, JSON.stringify([...set]));
}

/* ───── 메인 페이지 ───── */

export default function ServicePage() {
  const [recipes, setRecipes] = useState([]);
  const [selected, setSelected] = useState(loadMyIngredients);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("ingredients"); // "ingredients" | "recipes" | "compare"
  const [detailId, setDetailId] = useState(null);
  const [compareIds, setCompareIds] = useState([]);

  const [synonyms, setSynonyms] = useState({});
  const [ingredientCategoryMap, setIngredientCategoryMap] = useState({});

  useEffect(() => {
    fetchRecipes().then(setRecipes).catch(console.error);
    fetchSynonyms().then(setSynonyms).catch(console.error);
  }, []);

  useEffect(() => { saveMyIngredients(selected); }, [selected]);

  const normalizeName = useCallback((name) => {
    if (typeof name !== "string") return "";
    const t = name.trim();
    if (synonyms[t]) return synonyms[t];
    const ns = t.replace(/\s+/g, "");
    if (synonyms[ns]) return synonyms[ns];
    return t;
  }, [synonyms]);
  const normalizeKey = useCallback((name) => normalizeName(name).replace(/\s+/g, "").toLowerCase(), [normalizeName]);

  const { uniqueNames, nameToDisplay } = useMemo(() => {
    const displayMap = {};
    for (const r of recipes) {
      for (const ing of r.ingredients || []) {
        const name = (typeof ing.name === "string" ? ing.name : "").trim();
        if (!name) continue;
        const key = normalizeKey(name);
        if (!displayMap[key] || name.length > displayMap[key].length) displayMap[key] = name;
      }
    }
    return { uniqueNames: Object.values(displayMap), nameToDisplay: displayMap };
  }, [recipes, normalizeKey]);

  const [classifyLoading, setClassifyLoading] = useState(false);

  useEffect(() => {
    setClassifyLoading(true);
    fetchCachedCategories()
      .then(setIngredientCategoryMap)
      .catch(console.error)
      .finally(() => setClassifyLoading(false));
  }, [recipes]);

  const EMOJI_MAP = { "육류": "🥩", "해산물": "🐟", "채소": "🥬", "양념/소스": "🧂", "곡물/면/두부": "🍚", "유제품/계란": "🥚", "액체/육수": "💧", "과일": "🍎", "견과류": "🥜", "가공식품": "🏭", "기타": "📦" };
  const CAT_ORDER = ["육류", "해산물", "채소", "과일", "견과류", "양념/소스", "곡물/면/두부", "유제품/계란", "액체/육수", "가공식품", "기타"];

  // 재료별 등장 빈도 계산
  const ingredientFrequency = useMemo(() => {
    const freq = {};
    for (const r of recipes) {
      for (const ing of r.ingredients || []) {
        const key = normalizeKey(ing.name);
        freq[key] = (freq[key] || 0) + 1;
      }
    }
    return freq;
  }, [recipes, normalizeKey]);

  const isClassified = Object.keys(ingredientCategoryMap).length > 0;

  // 3단계 구조: { "🥩 육류": { "돼지고기": ["목살", "삼겹살"], "소고기": [...] }, ... }
  const ingredientHierarchy = useMemo(() => {
    if (classifyLoading || (!isClassified && recipes.length > 0)) return {};

    const tree = {};
    const seen = new Set();
    for (const r of recipes) {
      for (const ing of r.ingredients || []) {
        const name = (typeof ing.name === "string" ? ing.name : "").trim();
        if (!name) continue;
        const key = normalizeKey(name);
        if (seen.has(key)) continue;
        seen.add(key);
        const displayName = nameToDisplay[key] || name;
        const info = ingredientCategoryMap[name] || ingredientCategoryMap[displayName];
        const rawCat = (info && typeof info === "object") ? info.category : (typeof info === "string" ? info : "기타");
        const rawSub = (info && typeof info === "object") ? (info.subcategory || "기타") : "기타";
        const cat = `${EMOJI_MAP[rawCat] || "📦"} ${rawCat}`;

        // 10회 이상 등장하는 재료만 아코디언에 표시
        const freq = ingredientFrequency[key] || 0;
        if (freq < 10) continue;

        if (!tree[cat]) tree[cat] = {};
        if (!tree[cat][rawSub]) tree[cat][rawSub] = [];
        tree[cat][rawSub].push(displayName);
      }
    }
    // 각 서브카테고리 내 빈도순 정렬
    for (const cat of Object.keys(tree)) {
      for (const sub of Object.keys(tree[cat])) {
        tree[cat][sub].sort((a, b) => {
          const fa = ingredientFrequency[normalizeKey(a)] || 0;
          const fb = ingredientFrequency[normalizeKey(b)] || 0;
          return fb - fa;
        });
      }
    }
    // 카테고리 순서 정렬
    const result = {};
    for (const rawCat of CAT_ORDER) {
      const cat = `${EMOJI_MAP[rawCat] || "📦"} ${rawCat}`;
      if (tree[cat]) result[cat] = tree[cat];
    }
    return result;
  }, [recipes, ingredientCategoryMap, nameToDisplay, normalizeKey, classifyLoading, ingredientFrequency]);

  // 전체 재료 목록 (검색용, 빈도 무관)
  const allIngredientsList = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const r of recipes) {
      for (const ing of r.ingredients || []) {
        const name = (typeof ing.name === "string" ? ing.name : "").trim();
        if (!name) continue;
        const key = normalizeKey(name);
        if (seen.has(key)) continue;
        seen.add(key);
        list.push(nameToDisplay[key] || name);
      }
    }
    return list;
  }, [recipes, normalizeKey, nameToDisplay]);

  // 검색 필터 — 검색어 있으면 전체 재료에서 찾기
  const filteredHierarchy = useMemo(() => {
    if (!search.trim()) return ingredientHierarchy;
    const q = search.trim().toLowerCase();

    // 전체 재료에서 검색 (빈도 무관)
    const matched = allIngredientsList.filter((n) => n.toLowerCase().includes(q));
    if (!matched.length) return {};

    // 검색 결과를 카테고리/서브카테고리로 그룹핑
    const result = {};
    for (const name of matched) {
      const info = ingredientCategoryMap[name];
      const rawCat = (info && typeof info === "object") ? info.category : (typeof info === "string" ? info : "기타");
      const rawSub = (info && typeof info === "object") ? (info.subcategory || "기타") : "기타";
      const cat = `${EMOJI_MAP[rawCat] || "📦"} ${rawCat}`;
      if (!result[cat]) result[cat] = {};
      if (!result[cat][rawSub]) result[cat][rawSub] = [];
      result[cat][rawSub].push(name);
    }
    return result;
  }, [ingredientHierarchy, search, allIngredientsList, ingredientCategoryMap]);

  const selectedNorm = useMemo(() => {
    return new Set([...selected].map((s) => normalizeKey(s)));
  }, [selected, normalizeKey]);

  const matched = useMemo(() => {
    const list = recipes
      .map((r) => ({ recipe: r, match: computeMatch(r, selectedNorm) }));

    if (selectedNorm.size === 0) {
      // 재료 선택 없으면 랜덤 셔플
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    }
    return list.sort((a, b) => b.match.rankScore - a.match.rankScore);
  }, [recipes, selectedNorm]);

  const matchCount = useMemo(() => matched.filter((m) => m.match.score > 0).length, [matched]);

  const toggle = useCallback((name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const toggleCompare = useCallback((id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }, []);

  const detailEntry = detailId ? matched.find((m) => m.recipe.id === detailId) : null;
  const compareRecipes = compareIds.length === 2
    ? [recipes.find((r) => r.id === compareIds[0]), recipes.find((r) => r.id === compareIds[1])]
    : null;

  const [openCats, setOpenCats] = useState(new Set());
  const toggleCat = (cat) => setOpenCats((prev) => {
    const next = new Set(prev);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    return next;
  });

  // 서브카테고리 선택 토글 (해당 서브의 모든 재료를 선택/해제)
  const toggleSubcategory = useCallback((items) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = items.every((n) => next.has(n));
      if (allSelected) {
        items.forEach((n) => next.delete(n));
      } else {
        items.forEach((n) => next.add(n));
      }
      return next;
    });
  }, []);

  const [openSubs, setOpenSubs] = useState(new Set());

  /* ───── 재료 선택 뷰 ───── */
  const ingredientsView = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {/* 검색 */}
      <div style={{ padding: "16px 20px 12px" }}>
        <input
          type="text" placeholder="🔍 목록에 없는 재료도 검색해보세요" value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "14px 18px", background: "var(--bg-card)",
            border: "1.5px solid var(--border)", borderRadius: 12, fontSize: 15,
            color: "var(--text-bright)", outline: "none",
            boxShadow: "0 1px 4px rgba(0,0,0,.04)",
          }}
        />
      </div>

      {/* 선택된 재료 요약 */}
      {selected.size > 0 && (
        <SelectedTags selected={selected} toggle={toggle} clearAll={() => setSelected(new Set())} />
      )}

      {/* 3단계 아코디언: 카테고리 → 서브카테고리 → 재료 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 100px" }}>
        {(classifyLoading || (!isClassified && recipes.length > 0)) ? (
          <p style={{ color: "var(--text-muted)", fontSize: 15, marginTop: 40, textAlign: "center" }}>
            재료 분류 중... 🍳
          </p>
        ) : (
          <>
            {Object.entries(filteredHierarchy).map(([cat, subs]) => {
              const isCatOpen = openCats.has(cat) || search.trim();
              const allItems = Object.values(subs).flat();
              const catSelCount = allItems.filter((n) => selected.has(n)).length;

              return (
                <div key={cat} style={{
                  marginBottom: 8, background: "var(--bg-card)", borderRadius: 12,
                  border: catSelCount > 0 ? "1.5px solid var(--accent-border)" : "1.5px solid var(--border)",
                  overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.03)",
                }}>
                  {/* 카테고리 헤더 */}
                  <button onClick={() => toggleCat(cat)} style={{
                    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 16px", background: "none", border: "none", cursor: "pointer",
                  }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text-bright)" }}>{cat}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {catSelCount > 0 && (
                        <span style={{ padding: "2px 8px", borderRadius: 10, background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                          {catSelCount}
                        </span>
                      )}
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{isCatOpen ? "▲" : "▼"}</span>
                    </span>
                  </button>

                  {/* 서브카테고리 목록 */}
                  {isCatOpen && Object.entries(subs).map(([sub, items]) => {
                    const subKey = `${cat}::${sub}`;
                    const isSubOpen = openSubs.has(subKey) || search.trim();
                    const subSelCount = items.filter((n) => selected.has(n)).length;
                    const allSubSelected = subSelCount === items.length;

                    return (
                      <div key={subKey} style={{ borderTop: "1px solid var(--border)" }}>
                        {/* 서브카테고리 헤더 — 클릭으로 아코디언 열기 */}
                        <button onClick={() => setOpenSubs((prev) => {
                          const next = new Set(prev);
                          if (next.has(subKey)) next.delete(subKey); else next.add(subKey);
                          return next;
                        })} style={{
                          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "10px 16px", background: "none", border: "none", cursor: "pointer",
                        }}>
                          <span style={{
                            fontSize: 15, fontWeight: 600,
                            color: subSelCount > 0 ? "var(--accent)" : "var(--text)",
                          }}>
                            {sub}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {subSelCount > 0 && (
                              <span style={{ padding: "2px 7px", borderRadius: 8, background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                                {subSelCount}/{items.length}
                              </span>
                            )}
                            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                              {items.length}개 {isSubOpen ? "▲" : "▼"}
                            </span>
                          </span>
                        </button>

                        {/* 펼침: 전체 선택 + 개별 재료 칩 */}
                        {isSubOpen && (
                          <div style={{ padding: "0 16px 12px" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
                              <button onClick={() => toggleSubcategory(items)} style={{
                                padding: "7px 14px", borderRadius: 20, cursor: "pointer",
                                border: allSubSelected ? "2px solid var(--accent)" : "1.5px dashed var(--border-light)",
                                background: allSubSelected ? "var(--accent)" : "transparent",
                                color: allSubSelected ? "#fff" : "var(--text-muted)",
                                fontSize: 14, fontWeight: 600,
                              }}>
                                {allSubSelected ? "✓ 전체 해제" : "전체 선택"}
                              </button>
                              {items.map((name) => (
                                <Chip key={name} label={name} active={selected.has(name)} onClick={() => toggle(name)} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {Object.keys(filteredHierarchy).length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: 15, marginTop: 24, textAlign: "center" }}>
                검색 결과가 없어요 😅
              </p>
            )}
          </>
        )}
      </div>

      {/* 하단 플로팅 CTA */}
      <div style={{
        position: "fixed", bottom: 20, left: 20, right: 20,
        zIndex: 50,
        transition: "transform .3s, opacity .3s",
        transform: selected.size > 0 ? "translateY(0)" : "translateY(80px)",
        opacity: selected.size > 0 ? 1 : 0,
        pointerEvents: selected.size > 0 ? "auto" : "none",
      }}>
        <button
          onClick={() => setView("recipes")}
          style={{
            width: "100%", padding: "16px", borderRadius: 16, border: "none",
            background: matchCount > 0 ? "var(--accent)" : "var(--border)",
            color: matchCount > 0 ? "#fff" : "var(--text-muted)",
            fontSize: 17, fontWeight: 700, cursor: "pointer",
            boxShadow: matchCount > 0 ? "0 6px 20px rgba(249,115,22,.35)" : "0 2px 10px rgba(0,0,0,.1)",
          }}
        >
          {matchCount > 0
            ? `만들 수 있는 레시피 보기 (${matchCount}개 매칭)`
            : "매칭되는 레시피가 없어요"}
        </button>
      </div>
    </div>
  );

  /* ───── 레시피 리스트 뷰 ───── */
  const recipesView = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* 헤더 */}
      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => setView("ingredients")} style={{
          background: "none", border: "none", color: "var(--accent)", fontSize: 15, fontWeight: 600, cursor: "pointer",
        }}>
          ← 재료 수정
        </button>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {selected.size > 0 ? `${matchCount}/${recipes.length} 매칭` : `${recipes.length}개 레시피`}
        </span>
      </div>

      {/* 선택된 재료 요약 */}
      {selected.size > 0 && (
        <div style={{ borderBottom: "1px solid var(--border)" }}>
          <SelectedTags selected={selected} toggle={toggle} clearAll={() => setSelected(new Set())} />
        </div>
      )}

      {/* 리스트 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {matched.map(({ recipe, match }) => (
          <RecipeCard
            key={recipe.id} recipe={recipe} match={match}
            selected={detailId === recipe.id}
            selectedCount={selected.size}
            onClick={() => setDetailId(recipe.id)}
          />
        ))}
      </div>
    </div>
  );

  /* ───── 비교 뷰 ───── */
  const compareView = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => setView("recipes")} style={{
          background: "none", border: "none", color: "var(--accent)", fontSize: 15, fontWeight: 600, cursor: "pointer",
        }}>
          ← 뒤로
        </button>
        <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
          {compareIds.length}/2 선택됨
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {matched.map(({ recipe, match }) => (
          <div key={recipe.id} onClick={() => toggleCompare(recipe.id)} style={{
            background: "var(--bg-card)",
            border: compareIds.includes(recipe.id) ? "2px solid var(--accent)" : "1.5px solid var(--border)",
            borderRadius: 14, padding: "14px 18px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 28 }}>{EMOJI[recipe.category] || "🍽️"}</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-bright)", margin: 0 }}>{recipe.title}</h3>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{recipe.channel}</span>
            </div>
            <span style={{
              padding: "4px 10px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: compareIds.includes(recipe.id) ? "var(--accent)" : "var(--bg-input)",
              color: compareIds.includes(recipe.id) ? "#fff" : "var(--text-muted)",
            }}>
              {compareIds.includes(recipe.id) ? "✓" : "선택"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem("whattocook_onboarding_done");
  });

  const dismissOnboarding = (forever) => {
    if (forever) localStorage.setItem("whattocook_onboarding_done", "1");
    setShowOnboarding(false);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

      {/* 온보딩 팝업 */}
      {showOnboarding && (
        <>
          <div onClick={() => dismissOnboarding(false)} style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,.4)", zIndex: 200,
          }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            width: "min(380px, 90vw)", background: "var(--bg-card)", borderRadius: 20,
            padding: "32px 24px 24px", zIndex: 201,
            boxShadow: "0 20px 60px rgba(0,0,0,.15)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍳</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)", marginBottom: 6 }}>
              뭐해먹지?
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.5 }}>
              냉장고 속 재료로 만들 수 있는 레시피를 찾아보세요
            </p>

            <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>1️⃣</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-bright)" }}>재료 고르기</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>집에 있는 재료를 탭해서 선택하세요</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>2️⃣</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-bright)" }}>레시피 확인</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>매칭률 높은 순으로 레시피를 추천해드려요</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>3️⃣</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-bright)" }}>영상 보며 요리</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>유튜브 영상과 재료/분량을 바로 확인하세요</div>
                </div>
              </div>
            </div>

            <button onClick={() => dismissOnboarding(false)} style={{
              width: "100%", padding: "14px", borderRadius: 14, border: "none",
              background: "var(--accent)", color: "#fff", fontSize: 16, fontWeight: 700,
              cursor: "pointer", boxShadow: "0 4px 14px rgba(249,115,22,.3)",
              marginBottom: 10,
            }}>
              시작하기
            </button>
            <button onClick={() => dismissOnboarding(true)} style={{
              background: "none", border: "none", color: "var(--text-muted)",
              fontSize: 13, cursor: "pointer",
            }}>
              다시 보지 않기
            </button>
          </div>
        </>
      )}

      {/* 헤더 */}
      <div style={{
        padding: "10px 16px 0", borderBottom: "1px solid var(--border)", background: "var(--bg-card)",
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)", margin: "0 0 8px", cursor: "pointer" }}
          onClick={() => setView("ingredients")}>
          🍳 뭐해먹지?
        </h1>
        <div style={{ display: "flex", gap: 4, paddingBottom: 10 }}>
          {[
            { key: "ingredients", label: "재료" },
            { key: "recipes", label: "레시피" },
            { key: "compare", label: "비교" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setView(key)} style={{
              padding: "6px 12px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: view === key ? "var(--accent)" : "transparent",
              color: view === key ? "#fff" : "var(--text-muted)",
              whiteSpace: "nowrap",
            }}>
              {label}
              {key === "recipes" && matchCount > 0 && view !== "recipes" && (
                <span style={{
                  marginLeft: 3, padding: "1px 5px", borderRadius: 8, fontSize: 10,
                  background: view === key ? "rgba(255,255,255,.3)" : "var(--accent)",
                  color: "#fff",
                }}>
                  {matchCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 뷰 전환 */}
      {view === "ingredients" && ingredientsView}
      {view === "recipes" && recipesView}
      {view === "compare" && compareView}

      {/* 상세 패널 */}
      {detailEntry && (
        <DetailPanel recipe={detailEntry.recipe} match={detailEntry.match} onClose={() => setDetailId(null)} />
      )}
      {compareRecipes && (
        <ComparePanel r1={compareRecipes[0]} r2={compareRecipes[1]} onClose={() => setCompareIds([])} />
      )}
    </div>
  );
}
