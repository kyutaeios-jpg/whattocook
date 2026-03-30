import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  fetchRecipes,
  extractRecipe,
  startChannelExtract,
  getJobStatus,
  cancelJob,
  updateRecipe as updateRecipeApi,
  deleteRecipeApi,
  deleteAllRecipesApi,
  fetchSynonyms,
  saveSynonyms,
  deleteSynonyms,
  suggestSynonyms,
  cleanupIngredients,
  fetchIngredientCategories,
  updateIngredientCategories,
} from "../lib/api";

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
  yellow: "#ecc94b",
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

  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        onAuth();
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }
    } catch {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } finally {
      setLoading(false);
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
        <button type="submit" disabled={loading} style={{ ...btnPrimary, width: "100%", opacity: loading ? 0.6 : 1 }}>
          {loading ? "확인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}

/* ───── 대시보드 ───── */
function Dashboard({ recipes }) {
  const ingredientCount = useMemo(() => {
    const set = new Set();
    for (const r of recipes) {
      for (const i of r.ingredients || []) set.add(i.name?.trim());
    }
    return set.size;
  }, [recipes]);

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
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color,
          fontFamily: "var(--mono, monospace)",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
        {label}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h2 style={{ color: C.textBright, fontSize: 20, margin: 0 }}>
        대시보드
      </h2>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Stat label="등록 레시피" value={recipes.length} color={C.accent} />
        <Stat label="색인 재료" value={ingredientCount} color={C.green} />
        <Stat label="카테고리" value={cats.length} color={C.accentLight} />
      </div>

      <div style={{ background: C.bgInput, borderRadius: 10, padding: 20 }}>
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
            <span style={{ width: 60, fontSize: 13, color: C.text }}>
              {cat}
            </span>
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

/* ───── 레시피 추가 (큐 기반) ───── */
function AddRecipe({ onRefresh }) {
  const [urlInput, setUrlInput] = useState("");
  const [queue, setQueue] = useState([]); // [{id, url, type, status, progress, error, skipLog}]
  const [processing, setProcessing] = useState(false);
  const pollRef = useRef(null);

  const addToQueue = (e) => {
    e.preventDefault();
    const urls = urlInput.split("\n").map((u) => u.trim()).filter(Boolean);
    const newItems = urls.map((u) => {
      const isChannel = u.includes("/@") || u.includes("/channel/") || u.includes("/c/") || u.includes("list=");
      return {
        id: Date.now() + Math.random(),
        url: u,
        type: isChannel ? "channel" : "video",
        status: "pending", // pending | processing | done | error | cancelled
        progress: null,
        result: null,
        error: null,
        skipLog: [],
      };
    });
    setQueue((prev) => [...prev, ...newItems]);
    setUrlInput("");
  };

  const removeFromQueue = (id) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const cancelCurrent = async () => {
    const current = queue.find((q) => q.status === "processing");
    if (current?.jobId) {
      try { await cancelJob(current.jobId); } catch {}
    }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setQueue((prev) => prev.map((q) =>
      q.status === "processing" ? { ...q, status: "cancelled", progress: null } : q
    ));
    setProcessing(false);
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((q) => q.status === "pending" || q.status === "processing"));
  };

  // 큐 자동 처리
  useEffect(() => {
    if (processing) return;
    const next = queue.find((q) => q.status === "pending");
    if (!next) return;

    setProcessing(true);
    setQueue((prev) => prev.map((q) => q.id === next.id ? { ...q, status: "processing" } : q));

    if (next.type === "video") {
      // 단건 처리
      extractRecipe(next.url)
        .then((data) => {
          setQueue((prev) => prev.map((q) => q.id === next.id ? { ...q, status: "done", result: data } : q));
          onRefresh();
        })
        .catch((err) => {
          setQueue((prev) => prev.map((q) => q.id === next.id ? { ...q, status: "error", error: err.message } : q));
        })
        .finally(() => setProcessing(false));
    } else {
      // 채널 처리 — 비동기 작업 시작 + 폴링
      startChannelExtract(next.url)
        .then(({ jobId }) => {
          setQueue((prev) => prev.map((q) => q.id === next.id ? { ...q, jobId } : q));

          // 2초마다 상태 폴링
          pollRef.current = setInterval(async () => {
            try {
              const job = await getJobStatus(jobId);
              setQueue((prev) => prev.map((q) => {
                if (q.id !== next.id) return q;
                return {
                  ...q,
                  progress: {
                    total: job.total,
                    processed: job.processed,
                    saved: job.saved,
                    skipped: job.skipped,
                    duplicates: job.duplicates,
                    current: job.current,
                    currentStatus: job.currentStatus,
                  },
                  skipLog: job.skipLog || [],
                };
              }));

              if (job.status === "done" || job.status === "error" || job.status === "cancelled") {
                clearInterval(pollRef.current);
                pollRef.current = null;
                setQueue((prev) => prev.map((q) =>
                  q.id === next.id ? { ...q, status: job.status === "error" ? "error" : job.status === "cancelled" ? "cancelled" : "done", error: job.error } : q
                ));
                onRefresh();
                setProcessing(false);
              }
            } catch {
              // 폴링 실패는 무시 — 다음 폴링에서 재시도
            }
          }, 2000);
        })
        .catch((err) => {
          setQueue((prev) => prev.map((q) => q.id === next.id ? { ...q, status: "error", error: err.message } : q));
          setProcessing(false);
        });
    }
  }, [queue, processing, onRefresh]);

  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const processingItem = queue.find((q) => q.status === "processing");

  const statusIcon = (s) => ({ pending: "⏳", processing: "🔄", done: "✅", error: "❌", cancelled: "⛔" }[s] || "");
  const statusLabel = (s) => ({ pending: "대기", processing: "처리 중", done: "완료", error: "에러", cancelled: "취소" }[s] || "");

  return (
    <div>
      <h2 style={{ color: C.textBright, fontSize: 20, margin: "0 0 20px" }}>레시피 추가</h2>

      {/* URL 입력 (여러 줄) */}
      <form onSubmit={addToQueue} style={{ marginBottom: 20 }}>
        <textarea
          placeholder={"YouTube URL을 한 줄에 하나씩 입력하세요\n\n예시:\nhttps://youtube.com/watch?v=...\nhttps://youtube.com/@채널명\nhttps://youtube.com/watch?v=..."}
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          rows={4}
          style={{ ...input, resize: "vertical", marginBottom: 10, fontFamily: "var(--mono, monospace)", fontSize: 12, lineHeight: 1.6 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={!urlInput.trim()} style={{ ...btnPrimary, opacity: urlInput.trim() ? 1 : 0.5 }}>
            큐에 추가 ({urlInput.split("\n").filter((u) => u.trim()).length || 0}개)
          </button>
          {processingItem && (
            <button type="button" onClick={cancelCurrent} style={btnDanger}>현재 작업 중지</button>
          )}
          {queue.some((q) => q.status === "done" || q.status === "error" || q.status === "cancelled") && (
            <button type="button" onClick={clearCompleted} style={btnGhost}>완료 항목 정리</button>
          )}
        </div>
      </form>

      {/* 큐 상태 요약 */}
      {queue.length > 0 && (
        <div style={{ display: "flex", gap: 16, fontSize: 13, marginBottom: 16, padding: "10px 14px", background: C.bgInput, borderRadius: 8, border: `1px solid ${C.border}` }}>
          <span style={{ color: C.textMuted }}>전체 {queue.length}</span>
          {pendingCount > 0 && <span style={{ color: C.yellow }}>대기 {pendingCount}</span>}
          {processingItem && <span style={{ color: C.accent }}>처리 중 1</span>}
          <span style={{ color: C.green }}>완료 {queue.filter((q) => q.status === "done").length}</span>
          {queue.filter((q) => q.status === "error").length > 0 && (
            <span style={{ color: C.red }}>에러 {queue.filter((q) => q.status === "error").length}</span>
          )}
        </div>
      )}

      {/* 큐 항목 리스트 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {queue.map((item) => (
          <div key={item.id} style={{
            background: item.status === "processing" ? C.accentBg : C.bgCard,
            border: `1px solid ${item.status === "processing" ? C.accent : C.border}`,
            borderRadius: 10, padding: 14, overflow: "hidden",
          }}>
            {/* 헤더 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 16 }}>{statusIcon(item.status)}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: item.type === "channel" ? C.accentBg : C.bgInput, color: item.type === "channel" ? C.accent : C.textMuted, fontWeight: 600 }}>
                  {item.type === "channel" ? "채널" : "영상"}
                </span>
                <span style={{ fontSize: 12, color: C.textBright, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--mono, monospace)" }}>
                  {item.url.replace(/https?:\/\/(www\.)?youtube\.com\//, "").replace(/https?:\/\/youtu\.be\//, "")}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: C.textMuted }}>{statusLabel(item.status)}</span>
                {item.status === "pending" && (
                  <button onClick={() => removeFromQueue(item.id)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 14 }}>✕</button>
                )}
              </div>
            </div>

            {/* 처리 중 — 진행 상황 */}
            {item.status === "processing" && item.progress && (
              <div style={{ marginTop: 8 }}>
                {item.progress.total > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textMuted, marginBottom: 4 }}>
                      <span>{item.progress.processed || 0} / {item.progress.total}</span>
                      <span>{Math.round(((item.progress.processed || 0) / item.progress.total) * 100)}%</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: C.border, overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ width: `${((item.progress.processed || 0) / item.progress.total) * 100}%`, height: "100%", background: C.accent, borderRadius: 3, transition: "width .3s" }} />
                    </div>
                    <div style={{ display: "flex", gap: 14, fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: C.green }}>저장 {item.progress.saved || 0}</span>
                      <span style={{ color: C.yellow }}>중복 {item.progress.duplicates || 0}</span>
                      <span style={{ color: C.red }}>스킵 {item.progress.skipped || 0}</span>
                    </div>
                  </>
                )}
                <p style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic" }}>
                  {item.progress.currentStatus === "ok" ? "✅" : item.progress.currentStatus === "duplicate" ? "⏭️" : item.progress.currentStatus === "skip" ? "⏩" : "🔄"}{" "}
                  {item.progress.current || "준비 중…"}
                </p>
              </div>
            )}

            {/* 처리 중 — 단건 */}
            {item.status === "processing" && !item.progress && (
              <p style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic", marginTop: 4 }}>레시피 추출 중…</p>
            )}

            {/* 완료 — 단건 결과 */}
            {item.status === "done" && item.result && !item.progress && (
              <div style={{ marginTop: 4, fontSize: 12 }}>
                {item.result.status === "ok" && <span style={{ color: C.green }}>✅ {item.result.recipe?.title} — 재료 {item.result.recipe?.ingredients?.length || 0}개</span>}
                {item.result.status === "duplicate" && <span style={{ color: C.yellow }}>중복: {item.result.recipe?.title}</span>}
                {item.result.status === "skip" && <span style={{ color: C.red }}>건너뜀: {item.result.reason}</span>}
              </div>
            )}

            {/* 완료 — 채널 결과 */}
            {item.status === "done" && item.progress && (
              <div style={{ marginTop: 6, display: "flex", gap: 14, fontSize: 12 }}>
                <span style={{ color: C.green }}>저장 {item.progress.saved || 0}</span>
                <span style={{ color: C.yellow }}>중복 {item.progress.duplicates || 0}</span>
                <span style={{ color: C.red }}>스킵 {item.progress.skipped || 0}</span>
                <span style={{ color: C.textMuted }}>총 {item.progress.processed || 0}개 처리</span>
              </div>
            )}

            {/* 에러 */}
            {item.status === "error" && (
              <p style={{ fontSize: 12, color: C.red, marginTop: 4 }}>{item.error}</p>
            )}

            {/* 건너뜀 로그 (접기) */}
            {item.skipLog?.length > 0 && <SkipLogPanel logs={item.skipLog} />}
          </div>
        ))}
      </div>

      {/* 안내 */}
      {queue.length === 0 && (
        <div style={{ marginTop: 20, padding: 16, background: C.bgCard, borderRadius: 8, border: `1px solid ${C.border}` }}>
          <h4 style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>사용법</h4>
          <ul style={{ color: C.text, fontSize: 12, lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
            <li>영상 URL, 채널 URL을 자유롭게 섞어서 입력하세요</li>
            <li>한 줄에 하나씩, 여러 개를 한번에 입력할 수 있습니다</li>
            <li>채널 URL은 자동 감지됩니다 (@채널명, /channel/...)</li>
            <li>설명란에 재료 정보가 없는 영상은 자동으로 건너뜁니다</li>
            <li>영상당 30초 타임아웃이 적용됩니다</li>
            <li>이미 등록된 영상은 중복 처리되지 않습니다</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function SkipLogPanel({ logs }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen((v) => !v)} style={{ ...btnGhost, padding: "3px 10px", fontSize: 11 }}>
        {open ? "▲" : "▼"} 건너뜀 로그 ({logs.length})
      </button>
      {open && (
        <div style={{ maxHeight: 150, overflowY: "auto", marginTop: 6 }}>
          {logs.map((log, i) => (
            <div key={i} style={{ fontSize: 11, padding: "4px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textBright }}>{log.title}</span>
              <span style={{ color: C.textMuted, flexShrink: 0, marginLeft: 8 }}>{log.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── 레시피 목록 ───── */
function RecipeList({ recipes, onRefresh }) {
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

  const saveEdit = async () => {
    const updated = {
      ...editDraft,
      ingredients: editDraft.ingredients.map(({ name, amount, group }) => ({
        name,
        amount,
        group,
      })),
      steps: editDraft.steps.map((s) => s.text),
    };
    await updateRecipeApi(editId, updated);
    cancelEdit();
    onRefresh();
  };

  const handleDelete = async (id) => {
    await deleteRecipeApi(id);
    onRefresh();
  };

  const setField = (k, v) => setEditDraft((d) => ({ ...d, [k]: v }));
  const setIng = (idx, k, v) =>
    setEditDraft((d) => ({
      ...d,
      ingredients: d.ingredients.map((ing, i) =>
        i === idx ? { ...ing, [k]: v } : ing
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

                {/* 재료 */}
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
                  <button
                    onClick={addIng}
                    style={{ ...btnGhost, padding: "3px 10px", fontSize: 11 }}
                  >
                    + 추가
                  </button>
                </div>
                {editDraft.ingredients.map((ing, i) => (
                  <div
                    key={ing._key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 80px 28px",
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

                {/* 조리 단계 */}
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
                  <button
                    onClick={addStep}
                    style={{ ...btnGhost, padding: "3px 10px", fontSize: 11 }}
                  >
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
                      style={{
                        ...input,
                        padding: "4px 6px",
                        fontSize: 12,
                        flex: 1,
                      }}
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
              <div style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    color: C.textBright,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {r.title}
                </span>
                <span
                  style={{ marginLeft: 10, fontSize: 12, color: C.textMuted }}
                >
                  {r.channel} · {r.category} · 재료{" "}
                  {r.ingredients?.length || 0}개
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => startEdit(r)} style={btnGhost}>
                  수정
                </button>
                <button onClick={() => handleDelete(r.id)} style={btnDanger}>
                  삭제
                </button>
              </div>
            </div>
          );
        })}

        {recipes.length === 0 && (
          <p
            style={{
              color: C.textMuted,
              fontSize: 13,
              textAlign: "center",
              padding: 40,
            }}
          >
            등록된 레시피가 없습니다
          </p>
        )}
      </div>
    </div>
  );
}

/* ───── 동의어 AI 자동 감지 ───── */
function SynonymSuggestions({ onAccept }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(new Set());

  const detect = async () => {
    setLoading(true);
    setSuggestions([]);
    setChecked(new Set());
    try {
      const { suggestions: items } = await suggestSynonyms();
      // 대표명 기준 오름차순 정렬
      const sorted = (items || []).sort((a, b) => a.canonical.localeCompare(b.canonical, "ko"));
      setSuggestions(sorted);
      setChecked(new Set(sorted.map((_, i) => i)));
    } catch (err) {
      alert("에러: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (i) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const updateSuggestion = (i, field, value) => {
    setSuggestions((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const removeSuggestion = (i) => {
    setSuggestions((prev) => prev.filter((_, idx) => idx !== i));
    setChecked((prev) => {
      const next = new Set();
      for (const v of prev) {
        if (v < i) next.add(v);
        else if (v > i) next.add(v - 1);
      }
      return next;
    });
  };

  const acceptChecked = () => {
    const accepted = suggestions.filter((_, i) => checked.has(i)).filter((s) => s.alias.trim() && s.canonical.trim());
    if (!accepted.length) return;
    onAccept(accepted);
    setSuggestions([]);
    setChecked(new Set());
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: suggestions.length ? 12 : 0 }}>
        <button onClick={detect} disabled={loading} style={{ ...btnPrimary, background: "#8b5cf6", opacity: loading ? 0.6 : 1 }}>
          {loading ? "AI 분석 중..." : "🤖 동의어 자동 감지"}
        </button>
        {suggestions.length > 0 && (
          <>
            <span style={{ fontSize: 12, color: C.textMuted }}>{suggestions.length}개 후보 / {checked.size}개 선택</span>
            <button onClick={() => setChecked(new Set(suggestions.map((_, i) => i)))} style={btnGhost}>전체 선택</button>
            <button onClick={() => setChecked(new Set())} style={btnGhost}>전체 해제</button>
            <button onClick={acceptChecked} style={{ ...btnPrimary }}>
              {checked.size}개 승인
            </button>
          </>
        )}
      </div>

      {suggestions.length > 0 && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 24px 1fr 32px", gap: 6, padding: "8px 12px", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
            <span></span><span>별칭</span><span></span><span>대표명</span><span></span>
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {suggestions.map((s, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "32px 1fr 24px 1fr 32px", gap: 6,
                padding: "5px 12px", borderBottom: `1px solid ${C.border}`, alignItems: "center",
                background: checked.has(i) ? C.accentBg : "transparent",
              }}>
                <span onClick={() => toggleCheck(i)} style={{ cursor: "pointer", fontSize: 16, textAlign: "center" }}>
                  {checked.has(i) ? "✅" : "⬜"}
                </span>
                <input value={s.alias} onChange={(e) => updateSuggestion(i, "alias", e.target.value)}
                  style={{ ...input, padding: "3px 6px", fontSize: 12 }} />
                <span style={{ color: C.textMuted, textAlign: "center", fontSize: 11 }}>→</span>
                <input value={s.canonical} onChange={(e) => updateSuggestion(i, "canonical", e.target.value)}
                  style={{ ...input, padding: "3px 6px", fontSize: 12 }} />
                <button onClick={() => removeSuggestion(i)}
                  style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 13 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── 재료 관리 (카테고리 + 동의어 통합) ───── */
const CATEGORIES = ["육류", "해산물", "채소", "과일", "견과류", "양념/소스", "곡물/면/두부", "유제품/계란", "액체/육수", "가공식품", "기타"];

function IngredientManager() {
  const [tab, setTab] = useState("category"); // "category" | "synonym"

  // ── 카테고리 ──
  const [catData, setCatData] = useState({});
  const [catChanges, setCatChanges] = useState({});
  const [catLoading, setCatLoading] = useState(true);
  const [catSaving, setCatSaving] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  // ── 동의어 ──
  const [synList, setSynList] = useState([]);
  const [synLoading, setSynLoading] = useState(true);
  const [synSaving, setSynSaving] = useState(false);
  const [synSearch, setSynSearch] = useState("");
  const [newAlias, setNewAlias] = useState("");
  const [newCanonical, setNewCanonical] = useState("");

  useEffect(() => {
    fetchIngredientCategories().then(setCatData).catch(console.error).finally(() => setCatLoading(false));
    fetchSynonyms().then((d) => setSynList(Object.entries(d).map(([alias, canonical], i) => ({ _key: i, alias, canonical })))).catch(console.error).finally(() => setSynLoading(false));
  }, []);

  // ── 카테고리 로직 ──
  const allIngredients = useMemo(() => {
    const list = [];
    for (const [cat, items] of Object.entries(catData)) {
      for (const item of items) {
        const changes = catChanges[item.name] || {};
        list.push({
          ...item,
          currentCat: changes.category || item.category || cat,
          currentSub: changes.subcategory !== undefined ? changes.subcategory : (item.subcategory || ""),
        });
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [catData, catChanges]);

  const catFiltered = useMemo(() => {
    let list = allIngredients;
    if (catSearch.trim()) list = list.filter((i) => i.name.toLowerCase().includes(catSearch.trim().toLowerCase()));
    if (filterCat !== "all") list = list.filter((i) => i.currentCat === filterCat);
    return list;
  }, [allIngredients, catSearch, filterCat]);

  const catChangedCount = Object.keys(catChanges).length;

  const saveCatChanges = async () => {
    const updates = Object.entries(catChanges).map(([name, val]) => ({
      name, category: val.category, subcategory: val.subcategory,
    }));
    if (!updates.length) return;
    setCatSaving(true);
    try {
      await updateIngredientCategories(updates);
      setCatChanges({});
      const fresh = await fetchIngredientCategories();
      setCatData(fresh);
      alert(updates.length + "개 카테고리 저장 완료");
    } catch (err) { alert("에러: " + err.message); }
    finally { setCatSaving(false); }
  };

  // ── 동의어 로직 ──
  const synFiltered = synSearch.trim()
    ? synList.filter((r) => r.alias.includes(synSearch) || r.canonical.includes(synSearch))
    : synList;

  const addSynonym = () => {
    if (!newAlias.trim() || !newCanonical.trim()) return;
    setSynList((prev) => [...prev, { _key: Date.now(), alias: newAlias.trim(), canonical: newCanonical.trim() }]);
    setNewAlias(""); setNewCanonical("");
  };

  const saveSynChanges = async () => {
    setSynSaving(true);
    try {
      await deleteSynonyms();
      const mappings = {};
      for (const r of synList) { if (r.alias.trim() && r.canonical.trim()) mappings[r.alias.trim()] = r.canonical.trim(); }
      if (Object.keys(mappings).length) await saveSynonyms(mappings);
      alert(`${Object.keys(mappings).length}개 동의어 저장 완료. 소급 적용은 백그라운드에서 진행됩니다.`);
      // 소급 적용은 비동기 — 응답 기다리지 않음
      cleanupIngredients().then((r) => console.log("소급 적용:", r.fixed, "개")).catch(console.error);
    } catch (err) { alert("에러: " + err.message); }
    finally { setSynSaving(false); }
  };

  const loading = catLoading || synLoading;
  if (loading) return <p style={{ color: C.textMuted }}>로딩 중...</p>;

  return (
    <div>
      <h2 style={{ color: C.textBright, fontSize: 20, margin: "0 0 16px" }}>재료 관리</h2>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[{ key: "category", label: `카테고리 (${allIngredients.length})` }, { key: "synonym", label: `동의어 (${synList.length})` }].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: "8px 20px", borderRadius: 6, border: "none",
            background: tab === key ? C.accent : "transparent",
            color: tab === key ? "#fff" : C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>{label}</button>
        ))}
      </div>

      {/* ── 카테고리 탭 ── */}
      {tab === "category" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <input type="text" placeholder="재료 검색..." value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              style={{ ...input, flex: 1, minWidth: 150, maxWidth: 250 }} />
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
              style={{ ...input, width: "auto", cursor: "pointer" }}>
              <option value="all">전체</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c} ({allIngredients.filter((i) => i.currentCat === c).length})</option>
              ))}
            </select>
          </div>

          {catChangedCount > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{catChangedCount}개 변경됨</span>
              <button onClick={saveCatChanges} disabled={catSaving} style={{ ...btnPrimary, opacity: catSaving ? 0.6 : 1 }}>
                {catSaving ? "저장 중..." : "저장"}
              </button>
              <button onClick={() => setCatChanges({})} style={btnGhost}>되돌리기</button>
            </div>
          )}

          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 110px 110px", gap: 6, padding: "8px 12px", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
              <span>재료명</span><span>수</span><span>카테고리</span><span>서브카테고리</span>
            </div>
            <div style={{ maxHeight: 450, overflowY: "auto" }}>
              {catFiltered.map((item) => (
                <div key={item.name} style={{
                  display: "grid", gridTemplateColumns: "1fr 40px 110px 110px", gap: 6,
                  padding: "4px 12px", borderBottom: `1px solid ${C.border}`, alignItems: "center",
                  background: catChanges[item.name] ? C.accentBg : "transparent",
                }}>
                  <span style={{ fontSize: 13, color: C.textBright }}>{item.name}</span>
                  <span style={{ fontSize: 12, color: C.textMuted, fontFamily: "var(--mono, monospace)", textAlign: "center" }}>{item.count}</span>
                  <select value={item.currentCat} onChange={(e) => setCatChanges((p) => ({
                    ...p, [item.name]: { category: e.target.value, subcategory: (p[item.name]?.subcategory !== undefined ? p[item.name].subcategory : item.currentSub) }
                  }))} style={{ ...input, padding: "2px 4px", fontSize: 11, cursor: "pointer" }}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input value={item.currentSub} onChange={(e) => setCatChanges((p) => ({
                    ...p, [item.name]: { category: (p[item.name]?.category || item.currentCat), subcategory: e.target.value }
                  }))} placeholder="서브카테고리"
                    style={{ ...input, padding: "2px 6px", fontSize: 11 }} />
                </div>
              ))}
              {catFiltered.length === 0 && <p style={{ color: C.textMuted, fontSize: 12, textAlign: "center", padding: 20 }}>결과 없음</p>}
            </div>
          </div>
        </>
      )}

      {/* ── 동의어 탭 ── */}
      {tab === "synonym" && (
        <>
          {/* AI 자동 감지 */}
          <SynonymSuggestions onAccept={(items) => {
            setSynList((prev) => [...prev, ...items.map((s, i) => ({ _key: Date.now() + i, alias: s.alias, canonical: s.canonical }))]);
          }} />

          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <input value={newAlias} onChange={(e) => setNewAlias(e.target.value)}
              placeholder="별칭 (예: 달걀)" style={{ ...input, flex: 1 }} />
            <span style={{ color: C.textMuted, flexShrink: 0 }}>→</span>
            <input value={newCanonical} onChange={(e) => setNewCanonical(e.target.value)}
              placeholder="대표명 (예: 계란)" style={{ ...input, flex: 1 }} />
            <button onClick={addSynonym} style={btnPrimary}>추가</button>
          </div>

          <input type="text" placeholder="검색..." value={synSearch}
            onChange={(e) => setSynSearch(e.target.value)}
            style={{ ...input, marginBottom: 12, maxWidth: 250 }} />

          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 24px 1fr 32px", gap: 6, padding: "8px 12px", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
              <span>별칭</span><span></span><span>대표명</span><span></span>
            </div>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {synFiltered.map((r) => (
                <div key={r._key} style={{ display: "grid", gridTemplateColumns: "1fr 24px 1fr 32px", gap: 6, padding: "5px 12px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
                  <input value={r.alias} onChange={(e) => setSynList((prev) => prev.map((x) => x._key === r._key ? { ...x, alias: e.target.value } : x))}
                    style={{ ...input, padding: "3px 6px", fontSize: 12 }} />
                  <span style={{ color: C.textMuted, textAlign: "center", fontSize: 11 }}>→</span>
                  <input value={r.canonical} onChange={(e) => setSynList((prev) => prev.map((x) => x._key === r._key ? { ...x, canonical: e.target.value } : x))}
                    style={{ ...input, padding: "3px 6px", fontSize: 12 }} />
                  <button onClick={() => setSynList((prev) => prev.filter((x) => x._key !== r._key))}
                    style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 13 }}>✕</button>
                </div>
              ))}
              {synFiltered.length === 0 && <p style={{ color: C.textMuted, fontSize: 12, textAlign: "center", padding: 16 }}>{synSearch.trim() ? "결과 없음" : "동의어 없음"}</p>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveSynChanges} disabled={synSaving} style={{ ...btnPrimary, opacity: synSaving ? 0.6 : 1 }}>
              {synSaving ? "저장 중..." : "저장 및 소급 적용"}
            </button>
            <button onClick={async () => {
              if (!confirm("모든 동의어를 삭제합니까?")) return;
              await deleteSynonyms(); setSynList([]);
              const r = await cleanupIngredients();
              alert("전체 삭제. " + r.fixed + "개 레시피 업데이트");
            }} style={btnDanger}>전체 초기화</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ───── DB 초기화 ───── */
function ResetDB({ onRefresh }) {
  const [confirm, setConfirm] = useState(false);

  const handleReset = async () => {
    await deleteAllRecipesApi();
    setConfirm(false);
    onRefresh();
  };

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
        <p
          style={{
            color: C.red,
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          주의: 모든 레시피가 삭제됩니다
        </p>
        <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>
          현재 DB에 저장된 모든 레시피 데이터가 영구 삭제됩니다.
        </p>

        {!confirm ? (
          <button onClick={() => setConfirm(true)} style={btnDanger}>
            초기화 진행
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: C.red, fontSize: 13 }}>
              정말 초기화합니까?
            </span>
            <button
              onClick={handleReset}
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
  { key: "ingredients", icon: "🏷️", label: "재료 관리" },
  { key: "reset", icon: "🔄", label: "DB 초기화" },
];

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("admin_authed") === "1");
  const [recipes, setRecipes] = useState([]);
  const [nav, setNav] = useState("dashboard");

  const loadFromDB = useCallback(async () => {
    try {
      const data = await fetchRecipes();
      setRecipes(data);
    } catch (err) {
      console.error("Failed to load recipes:", err);
    }
  }, []);

  const login = () => {
    setAuthed(true);
    sessionStorage.setItem("admin_authed", "1");
  };

  useEffect(() => {
    if (authed) loadFromDB();
  }, [authed, loadFromDB]);

  if (!authed) return <LoginGate onAuth={login} />;

  const ingredientCount = (() => {
    const set = new Set();
    for (const r of recipes) {
      for (const i of r.ingredients || []) set.add(i.name?.trim());
    }
    return set.size;
  })();

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg }}>
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
                nav === item.key
                  ? `2px solid ${C.accent}`
                  : "2px solid transparent",
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
          레시피 {recipes.length}개
          <br />
          재료 {ingredientCount}개
        </div>
      </nav>

      <main style={{ flex: 1, overflowY: "auto", padding: 32 }}>
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
            <span style={{ color: C.accent }}>{recipes.length} recipes</span>
            <span style={{ color: C.green }}>
              {ingredientCount} ingredients
            </span>
          </div>
        </div>

        {nav === "dashboard" && <Dashboard recipes={recipes} />}
        {nav === "add" && <AddRecipe onRefresh={loadFromDB} />}
        {nav === "list" && (
          <RecipeList recipes={recipes} onRefresh={loadFromDB} />
        )}
        {nav === "ingredients" && <IngredientManager />}
        {nav === "reset" && <ResetDB onRefresh={loadFromDB} />}
      </main>
    </div>
  );
}
