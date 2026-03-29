const STORAGE_KEY = "whattocook_recipes";

const DEFAULT_RECIPES = [
  {
    id: "default-1",
    title: "김치찌개",
    category: "한식",
    time: "30분",
    difficulty: "쉬움",
    ingredients: [
      { name: "김치", amount: "1컵" },
      { name: "돼지고기 목살", amount: "150g" },
      { name: "두부", amount: "1/2모" },
      { name: "대파", amount: "1대" },
      { name: "고춧가루", amount: "1큰술" },
      { name: "다진 마늘", amount: "1큰술" },
      { name: "간장", amount: "1큰술" },
    ],
    steps: [
      "돼지고기를 한입 크기로 썰어 냄비에 볶는다.",
      "김치를 넣고 함께 볶는다.",
      "물 2컵을 붓고 끓인다.",
      "고춧가루, 다진 마늘, 간장으로 간한다.",
      "두부를 넣고 5분 더 끓인다.",
      "대파를 송송 썰어 올린다.",
    ],
  },
  {
    id: "default-2",
    title: "된장찌개",
    category: "한식",
    time: "25분",
    difficulty: "쉬움",
    ingredients: [
      { name: "된장", amount: "2큰술" },
      { name: "두부", amount: "1/2모" },
      { name: "애호박", amount: "1/3개" },
      { name: "양파", amount: "1/4개" },
      { name: "대파", amount: "1대" },
      { name: "청양고추", amount: "1개" },
      { name: "다진 마늘", amount: "1작은술" },
      { name: "멸치 육수", amount: "2컵" },
    ],
    steps: [
      "멸치 육수를 끓인다.",
      "된장을 풀어 넣는다.",
      "애호박, 양파를 썰어 넣는다.",
      "두부를 깍둑 썰어 넣는다.",
      "다진 마늘을 넣고 10분 끓인다.",
      "대파, 청양고추를 송송 썰어 올린다.",
    ],
  },
  {
    id: "default-3",
    title: "계란볶음밥",
    category: "한식",
    time: "15분",
    difficulty: "쉬움",
    ingredients: [
      { name: "밥", amount: "1공기" },
      { name: "계란", amount: "2개" },
      { name: "대파", amount: "1대" },
      { name: "당근", amount: "1/4개" },
      { name: "간장", amount: "1큰술" },
      { name: "참기름", amount: "1작은술" },
      { name: "소금", amount: "약간" },
      { name: "식용유", amount: "2큰술" },
    ],
    steps: [
      "당근, 대파를 잘게 다진다.",
      "팬에 식용유를 두르고 계란을 스크램블한다.",
      "당근을 넣고 볶는다.",
      "밥을 넣고 센 불에서 볶는다.",
      "간장, 소금으로 간한다.",
      "대파, 참기름을 넣고 마무리한다.",
    ],
  },
  {
    id: "default-4",
    title: "제육볶음",
    category: "한식",
    time: "30분",
    difficulty: "보통",
    ingredients: [
      { name: "돼지고기 앞다리살", amount: "300g" },
      { name: "고추장", amount: "2큰술" },
      { name: "고춧가루", amount: "1큰술" },
      { name: "간장", amount: "1큰술" },
      { name: "설탕", amount: "1큰술" },
      { name: "다진 마늘", amount: "1큰술" },
      { name: "양파", amount: "1/2개" },
      { name: "대파", amount: "1대" },
      { name: "참기름", amount: "1작은술" },
    ],
    steps: [
      "돼지고기를 얇게 썬다.",
      "고추장, 고춧가루, 간장, 설탕, 다진 마늘로 양념을 만든다.",
      "고기에 양념을 넣고 10분 재운다.",
      "팬에 양파와 함께 센 불에서 볶는다.",
      "고기가 익으면 대파를 넣는다.",
      "참기름을 두르고 마무리한다.",
    ],
  },
  {
    id: "default-5",
    title: "순두부찌개",
    category: "한식",
    time: "20분",
    difficulty: "쉬움",
    ingredients: [
      { name: "순두부", amount: "1봉" },
      { name: "계란", amount: "1개" },
      { name: "바지락", amount: "1/2컵" },
      { name: "고춧가루", amount: "1큰술" },
      { name: "다진 마늘", amount: "1작은술" },
      { name: "간장", amount: "1작은술" },
      { name: "대파", amount: "1대" },
      { name: "참기름", amount: "1작은술" },
    ],
    steps: [
      "뚝배기에 참기름을 두르고 다진 마늘, 고춧가루를 볶는다.",
      "물 1컵과 바지락을 넣고 끓인다.",
      "순두부를 넣고 간장으로 간한다.",
      "계란을 올린다.",
      "대파를 송송 썰어 올린다.",
    ],
  },
  {
    id: "default-6",
    title: "닭볶음탕",
    category: "한식",
    time: "45분",
    difficulty: "보통",
    ingredients: [
      { name: "닭", amount: "1마리" },
      { name: "감자", amount: "2개" },
      { name: "당근", amount: "1/2개" },
      { name: "양파", amount: "1개" },
      { name: "대파", amount: "2대" },
      { name: "고추장", amount: "2큰술" },
      { name: "고춧가루", amount: "2큰술" },
      { name: "간장", amount: "3큰술" },
      { name: "다진 마늘", amount: "1큰술" },
      { name: "설탕", amount: "1큰술" },
    ],
    steps: [
      "닭을 토막 내어 끓는 물에 데친다.",
      "감자, 당근, 양파를 큼직하게 썬다.",
      "고추장, 고춧가루, 간장, 설탕, 다진 마늘로 양념을 만든다.",
      "냄비에 닭과 채소를 넣고 양념, 물 2컵을 붓는다.",
      "센 불에서 끓인 뒤 중불로 줄여 20분 조린다.",
      "대파를 넣고 5분 더 끓인다.",
    ],
  },
  {
    id: "default-7",
    title: "잡채",
    category: "한식",
    time: "40분",
    difficulty: "보통",
    ingredients: [
      { name: "당면", amount: "200g" },
      { name: "시금치", amount: "1줌" },
      { name: "당근", amount: "1/2개" },
      { name: "양파", amount: "1/2개" },
      { name: "표고버섯", amount: "3개" },
      { name: "소고기", amount: "100g" },
      { name: "간장", amount: "3큰술" },
      { name: "설탕", amount: "1큰술" },
      { name: "참기름", amount: "2큰술" },
    ],
    steps: [
      "당면을 삶아 물기를 빼고 참기름을 버무린다.",
      "시금치를 데쳐 간장, 참기름으로 무친다.",
      "당근, 양파, 표고버섯을 채 썰어 각각 볶는다.",
      "소고기를 간장, 설탕에 재워 볶는다.",
      "모든 재료를 큰 볼에 넣고 간장, 참기름으로 버무린다.",
    ],
  },
  {
    id: "default-8",
    title: "해물파전",
    category: "한식",
    time: "25분",
    difficulty: "보통",
    ingredients: [
      { name: "부침가루", amount: "1컵" },
      { name: "물", amount: "1컵" },
      { name: "대파", amount: "3대" },
      { name: "오징어", amount: "1/2마리" },
      { name: "새우", amount: "5마리" },
      { name: "계란", amount: "1개" },
      { name: "소금", amount: "약간" },
      { name: "식용유", amount: "넉넉히" },
    ],
    steps: [
      "부침가루, 물, 계란, 소금을 섞어 반죽을 만든다.",
      "대파를 길게 썰고 오징어, 새우를 손질한다.",
      "팬에 식용유를 넉넉히 두른다.",
      "반죽을 얇게 펴고 대파와 해물을 올린다.",
      "중불에서 앞뒤로 바삭하게 부친다.",
    ],
  },
  {
    id: "default-9",
    title: "파스타 까르보나라",
    category: "양식",
    time: "20분",
    difficulty: "보통",
    ingredients: [
      { name: "스파게티 면", amount: "200g" },
      { name: "베이컨", amount: "100g" },
      { name: "계란 노른자", amount: "3개" },
      { name: "파르메산 치즈", amount: "1/2컵" },
      { name: "마늘", amount: "3쪽" },
      { name: "올리브유", amount: "2큰술" },
      { name: "후추", amount: "넉넉히" },
      { name: "소금", amount: "약간" },
    ],
    steps: [
      "끓는 소금물에 스파게티를 삶는다.",
      "계란 노른자, 파르메산 치즈, 후추를 섞어 소스를 만든다.",
      "팬에 올리브유를 두르고 마늘, 베이컨을 볶는다.",
      "삶은 면과 면수 약간을 팬에 넣고 섞는다.",
      "불을 끄고 계란 소스를 넣어 빠르게 섞는다.",
      "후추를 뿌려 마무리한다.",
    ],
  },
  {
    id: "default-10",
    title: "된장 삼겹살 구이",
    category: "한식",
    time: "25분",
    difficulty: "쉬움",
    ingredients: [
      { name: "삼겹살", amount: "300g" },
      { name: "된장", amount: "1큰술" },
      { name: "다진 마늘", amount: "1작은술" },
      { name: "맛술", amount: "1큰술" },
      { name: "후추", amount: "약간" },
      { name: "상추", amount: "한줌" },
      { name: "쌈장", amount: "적당량" },
    ],
    steps: [
      "된장, 다진 마늘, 맛술, 후추를 섞어 양념을 만든다.",
      "삼겹살에 양념을 골고루 바른다.",
      "팬이나 그릴에서 앞뒤로 노릇하게 굽는다.",
      "먹기 좋은 크기로 썬다.",
      "상추와 쌈장을 곁들여 낸다.",
    ],
  },
];

