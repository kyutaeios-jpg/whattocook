const API_URL = import.meta.env.VITE_API_URL || "";

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
