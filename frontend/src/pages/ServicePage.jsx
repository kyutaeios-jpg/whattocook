import { useState, useMemo, useCallback } from "react";
import {
  loadRecipes,
  computeMatch,
  computeSimilarity,
  getAllIngredients,
  getAllCategories,
} from "../lib/recipes";

/* ───── 카테고리별 이모지 ───── */
const EMOJI = {
  한식: "🍚",
  중식: "🥟",
  일식: "🍣",
  양식: "🍝",
  디저트: "🍰",
  기타: "🍽️",
};

/* ───── 스타일 상수 ───── */
const S = {
  layout: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
  },

  /* 사이드바 */
  sidebar: {
    width: 260,
    minWidth: 260,
    background: "var(--bg-sidebar)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  sidebarHeader: {
    padding: "20px 16px 12px",
    fontFamily: "var(--serif)",
    fontSize: 18,
    fontWeight: 700,
    color: "var(--accent)",
    borderBottom: "1px solid var(--border)",
  },
  searchBox: {
    margin: "12px 12px 8px",
    padding: "8px 10px",
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    color: "var(--text-bright)",
    fontSize: 13,
    outline: "none",
    width: "calc(100% - 24px)",
  },
  sidebarScroll: {
    flex: 1,
    overflowY: "auto",
    padding: "4px 12px 16px",
  },
  catLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    margin: "14px 0 6px",
  },
  chipWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },

  /* 메인 */
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderBottom: "1px solid var(--border)",
  },
  tabs: {
    display: "flex",
    gap: 4,
  },
  badge: {
    fontFamily: "var(--mono)",
    fontSize: 12,
    color: "var(--accent)",
  },
  grid: {
    flex: 1,
    overflowY: "auto",
    padding: 24,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 16,
    alignContent: "start",
  },

  /* 상세 패널 */
  panel: {
    width: 380,
    minWidth: 380,
    background: "var(--bg-sidebar)",
    borderLeft: "1px solid var(--border)",
    overflowY: "auto",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
};

/* ───── 재사용 컴포넌트 ───── */

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        border: active
          ? "1px solid var(--accent)"
          : "1px solid var(--border-light)",
        background: active ? "var(--accent-bg)" : "transparent",
        color: active ? "var(--accent-light)" : "var(--text)",
        fontSize: 12,
        cursor: "pointer",
        transition: "all .15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 16px",
        borderRadius: 6,
        border: "none",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#fff" : "var(--text-muted)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function MatchBar({ score }) {
  const pct = Math.round(score * 100);
  return (
    <div
      style={{
        height: 4,
        borderRadius: 2,
        background: "var(--border)",
        overflow: "hidden",
        margin: "8px 0",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: 2,
          background:
            pct >= 80
              ? "var(--green)"
              : pct >= 50
                ? "var(--accent)"
                : "var(--red)",
          transition: "width .3s",
        }}
      />
    </div>
  );
}

function Pill({ text, variant = "default" }) {
  const styles = {
    matched: { background: "var(--green-bg)", color: "var(--green)" },
    missing: { background: "var(--red-bg)", color: "var(--red)" },
    default: { background: "var(--bg-input)", color: "var(--text)" },
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontFamily: "var(--mono)",
        ...styles[variant],
      }}
    >
      {text}
    </span>
  );
}

/* ───── 레시피 카드 ───── */

function RecipeCard({ recipe, match, onClick, selected, compareMode, onCompareToggle }) {
  const pct = Math.round(match.score * 100);
  const emoji = EMOJI[recipe.category] || EMOJI["기타"];

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-card)",
        border: selected
          ? "1px solid var(--accent)"
          : "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
        cursor: "pointer",
        transition: "border-color .15s, transform .15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <span style={{ fontSize: 28 }}>{emoji}</span>
          <h3
            style={{
              fontFamily: "var(--serif)",
              fontSize: 17,
              fontWeight: 700,
              color: "var(--text-bright)",
              margin: "6px 0 2px",
            }}
          >
            {recipe.title}
          </h3>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {recipe.channel || recipe.category} · {recipe.time} · {recipe.difficulty}
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 20,
            fontWeight: 500,
            color:
              pct >= 80
                ? "var(--green)"
                : pct >= 50
                  ? "var(--accent)"
                  : "var(--red)",
          }}
        >
          {pct}%
        </span>
      </div>

      <MatchBar score={match.score} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
        {match.matched.map((n) => (
          <Pill key={n} text={n} variant="matched" />
        ))}
        {match.missing.map((n) => (
          <Pill key={n} text={n} variant="missing" />
        ))}
      </div>

      {compareMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCompareToggle(recipe.id);
          }}
          style={{
            marginTop: 10,
            padding: "4px 12px",
            borderRadius: 6,
            border: selected
              ? "1px solid var(--accent)"
              : "1px solid var(--border-light)",
            background: selected ? "var(--accent-bg)" : "transparent",
            color: selected ? "var(--accent)" : "var(--text-muted)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {selected ? "선택됨 ✓" : "비교 선택"}
        </button>
      )}

      {recipe.url && !compareMode && (
        <a
          href={recipe.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
            padding: "6px 14px",
            borderRadius: 6,
            background: "var(--red)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          ▶ YouTube에서 보기
        </a>
      )}
    </div>
  );
}

