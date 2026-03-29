import { useState, useMemo } from "react";
import {
  loadRecipes,
  saveRecipes,
  getAllIngredients,
  DEFAULT_RECIPES,
} from "../lib/recipes";
import { extractRecipe } from "../lib/api";

/* ───── 색상 토큰 (청색 포인트) ───── */
const C = {
  bg: "#111318",
  bgSide: "#14161c",
  bgCard: "#1a1d26",
  bgInput: "#1e2130",
  border: "#282c3a",
  accent: "#3a7bd5",
  accentLight: "#5a9bf0",
  accentBg: "rgba(58,123,213,.12)",
  text: "#b8bcc8",
  textMuted: "#6b7084",
  textBright: "#e8eaf0",
  red: "#e05555",
  redBg: "rgba(224,85,85,.1)",
  green: "#48bb78",
};

/* ───── 공용 스타일 ───── */
const input = {
  padding: "8px 12px",
  background: C.bgInput,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  color: C.textBright,
  fontSize: 13,
  outline: "none",
  width: "100%",
};
const btnPrimary = {
  padding: "8px 20px",
  borderRadius: 6,
  border: "none",
  background: C.accent,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
const btnGhost = {
  padding: "6px 14px",
  borderRadius: 6,
  border: `1px solid ${C.border}`,
  background: "transparent",
  color: C.text,
  fontSize: 12,
  cursor: "pointer",
};
const btnDanger = {
  ...btnGhost,
  borderColor: C.red,
  color: C.red,
};

/* ───── 비밀번호 게이트 ───── */
function LoginGate({ onAuth }) {
  const [pw, setPw] = useState("");
  const [shake, setShake] = useState(false);

  const handle = (e) => {
    e.preventDefault();
    if (pw === import.meta.env.VITE_ADMIN_PASSWORD) {
      onAuth();
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: C.bg,
      }}
    >
      <form
        onSubmit={handle}
        style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 40,
          width: 360,
          textAlign: "center",
          transform: shake ? "translateX(8px)" : "none",
          transition: "transform .08s",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
        <h2 style={{ color: C.textBright, fontSize: 18, marginBottom: 24 }}>
          관리자 인증
        </h2>
        <input
          type="password"
          placeholder="비밀번호를 입력하세요"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={{ ...input, marginBottom: 16, textAlign: "center" }}
        />
        <button type="submit" style={{ ...btnPrimary, width: "100%" }}>
          로그인
        </button>
      </form>
    </div>
  );
}

