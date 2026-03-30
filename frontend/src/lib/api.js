const API_URL = import.meta.env.VITE_API_URL || "";

// ── 레시피 CRUD ──

export async function fetchRecipes() {
  const res = await fetch(`${API_URL}/api/recipes`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createRecipe(recipe) {
  const res = await fetch(`${API_URL}/api/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recipe),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "서버 오류" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateRecipe(id, recipe) {
  const res = await fetch(`${API_URL}/api/recipes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recipe),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteRecipeApi(id) {
  const res = await fetch(`${API_URL}/api/recipes/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteAllRecipesApi() {
  const res = await fetch(`${API_URL}/api/recipes`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── 재료 카테고리 분류 ──

export async function fetchCachedCategories() {
  const res = await fetch(`${API_URL}/api/ingredients/cached-categories`);
  if (!res.ok) return {};
  return res.json();
}

export async function classifyIngredients(names) {
  const res = await fetch(`${API_URL}/api/ingredients/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ names }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── 동의어 사전 ──

export async function fetchSynonyms() {
  const res = await fetch(`${API_URL}/api/ingredients/synonyms`);
  if (!res.ok) return {};
  return res.json();
}

// ── 재료 카테고리 관리 ──

export async function fetchIngredientCategories() {
  const res = await fetch(`${API_URL}/api/ingredients/categories`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateIngredientCategories(updates) {
  const res = await fetch(`${API_URL}/api/ingredients/categories`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── 동의어 관리 ──

export async function saveSynonyms(mappings) {
  const res = await fetch(`${API_URL}/api/ingredients/synonyms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mappings }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function suggestSynonyms() {
  const res = await fetch(`${API_URL}/api/ingredients/suggest-synonyms`, { method: "POST" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteSynonyms() {
  const res = await fetch(`${API_URL}/api/ingredients/synonyms`, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function cleanupIngredients() {
  const res = await fetch(`${API_URL}/api/ingredients/cleanup`, { method: "POST" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── 단건 추출 ──

export async function extractRecipe(url) {
  const res = await fetch(`${API_URL}/api/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "서버 오류" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── 채널 전체 추출 (비동기 작업) ──

export async function startChannelExtract(url) {
  const res = await fetch(`${API_URL}/api/extract/channel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "서버 오류" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json(); // { jobId }
}

export async function getJobStatus(jobId) {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function cancelJob(jobId) {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}/cancel`, { method: "POST" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