/* ───── 상세 패널 ───── */

function DetailPanel({ recipe, match, onClose }) {
  if (!recipe) return null;

  const emoji = EMOJI[recipe.category] || EMOJI["기타"];
  const previewSteps = (recipe.steps || []).slice(0, 2);

  return (
    <div style={S.panel}>
      {/* 닫기 */}
      <button
        onClick={onClose}
        style={{
          alignSelf: "flex-end",
          background: "none",
          border: "none",
          color: "var(--text-muted)",
          fontSize: 20,
          cursor: "pointer",
        }}
      >
        ✕
      </button>

      {/* 헤더 */}
      <div>
        <span style={{ fontSize: 40 }}>{emoji}</span>
        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text-bright)",
            marginTop: 8,
          }}
        >
          {recipe.title}
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          {recipe.channel || recipe.category} · {recipe.time} · {recipe.difficulty}
        </p>
      </div>

      {/* YouTube CTA */}
      {recipe.url ? (
        <a
          href={recipe.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "12px 0",
            borderRadius: 8,
            background: "var(--red)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ▶ YouTube 원본 보기
        </a>
      ) : (
        <div
          style={{
            padding: "12px 0",
            borderRadius: 8,
            background: "var(--bg-input)",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          YouTube URL 없음 — 레시피 추출로 추가해보세요
        </div>
      )}

      {/* 재료 */}
      <div>
        <h4
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-muted)",
            marginBottom: 8,
          }}
        >
          재료 미리보기
        </h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {match.matched.map((n) => (
            <Pill key={n} text={`✓ ${n}`} variant="matched" />
          ))}
          {match.missing.map((n) => (
            <Pill key={n} text={`✗ ${n}`} variant="missing" />
          ))}
        </div>
      </div>

      {/* 조리 흐름 미리보기 */}
      <div>
        <h4
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-muted)",
            marginBottom: 8,
          }}
        >
          조리 흐름 미리보기
        </h4>
        <ol
          style={{
            paddingLeft: 20,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {previewSteps.map((step, i) => (
            <li
              key={i}
              style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}
            >
              {step}
            </li>
          ))}
        </ol>
        {(recipe.steps || []).length > 2 && (
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginTop: 8,
              fontStyle: "italic",
            }}
          >
            …나머지 {recipe.steps.length - 2}단계는 영상에서 확인하세요
          </p>
        )}
      </div>

      {/* 부족 재료 → 쿠팡 */}
      {match.missing.length > 0 && (
        <div>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-muted)",
              marginBottom: 8,
            }}
          >
            부족한 재료 구매
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {match.missing.map((name) => (
              <a
                key={name}
                href={`https://www.coupang.com/np/search?q=${encodeURIComponent(name)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 6,
                  background: "var(--bg-input)",
                  color: "var(--accent-light)",
                  fontSize: 12,
                  textDecoration: "none",
                }}
              >
                🛒 {name} 검색
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── 비교 패널 ───── */

function ComparePanel({ r1, r2, onClose }) {
  const sim = computeSimilarity(r1, r2);
  const pct = Math.round(sim.jaccard * 100);

  return (
    <div style={S.panel}>
      <button
        onClick={onClose}
        style={{
          alignSelf: "flex-end",
          background: "none",
          border: "none",
          color: "var(--text-muted)",
          fontSize: 20,
          cursor: "pointer",
        }}
      >
        ✕
      </button>

      <h3
        style={{
          fontFamily: "var(--serif)",
          fontSize: 18,
          color: "var(--text-bright)",
        }}
      >
        레시피 비교
      </h3>

      <div
        style={{
          textAlign: "center",
          padding: 16,
          background: "var(--bg-input)",
          borderRadius: 10,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 36,
            fontWeight: 500,
            color: "var(--accent)",
          }}
        >
          {pct}%
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          Jaccard 유사도
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 15,
          fontWeight: 600,
          color: "var(--text-bright)",
        }}
      >
        <span>
          {EMOJI[r1.category] || ""} {r1.title}
        </span>
        <span>vs</span>
        <span>
          {EMOJI[r2.category] || ""} {r2.title}
        </span>
      </div>

      {sim.shared.length > 0 && (
        <div>
          <h4 style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
            공통 재료 ({sim.shared.length})
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {sim.shared.map((n) => (
              <Pill key={n} text={n} variant="matched" />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
            {r1.title}만
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {sim.onlyIn1.map((n) => (
              <Pill key={n} text={n} />
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
            {r2.title}만
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {sim.onlyIn2.map((n) => (
              <Pill key={n} text={n} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───── 메인 페이지 ───── */

export default function ServicePage() {
  const [recipes] = useState(loadRecipes);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("match"); // "match" | "compare"
  const [detailId, setDetailId] = useState(null);
  const [compareIds, setCompareIds] = useState([]);

  /* 전체 재료 / 카테고리 */
  const allIngredients = useMemo(() => getAllIngredients(recipes), [recipes]);
  const allCategories = useMemo(() => getAllCategories(recipes), [recipes]);

  /* 재료를 카테고리별로 그룹 — 여기선 간이로 레시피 카테고리 기반 그룹핑 */
  const ingredientsByCategory = useMemo(() => {
    const map = {};
    for (const r of recipes) {
      const cat = r.category || "기타";
      for (const ing of r.ingredients || []) {
        const name = ing.name.trim();
        if (!map[cat]) map[cat] = new Set();
        map[cat].add(name);
      }
    }
    const result = {};
    for (const cat of Object.keys(map).sort()) {
      result[cat] = [...map[cat]].sort();
    }
    return result;
  }, [recipes]);

  /* 검색 필터 */
  const filteredIngredients = useMemo(() => {
    if (!search.trim()) return ingredientsByCategory;
    const q = search.trim().toLowerCase();
    const result = {};
    for (const [cat, list] of Object.entries(ingredientsByCategory)) {
      const filtered = list.filter((n) => n.toLowerCase().includes(q));
      if (filtered.length) result[cat] = filtered;
    }
    return result;
  }, [ingredientsByCategory, search]);

  /* 정규화된 selected set */
  const selectedNorm = useMemo(() => {
    return new Set([...selected].map((s) => s.trim().replace(/\s+/g, "").toLowerCase()));
  }, [selected]);

  /* 매칭 계산 & 정렬 */
  const matched = useMemo(() => {
    return recipes
      .map((r) => ({ recipe: r, match: computeMatch(r, selectedNorm) }))
      .sort((a, b) => b.match.score - a.match.score);
  }, [recipes, selectedNorm]);

  /* 재료 토글 */
  const toggle = useCallback((name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  /* 비교 토글 */
  const toggleCompare = useCallback((id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }, []);

  /* 상세 대상 */
  const detailEntry = detailId
    ? matched.find((m) => m.recipe.id === detailId)
    : null;

  /* 비교 대상 */
  const compareRecipes =
    compareIds.length === 2
      ? [
          recipes.find((r) => r.id === compareIds[0]),
          recipes.find((r) => r.id === compareIds[1]),
        ]
      : null;

  return (
    <div style={S.layout}>
      {/* ── 사이드바 ── */}
      <aside style={S.sidebar}>
        <div style={S.sidebarHeader}>🍳 What To Cook</div>
        <input
          type="text"
          placeholder="재료 검색…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={S.searchBox}
        />
        <div style={S.sidebarScroll}>
          {Object.entries(filteredIngredients).map(([cat, list]) => (
            <div key={cat}>
              <div style={S.catLabel}>
                {EMOJI[cat] || ""} {cat}
              </div>
              <div style={S.chipWrap}>
                {list.map((name) => (
                  <Chip
                    key={name}
                    label={name}
                    active={selected.has(name)}
                    onClick={() => toggle(name)}
                  />
                ))}
              </div>
            </div>
          ))}

          {Object.keys(filteredIngredients).length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 20 }}>
              검색 결과가 없습니다
            </p>
          )}
        </div>

        {selected.size > 0 && (
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {selected.size}개 선택
            </span>
            <button
              onClick={() => setSelected(new Set())}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              초기화
            </button>
          </div>
        )}
      </aside>

      {/* ── 메인 ── */}
      <main style={S.main}>
        <div style={S.topBar}>
          <div style={S.tabs}>
            <Tab
              label="재료로 찾기"
              active={tab === "match"}
              onClick={() => {
                setTab("match");
                setCompareIds([]);
              }}
            />
            <Tab
              label="레시피 비교"
              active={tab === "compare"}
              onClick={() => {
                setTab("compare");
                setDetailId(null);
              }}
            />
          </div>
          <span style={S.badge}>
            {selected.size > 0
              ? `${matched.filter((m) => m.match.score > 0).length} / ${recipes.length} recipes`
              : `${recipes.length} recipes`}
          </span>
        </div>

        <div style={S.grid}>
          {matched.map(({ recipe, match }) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              match={match}
              selected={
                tab === "compare"
                  ? compareIds.includes(recipe.id)
                  : detailId === recipe.id
              }
              onClick={() => {
                if (tab === "match") setDetailId(recipe.id);
              }}
              compareMode={tab === "compare"}
              onCompareToggle={toggleCompare}
            />
          ))}
        </div>
      </main>

      {/* ── 우측 패널 ── */}
      {tab === "match" && detailEntry && (
        <DetailPanel
          recipe={detailEntry.recipe}
          match={detailEntry.match}
          onClose={() => setDetailId(null)}
        />
      )}

      {tab === "compare" && compareRecipes && (
        <ComparePanel
          r1={compareRecipes[0]}
          r2={compareRecipes[1]}
          onClose={() => setCompareIds([])}
        />
      )}
    </div>
  );
}
