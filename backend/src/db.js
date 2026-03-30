const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// 테이블 생성
async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipes (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title       TEXT NOT NULL,
      channel     TEXT,
      category    TEXT,
      time        TEXT,
      difficulty  TEXT,
      youtube_id  TEXT,
      url         TEXT,
      ingredients JSONB DEFAULT '[]',
      steps       JSONB DEFAULT '[]',
      created_at  TIMESTAMPTZ DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_youtube_id
    ON recipes (youtube_id) WHERE youtube_id IS NOT NULL;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ingredient_categories (
      name        TEXT PRIMARY KEY,
      category    TEXT NOT NULL,
      subcategory TEXT
    );
  `);
  // subcategory 컬럼 추가 (기존 테이블에 없을 수 있음)
  await pool.query(`
    ALTER TABLE ingredient_categories ADD COLUMN IF NOT EXISTS subcategory TEXT;
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ingredient_synonyms (
      alias     TEXT PRIMARY KEY,
      canonical TEXT NOT NULL
    );
  `);
  console.log("DB migration done");
}

// 동의어
async function getSynonyms() {
  const { rows } = await pool.query("SELECT alias, canonical FROM ingredient_synonyms");
  const map = {};
  for (const r of rows) map[r.alias] = r.canonical;
  return map;
}

async function saveSynonyms(map) {
  for (const [alias, canonical] of Object.entries(map)) {
    await pool.query(
      `INSERT INTO ingredient_synonyms (alias, canonical) VALUES ($1, $2)
       ON CONFLICT (alias) DO UPDATE SET canonical = $2`,
      [alias, canonical]
    );
  }
}

// 기존 재료 목록 (중복 제거)
async function getAllIngredientNames() {
  const { rows } = await pool.query("SELECT DISTINCT jsonb_array_elements(ingredients)->>'name' AS name FROM recipes");
  return [...new Set(rows.map((r) => r.name).filter(Boolean))];
}

// 재료 카테고리 캐시
async function getCachedCategories(names) {
  if (!names.length) return {};
  const { rows } = await pool.query(
    "SELECT name, category, subcategory FROM ingredient_categories WHERE name = ANY($1)",
    [names]
  );
  const map = {};
  for (const r of rows) map[r.name] = { category: r.category, subcategory: r.subcategory || null };
  return map;
}

async function getAllCachedCategories() {
  const { rows } = await pool.query("SELECT name, category, subcategory FROM ingredient_categories");
  const map = {};
  for (const r of rows) map[r.name] = { category: r.category, subcategory: r.subcategory || null };
  return map;
}

async function saveCachedCategories(map) {
  for (const [name, val] of Object.entries(map)) {
    const category = typeof val === "string" ? val : val.category;
    const subcategory = typeof val === "string" ? null : (val.subcategory || null);
    await pool.query(
      `INSERT INTO ingredient_categories (name, category, subcategory) VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET category = $2, subcategory = $3`,
      [name, category, subcategory]
    );
  }
}

// CRUD
async function getAllRecipes() {
  const { rows } = await pool.query(
    "SELECT * FROM recipes ORDER BY created_at DESC"
  );
  return rows.map(toRecipe);
}

async function getRecipeById(id) {
  const { rows } = await pool.query("SELECT * FROM recipes WHERE id = $1", [id]);
  return rows[0] ? toRecipe(rows[0]) : null;
}

async function createRecipe(r) {
  const { rows } = await pool.query(
    `INSERT INTO recipes (title, channel, category, time, difficulty, youtube_id, url, ingredients, steps)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [r.title, r.channel, r.category, r.time, r.difficulty, r.youtubeId, r.url,
     JSON.stringify(r.ingredients || []), JSON.stringify(r.steps || [])]
  );
  return toRecipe(rows[0]);
}

async function updateRecipe(id, r) {
  const { rows } = await pool.query(
    `UPDATE recipes
     SET title=$1, channel=$2, category=$3, time=$4, difficulty=$5,
         youtube_id=$6, url=$7, ingredients=$8, steps=$9
     WHERE id=$10
     RETURNING *`,
    [r.title, r.channel, r.category, r.time, r.difficulty, r.youtubeId, r.url,
     JSON.stringify(r.ingredients || []), JSON.stringify(r.steps || []), id]
  );
  return rows[0] ? toRecipe(rows[0]) : null;
}

async function deleteRecipe(id) {
  await pool.query("DELETE FROM recipes WHERE id = $1", [id]);
}

async function deleteAllRecipes() {
  await pool.query("DELETE FROM recipes");
}

// DB row → API response 변환
function toRecipe(row) {
  return {
    id: row.id,
    title: row.title,
    channel: row.channel,
    category: row.category,
    time: row.time,
    difficulty: row.difficulty,
    youtubeId: row.youtube_id,
    url: row.url,
    ingredients: row.ingredients,
    steps: row.steps,
    createdAt: row.created_at,
  };
}

async function findByYoutubeId(youtubeId) {
  const { rows } = await pool.query(
    "SELECT * FROM recipes WHERE youtube_id = $1",
    [youtubeId]
  );
  return rows[0] ? toRecipe(rows[0]) : null;
}

module.exports = {
  pool,
  migrate,
  getAllRecipes,
  getRecipeById,
  findByYoutubeId,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  deleteAllRecipes,
  getCachedCategories,
  getAllCachedCategories,
  saveCachedCategories,
  getSynonyms,
  saveSynonyms,
  getAllIngredientNames,
};
