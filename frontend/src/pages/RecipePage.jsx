import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";
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

function getYoutubeId(recipe) {
  if (recipe.youtubeId) return recipe.youtubeId;
  if (!recipe.url) return "";
  try {
    const u = new URL(recipe.url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    return u.searchParams.get("v") || "";
  } catch { return ""; }
}

function ShareRecipeButton({ title }) {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;
  const text = `${title} - 뭐해먹지?`;

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleShare} style={{
      background: "var(--bg-input)", border: "none", borderRadius: 10,
      padding: "8px 16px", cursor: "pointer", flexShrink: 0,
      display: "flex", alignItems: "center", gap: 6,
      color: copied ? "var(--green)" : "var(--text-muted)",
      fontSize: 14, fontWeight: 500,
    }}>
      {copied ? "✓ 복사됨" : "🔗 공유"}
    </button>
  );
}

function RecipeShoppingLinks({ ingredients }) {
  const [shop, setShop] = useState("coupang");
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-bright)" }}>재료 구매</h2>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { key: "coupang", label: "쿠팡", Logo: CoupangLogo },
            { key: "naver", label: "네이버", Logo: NaverLogo },
          ].map(({ key, label, Logo }) => (
            <button key={key} onClick={() => setShop(key)} style={{
              padding: "5px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: shop === key ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
              background: shop === key ? "var(--accent-bg)" : "transparent",
              color: shop === key ? "var(--accent)" : "var(--text-muted)",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <Logo /> {label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
        {ingredients.map((ing, i) => (
          <a key={i} href={shopUrl(ing.name, shop)} target="_blank" rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
              borderRadius: 10, background: "var(--bg-input)", color: "var(--accent)",
              fontSize: 14, textDecoration: "none", fontWeight: 500,
            }}>
            {shop === "coupang" ? <CoupangLogo /> : <NaverLogo />} {ing.name}
          </a>
        ))}
      </div>
    </div>
  );
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 16, marginBottom: 8 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-bright)", margin: 0, flex: 1 }}>
          {recipe.title}
        </h1>
        <ShareRecipeButton title={recipe.title} />
      </div>
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
          fontSize: 16, fontWeight: 700, textDecoration: "none", marginBottom: 28,
        }}>
          ▶ YouTube에서 보기
        </a>
      )}

      {/* 재료 구매 */}
      {ingredients.length > 0 && <RecipeShoppingLinks ingredients={ingredients} />}
    </div>
  );
}
