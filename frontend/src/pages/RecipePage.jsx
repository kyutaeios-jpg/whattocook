import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";

function getYoutubeId(recipe) {
  if (recipe.youtubeId) return recipe.youtubeId;
  if (!recipe.url) return "";
  try {
    const u = new URL(recipe.url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    return u.searchParams.get("v") || "";
  } catch { return ""; }
}

export default function RecipePage() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/recipes/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setRecipe)
      .catch(() => setRecipe(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>로딩 중...</div>
  );

  if (!recipe) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <p style={{ fontSize: 18, color: "var(--text-muted)", marginBottom: 16 }}>레시피를 찾을 수 없습니다</p>
      <Link to="/" style={{ color: "var(--accent)", fontSize: 16 }}>← 홈으로 돌아가기</Link>
    </div>
  );

  const ytId = getYoutubeId(recipe);
  const ingredients = (recipe.ingredients || []).filter((i) => typeof i.name === "string" && i.name.trim());

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 20px" }}>
      {/* 헤더 */}
      <Link to="/" style={{ color: "var(--accent)", fontSize: 15, textDecoration: "none", fontWeight: 600 }}>
        ← 뭐해먹지?
      </Link>

      <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-bright)", margin: "16px 0 8px" }}>
        {recipe.title}
      </h1>
      <p style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 20 }}>
        {recipe.channel} · {recipe.category} · {recipe.difficulty}
        {recipe.time && ` · ${recipe.time}`}
      </p>

      {/* YouTube 임베드 */}
      {ytId && (
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 14, overflow: "hidden", background: "#000", marginBottom: 24 }}>
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            title={recipe.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
          />
        </div>
      )}

      {/* 재료 */}
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-bright)", marginBottom: 12 }}>재료</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 28 }}>
        {ingredients.map((ing, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 14px", borderRadius: 10, background: "var(--bg-input)",
          }}>
            <span style={{ fontSize: 15, color: "var(--text-bright)", fontWeight: 500 }}>{ing.name}</span>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{ing.amount}</span>
          </div>
        ))}
      </div>

      {/* 조리 순서 */}
      {recipe.steps?.length > 0 && (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-bright)", marginBottom: 12 }}>조리 순서</h2>
          <ol style={{ paddingLeft: 22, display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
            {recipe.steps.map((step, i) => (
              <li key={i} style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.6 }}>
                {typeof step === "string" ? step : ""}
              </li>
            ))}
          </ol>
        </>
      )}

      {/* YouTube 원본 링크 */}
      {recipe.url && (
        <a href={recipe.url} target="_blank" rel="noopener noreferrer" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "14px", borderRadius: 14, background: "#e53e3e", color: "#fff",
          fontSize: 16, fontWeight: 700, textDecoration: "none", marginBottom: 20,
        }}>
          ▶ YouTube에서 보기
        </a>
      )}
    </div>
  );
}