/* ───── 대시보드 ───── */
function Dashboard({ recipes }) {
  const ingredientCount = useMemo(
    () => getAllIngredients(recipes).length,
    [recipes],
  );
  const cats = useMemo(() => {
    const m = {};
    for (const r of recipes) {
      const c = r.category || "기타";
      m[c] = (m[c] || 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [recipes]);

  const Stat = ({ label, value, color }) => (
    <div
      style={{
        background: C.bgInput,
        borderRadius: 10,
        padding: 24,
        flex: 1,
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 700, color, fontFamily: "var(--mono, monospace)" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h2 style={{ color: C.textBright, fontSize: 20, margin: 0 }}>대시보드</h2>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Stat label="등록 레시피" value={recipes.length} color={C.accent} />
        <Stat label="색인 재료" value={ingredientCount} color={C.green} />
        <Stat label="카테고리" value={cats.length} color={C.accentLight} />
      </div>

      <div
        style={{
          background: C.bgInput,
          borderRadius: 10,
          padding: 20,
        }}
      >
        <h4 style={{ color: C.textMuted, fontSize: 12, marginBottom: 12 }}>
          카테고리별 분포
        </h4>
        {cats.map(([cat, count]) => (
          <div
            key={cat}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <span style={{ width: 60, fontSize: 13, color: C.text }}>{cat}</span>
            <div
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                background: C.border,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(count / recipes.length) * 100}%`,
                  height: "100%",
                  background: C.accent,
                  borderRadius: 3,
                }}
              />
            </div>
            <span
              style={{
                fontSize: 12,
                color: C.textMuted,
                fontFamily: "var(--mono, monospace)",
                width: 20,
                textAlign: "right",
              }}
            >
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───── 레시피 추가 (3-step) ───── */
function AddRecipe({ onSave }) {
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(null);

  /* STEP 1 → 2 : 추출 */
  const handleExtract = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await extractRecipe(url);
      setDraft({
        title: data.title || "",
        channel: data.channel || "",
        category: data.category || "기타",
        time: data.time || "",
        difficulty: data.difficulty || "보통",
        youtubeId: extractYoutubeId(url),
        url,
        ingredients: (data.ingredients || []).map((i, idx) => ({
          _key: idx,
          name: i.name || "",
          amount: i.amount || "",
          group: i.group || "",
        })),
        steps: (data.steps || []).map((s, idx) => ({ _key: idx, text: s })),
      });
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* 유튜브 ID 추출 */
  function extractYoutubeId(rawUrl) {
    try {
      const u = new URL(rawUrl);
      if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
      return u.searchParams.get("v") || "";
    } catch {
      return "";
    }
  }

  /* draft 필드 변경 */
  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const setIng = (idx, k, v) =>
    setDraft((d) => ({
      ...d,
      ingredients: d.ingredients.map((ing, i) =>
        i === idx ? { ...ing, [k]: v } : ing,
      ),
    }));
  const addIng = () =>
    setDraft((d) => ({
      ...d,
      ingredients: [
        ...d.ingredients,
        { _key: Date.now(), name: "", amount: "", group: "" },
      ],
    }));
  const delIng = (idx) =>
    setDraft((d) => ({
      ...d,
      ingredients: d.ingredients.filter((_, i) => i !== idx),
    }));
  const setStep_ = (idx, v) =>
    setDraft((d) => ({
      ...d,
      steps: d.steps.map((s, i) => (i === idx ? { ...s, text: v } : s)),
    }));
  const addStep_ = () =>
    setDraft((d) => ({
      ...d,
      steps: [...d.steps, { _key: Date.now(), text: "" }],
    }));
  const delStep_ = (idx) =>
    setDraft((d) => ({
      ...d,
      steps: d.steps.filter((_, i) => i !== idx),
    }));

  /* 저장 */
  const handleSave = () => {
    const recipe = {
      id: crypto.randomUUID(),
      title: draft.title,
      channel: draft.channel,
      category: draft.category,
      time: draft.time,
      difficulty: draft.difficulty,
      youtubeId: draft.youtubeId,
      url: draft.url,
      ingredients: draft.ingredients.map(({ name, amount, group }) => ({
        name,
        amount,
        group,
      })),
      steps: draft.steps.map((s) => s.text),
      createdAt: Date.now(),
    };
    onSave(recipe);
    setStep(1);
    setUrl("");
    setDraft(null);
  };

  const sectionTitle = {
    fontSize: 14,
    fontWeight: 600,
    color: C.textBright,
    marginBottom: 10,
    marginTop: 20,
  };

  /* 단계 표시 */
  const steps = ["URL 입력", "추출 중", "검수 & 저장"];

  return (
    <div>
      <h2 style={{ color: C.textBright, fontSize: 20, margin: "0 0 20px" }}>
        레시피 추가
      </h2>

      {/* 스텝 인디케이터 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {steps.map((label, i) => {
          const num = i + 1;
          const active = step === num || (num === 2 && loading);
          const done = step > num;
          return (
            <div
              key={num}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 6,
                textAlign: "center",
                fontSize: 12,
                fontWeight: 600,
                background: active
                  ? C.accentBg
                  : done
                    ? C.bgInput
                    : "transparent",
                color: active ? C.accent : done ? C.green : C.textMuted,
                border: `1px solid ${active ? C.accent : "transparent"}`,
              }}
            >
              {done ? "✓ " : `${num}. `}
              {label}
            </div>
          );
        })}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <form
          onSubmit={handleExtract}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label style={{ fontSize: 13, color: C.textMuted }}>YouTube URL</label>
          <input
            type="url"
            placeholder="https://youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            style={input}
          />
          {error && (
            <p style={{ color: C.red, fontSize: 13 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Claude가 레시피 추출 중…" : "레시피 추출"}
          </button>
        </form>
      )}

      {/* STEP 3 — 검수 폼 */}
      {step === 3 && draft && (
        <div>
          {/* 기본 정보 */}
          <div style={sectionTitle}>기본 정보</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              background: C.bgInput,
              padding: 16,
              borderRadius: 10,
            }}
          >
            {[
              ["title", "제목"],
              ["channel", "채널"],
              ["category", "카테고리"],
              ["time", "조리 시간"],
              ["difficulty", "난이도"],
              ["youtubeId", "YouTube ID"],
            ].map(([key, label]) => (
              <div key={key}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: C.textMuted,
                    marginBottom: 4,
                  }}
                >
                  {label}
                </label>
                <input
                  value={draft[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  style={input}
                />
              </div>
            ))}
          </div>

          {/* 재료 */}
          <div
            style={{
              ...sectionTitle,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>재료 ({draft.ingredients.length})</span>
            <button onClick={addIng} style={btnGhost}>
              + 행 추가
            </button>
          </div>
          <div
            style={{
              background: C.bgInput,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {/* 헤더 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 100px 100px 36px",
                gap: 8,
                padding: "8px 12px",
                borderBottom: `1px solid ${C.border}`,
                fontSize: 11,
                color: C.textMuted,
                fontWeight: 600,
              }}
            >
              <span>재료명</span>
              <span>양</span>
              <span>분류</span>
              <span />
            </div>
            {draft.ingredients.map((ing, i) => (
              <div
                key={ing._key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 100px 36px",
                  gap: 8,
                  padding: "6px 12px",
                  alignItems: "center",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <input
                  value={ing.name}
                  onChange={(e) => setIng(i, "name", e.target.value)}
                  style={{ ...input, padding: "6px 8px" }}
                />
                <input
                  value={ing.amount}
                  onChange={(e) => setIng(i, "amount", e.target.value)}
                  style={{ ...input, padding: "6px 8px" }}
                />
                <input
                  value={ing.group}
                  onChange={(e) => setIng(i, "group", e.target.value)}
                  placeholder="선택"
                  style={{ ...input, padding: "6px 8px" }}
                />
                <button
                  onClick={() => delIng(i)}
                  style={{
                    background: "none",
                    border: "none",
                    color: C.red,
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* 조리 단계 */}
          <div
            style={{
              ...sectionTitle,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>조리 단계 ({draft.steps.length})</span>
            <button onClick={addStep_} style={btnGhost}>
              + 행 추가
            </button>
          </div>
          <div
            style={{
              background: C.bgInput,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {draft.steps.map((s, i) => (
              <div
                key={s._key}
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "6px 12px",
                  alignItems: "center",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: 12,
                    color: C.textMuted,
                    width: 24,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <input
                  value={s.text}
                  onChange={(e) => setStep_(i, e.target.value)}
                  style={{ ...input, padding: "6px 8px", flex: 1 }}
                />
                <button
                  onClick={() => delStep_(i)}
                  style={{
                    background: "none",
                    border: "none",
                    color: C.red,
                    cursor: "pointer",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* 저장 */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 24,
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => {
                setStep(1);
                setDraft(null);
              }}
              style={btnGhost}
            >
              취소
            </button>
            <button onClick={handleSave} style={btnPrimary}>
              DB에 저장
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── 레시피 목록 ───── */
function RecipeList({ recipes, onUpdate, onDelete }) {
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const startEdit = (r) => {
    setEditId(r.id);
    setEditDraft({
      ...r,
      ingredients: (r.ingredients || []).map((ing, i) => ({
        _key: i,
        ...ing,
      })),
      steps: (r.steps || []).map((s, i) => ({
        _key: i,
        text: typeof s === "string" ? s : s.text,
      })),
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditDraft(null);
  };

  const saveEdit = () => {
    const updated = {
      ...editDraft,
      ingredients: editDraft.ingredients.map(({ name, amount, group }) => ({
        name,
        amount,
        group,
      })),
      steps: editDraft.steps.map((s) => s.text),
    };
    delete updated._key;
    onUpdate(updated);
    cancelEdit();
  };

  const setField = (k, v) => setEditDraft((d) => ({ ...d, [k]: v }));
  const setIng = (idx, k, v) =>
    setEditDraft((d) => ({
      ...d,
      ingredients: d.ingredients.map((ing, i) =>
        i === idx ? { ...ing, [k]: v } : ing,
      ),
    }));
  const addIng = () =>
    setEditDraft((d) => ({
      ...d,
      ingredients: [
        ...d.ingredients,
        { _key: Date.now(), name: "", amount: "", group: "" },
      ],
    }));
  const delIng = (idx) =>
    setEditDraft((d) => ({
      ...d,
      ingredients: d.ingredients.filter((_, i) => i !== idx),
    }));
  const setStepText = (idx, v) =>
    setEditDraft((d) => ({
      ...d,
      steps: d.steps.map((s, i) => (i === idx ? { ...s, text: v } : s)),
    }));
  const addStep = () =>
    setEditDraft((d) => ({
      ...d,
      steps: [...d.steps, { _key: Date.now(), text: "" }],
    }));
  const delStep = (idx) =>
    setEditDraft((d) => ({
      ...d,
      steps: d.steps.filter((_, i) => i !== idx),
    }));

  return (
    <div>
      <h2 style={{ color: C.textBright, fontSize: 20, margin: "0 0 20px" }}>
        레시피 목록 ({recipes.length})
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {recipes.map((r) => {
          const isEditing = editId === r.id;

          if (isEditing && editDraft) {
            return (
              <div
                key={r.id}
                style={{
                  background: C.bgInput,
                  border: `1px solid ${C.accent}`,
                  borderRadius: 10,
                  padding: 20,
                }}
              >
                {/* 기본 정보 편집 */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  {[
                    ["title", "제목"],
                    ["channel", "채널"],
                    ["category", "카테고리"],
                    ["time", "시간"],
                    ["difficulty", "난이도"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: C.textMuted,
                          marginBottom: 4,
                        }}
                      >
                        {label}
                      </label>
                      <input
                        value={editDraft[key] || ""}
                        onChange={(e) => setField(key, e.target.value)}
                        style={{ ...input, padding: "6px 8px" }}
                      />
                    </div>
                  ))}
                </div>

                {/* 재료 편집 */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>
                    재료
                  </span>
                  <button onClick={addIng} style={{ ...btnGhost, padding: "3px 10px", fontSize: 11 }}>
                    + 추가
                  </button>
                </div>
                {editDraft.ingredients.map((ing, i) => (
                  <div
                    key={ing._key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 80px 80px 28px",
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <input
                      value={ing.name}
                      onChange={(e) => setIng(i, "name", e.target.value)}
                      style={{ ...input, padding: "4px 6px", fontSize: 12 }}
                    />
                    <input
                      value={ing.amount}
                      onChange={(e) => setIng(i, "amount", e.target.value)}
                      style={{ ...input, padding: "4px 6px", fontSize: 12 }}
                    />
                    <input
                      value={ing.group || ""}
                      onChange={(e) => setIng(i, "group", e.target.value)}
                      placeholder="분류"
                      style={{ ...input, padding: "4px 6px", fontSize: 12 }}
                    />
                    <button
                      onClick={() => delIng(i)}
                      style={{
                        background: "none",
                        border: "none",
                        color: C.red,
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* 조리 단계 편집 */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    margin: "14px 0 8px",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>
                    조리 단계
                  </span>
                  <button onClick={addStep} style={{ ...btnGhost, padding: "3px 10px", fontSize: 11 }}>
                    + 추가
                  </button>
                </div>
                {editDraft.steps.map((s, i) => (
                  <div
                    key={s._key}
                    style={{
                      display: "flex",
                      gap: 6,
                      marginBottom: 4,
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: C.textMuted,
                        width: 20,
                        textAlign: "right",
                        fontFamily: "var(--mono, monospace)",
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <input
                      value={s.text}
                      onChange={(e) => setStepText(i, e.target.value)}
                      style={{ ...input, padding: "4px 6px", fontSize: 12, flex: 1 }}
                    />
                    <button
                      onClick={() => delStep(i)}
                      style={{
                        background: "none",
                        border: "none",
                        color: C.red,
                        cursor: "pointer",
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 16,
                    justifyContent: "flex-end",
                  }}
                >
                  <button onClick={cancelEdit} style={btnGhost}>
                    취소
                  </button>
                  <button onClick={saveEdit} style={btnPrimary}>
                    저장
                  </button>
                </div>
              </div>
            );
          }

          /* 일반 행 */
          return (
            <div
              key={r.id}
              style={{
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "14px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ color: C.textBright, fontSize: 14, fontWeight: 600 }}>
                  {r.title}
                </span>
                <span style={{ marginLeft: 10, fontSize: 12, color: C.textMuted }}>
                  {r.channel || r.category} · {r.time} · {r.difficulty}
                  {r.ingredients && ` · 재료 ${r.ingredients.length}개`}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => startEdit(r)} style={btnGhost}>
                  수정
                </button>
                <button onClick={() => onDelete(r.id)} style={btnDanger}>
                  삭제
                </button>
              </div>
            </div>
          );
        })}

        {recipes.length === 0 && (
          <p style={{ color: C.textMuted, fontSize: 13, textAlign: "center", padding: 40 }}>
            등록된 레시피가 없습니다
          </p>
        )}
      </div>
    </div>
  );
}

/* ───── DB 초기화 ───── */
function ResetDB({ onReset }) {
  const [confirm, setConfirm] = useState(false);

  return (
    <div>
      <h2 style={{ color: C.textBright, fontSize: 20, margin: "0 0 20px" }}>
        DB 초기화
      </h2>
      <div
        style={{
          background: C.redBg,
          border: `1px solid ${C.red}`,
          borderRadius: 10,
          padding: 24,
        }}
      >
        <p style={{ color: C.red, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          주의: 모든 레시피가 기본 데이터로 초기화됩니다
        </p>
        <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>
          현재 저장된 레시피가 삭제되고 기본 레시피 {DEFAULT_RECIPES.length}개로 복원됩니다.
        </p>

        {!confirm ? (
          <button onClick={() => setConfirm(true)} style={btnDanger}>
            초기화 진행
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: C.red, fontSize: 13 }}>정말 초기화합니까?</span>
            <button
              onClick={() => {
                onReset();
                setConfirm(false);
              }}
              style={{ ...btnPrimary, background: C.red }}
            >
              확인, 초기화
            </button>
            <button onClick={() => setConfirm(false)} style={btnGhost}>
              취소
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── 메인 AdminPage ───── */
const NAV_ITEMS = [
  { key: "dashboard", icon: "📊", label: "대시보드" },
  { key: "add", icon: "➕", label: "레시피 추가" },
  { key: "list", icon: "📋", label: "레시피 목록" },
  { key: "reset", icon: "🔄", label: "DB 초기화" },
];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [nav, setNav] = useState("dashboard");

  const login = () => {
    setAuthed(true);
    setRecipes(loadRecipes());
  };

  const persist = (list) => {
    saveRecipes(list);
    setRecipes(list);
  };

  const handleAdd = (recipe) => {
    persist([recipe, ...recipes]);
    setNav("list");
  };

  const handleUpdate = (updated) => {
    persist(recipes.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleDelete = (id) => {
    persist(recipes.filter((r) => r.id !== id));
  };

  const handleReset = () => {
    persist([...DEFAULT_RECIPES]);
  };

  if (!authed) return <LoginGate onAuth={login} />;

  const ingredientCount = getAllIngredients(recipes).length;

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg }}>
      {/* 좌측 네비 */}
      <nav
        style={{
          width: 220,
          minWidth: 220,
          background: C.bgSide,
          borderRight: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          padding: "20px 0",
        }}
      >
        <div
          style={{
            padding: "0 20px 20px",
            fontSize: 16,
            fontWeight: 700,
            color: C.accent,
            borderBottom: `1px solid ${C.border}`,
            marginBottom: 8,
          }}
        >
          🛠 Admin
        </div>

        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => setNav(item.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 20px",
              border: "none",
              background: nav === item.key ? C.accentBg : "transparent",
              color: nav === item.key ? C.accent : C.text,
              fontSize: 13,
              fontWeight: nav === item.key ? 600 : 400,
              cursor: "pointer",
              textAlign: "left",
              borderRight:
                nav === item.key ? `2px solid ${C.accent}` : "2px solid transparent",
            }}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <div
          style={{
            padding: "16px 20px",
            borderTop: `1px solid ${C.border}`,
            fontSize: 11,
            color: C.textMuted,
            lineHeight: 1.6,
          }}
        >
          레시피 {recipes.length}개<br />
          재료 {ingredientCount}개
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 32,
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 28,
            paddingBottom: 16,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <span style={{ fontSize: 12, color: C.textMuted }}>
            {NAV_ITEMS.find((n) => n.key === nav)?.icon}{" "}
            {NAV_ITEMS.find((n) => n.key === nav)?.label}
          </span>
          <div
            style={{
              display: "flex",
              gap: 16,
              fontSize: 12,
              fontFamily: "var(--mono, monospace)",
            }}
          >
            <span style={{ color: C.accent }}>
              {recipes.length} recipes
            </span>
            <span style={{ color: C.green }}>
              {ingredientCount} ingredients
            </span>
          </div>
        </div>

        {nav === "dashboard" && <Dashboard recipes={recipes} />}
        {nav === "add" && <AddRecipe onSave={handleAdd} />}
        {nav === "list" && (
          <RecipeList
            recipes={recipes}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
        {nav === "reset" && <ResetDB onReset={handleReset} />}
      </main>
    </div>
  );
}