// --- 저장/불러오기 ---

export function loadRecipes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_RECIPES];
    const parsed = JSON.parse(raw);
    return parsed.length ? parsed : [...DEFAULT_RECIPES];
  } catch {
    return [...DEFAULT_RECIPES];
  }
}

export function saveRecipes(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
}

// --- 매칭/유사도 ---

function normalize(name) {
  return name.trim().replace(/\s+/g, "").toLowerCase();
}

function ingredientSet(recipe) {
  return new Set((recipe.ingredients || []).map((i) => normalize(i.name)));
}

export function computeMatch(recipe, selectedSet) {
  const recipeSet = ingredientSet(recipe);
  const matched = [];
  const missing = [];

  for (const name of recipeSet) {
    if (selectedSet.has(name)) {
      matched.push(name);
    } else {
      missing.push(name);
    }
  }

  const score = recipeSet.size === 0 ? 0 : matched.length / recipeSet.size;
  return { score, matched, missing };
}

export function computeSimilarity(r1, r2) {
  const set1 = ingredientSet(r1);
  const set2 = ingredientSet(r2);

  const shared = [];
  const onlyIn1 = [];
  const onlyIn2 = [];

  for (const name of set1) {
    if (set2.has(name)) shared.push(name);
    else onlyIn1.push(name);
  }
  for (const name of set2) {
    if (!set1.has(name)) onlyIn2.push(name);
  }

  const unionSize = set1.size + set2.size - shared.length;
  const jaccard = unionSize === 0 ? 0 : shared.length / unionSize;

  return { jaccard, shared, onlyIn1, onlyIn2 };
}

// --- 유틸 ---

export function getAllIngredients(recipes) {
  const set = new Set();
  for (const r of recipes) {
    for (const i of r.ingredients || []) {
      set.add(i.name.trim());
    }
  }
  return [...set].sort();
}

export function getAllCategories(recipes) {
  const set = new Set();
  for (const r of recipes) {
    if (r.category) set.add(r.category.trim());
  }
  return [...set].sort();
}

export { DEFAULT_RECIPES };
