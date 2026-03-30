const sharp = require("sharp");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "..", "frontend", "public", "icons");
const PUBLIC_DIR = path.join(__dirname, "..", "frontend", "public");

function createIconSvg(size) {
  const r = Math.round(size * 0.23);
  const fontSize = Math.round(size * 0.62);
  // 이모지를 텍스트가 아닌 중앙 정렬된 형태로 렌더링
  // sharp의 SVG 렌더러는 이모지를 지원하지 않으므로 텍스트 대신 팬 이모지를 직접 그림
  return Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF7043"/>
      <stop offset="100%" stop-color="#D84315"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <!-- 🍳 프라이팬 + 계란 아이콘 -->
  <g transform="translate(${size * 0.5}, ${size * 0.48}) scale(${size / 512})">
    <!-- 팬 몸체 -->
    <circle cx="0" cy="10" r="140" fill="rgba(0,0,0,0.2)"/>
    <circle cx="0" cy="0" r="140" fill="#555"/>
    <circle cx="0" cy="0" r="125" fill="#444"/>
    <circle cx="0" cy="0" r="115" fill="#333"/>
    <!-- 손잡이 -->
    <rect x="120" y="-18" width="110" height="36" rx="18" fill="#666"/>
    <rect x="120" y="-12" width="100" height="24" rx="12" fill="#555"/>
    <!-- 계란 흰자 -->
    <ellipse cx="-10" cy="5" rx="75" ry="65" fill="white" opacity="0.95"/>
    <ellipse cx="20" cy="-25" rx="35" ry="30" fill="white" opacity="0.95"/>
    <ellipse cx="-45" cy="-15" rx="30" ry="28" fill="white" opacity="0.95"/>
    <!-- 계란 노른자 -->
    <circle cx="-5" cy="0" r="35" fill="#FFB300"/>
    <circle cx="-12" cy="-8" r="12" fill="#FFD54F" opacity="0.6"/>
  </g>
</svg>`);
}

async function generate() {
  const sizes = [
    { name: "icon-512x512.png", size: 512 },
    { name: "icon-192x192.png", size: 192 },
    { name: "apple-touch-icon.png", size: 180 },
  ];

  for (const { name, size } of sizes) {
    await sharp(createIconSvg(size))
      .resize(size, size)
      .png()
      .toFile(path.join(OUTPUT_DIR, name));
    console.log(`✓ ${name} (${size}x${size})`);
  }

  // favicon.png (64x64)
  await sharp(createIconSvg(256))
    .resize(64, 64)
    .png()
    .toFile(path.join(PUBLIC_DIR, "favicon.png"));
  console.log("✓ favicon.png (64x64)");

  // favicon-32x32
  await sharp(createIconSvg(256))
    .resize(32, 32)
    .png()
    .toFile(path.join(OUTPUT_DIR, "favicon-32x32.png"));
  console.log("✓ favicon-32x32.png (32x32)");

  console.log("\n아이콘 생성 완료!");
}

generate().catch(console.error);
