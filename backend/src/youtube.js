const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const YT_API = "https://www.googleapis.com/youtube/v3";

// ── YouTube ID 추출 ──

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be"))
      return u.pathname.slice(1).split("/")[0];
    if (u.searchParams.has("v")) return u.searchParams.get("v");
    const match = u.pathname.match(/\/(shorts|embed|live|v)\/([^/?]+)/);
    if (match) return match[2];
  } catch {}
  return null;
}

function extractPlaylistId(url) {
  try {
    const u = new URL(url);
    return u.searchParams.get("list") || null;
  } catch {}
  return null;
}

function extractChannelIdentifier(url) {
  try {
    const u = new URL(url);
    const match = u.pathname.match(
      /\/(channel\/([^/?]+)|@([^/?]+)|c\/([^/?]+))/
    );
    if (match) {
      if (match[2]) return { type: "id", value: decodeURIComponent(match[2]) };
      if (match[3]) return { type: "handle", value: decodeURIComponent(match[3]) };
      if (match[4]) return { type: "custom", value: decodeURIComponent(match[4]) };
    }
  } catch {}
  return null;
}

// ── 영상 메타데이터 + 설명란 ──

async function getVideoInfo(videoId) {
  const res = await fetch(
    `${YT_API}/videos?part=snippet&id=${videoId}&key=${YT_API_KEY}`
  );
  const data = await res.json();
  if (!data.items?.length) return null;
  const s = data.items[0].snippet;
  return {
    videoId,
    title: s.title,
    channel: s.channelTitle,
    description: s.description || "",
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: s.thumbnails?.high?.url || s.thumbnails?.default?.url,
  };
}

// ── 채널 → 전체 영상 ID 목록 ──

async function resolveChannelId(identifier) {
  if (identifier.type === "id") return identifier.value;

  // handle(@...) → forHandle 파라미터로 직접 조회 (정확 + 쿼터 1)
  if (identifier.type === "handle") {
    const handleRes = await fetch(
      `${YT_API}/channels?part=id&forHandle=${encodeURIComponent(identifier.value)}&key=${YT_API_KEY}`
    );
    const handleData = await handleRes.json();
    if (handleData.items?.length) return handleData.items[0].id;
  }

  // fallback: search API
  const q =
    identifier.type === "handle"
      ? `@${identifier.value}`
      : identifier.value;

  const res = await fetch(
    `${YT_API}/search?part=snippet&q=${encodeURIComponent(q)}&type=channel&maxResults=1&key=${YT_API_KEY}`
  );
  const data = await res.json();
  if (!data.items?.length) return null;
  return data.items[0].snippet.channelId;
}

async function getUploadsPlaylistId(channelId) {
  const res = await fetch(
    `${YT_API}/channels?part=contentDetails&id=${channelId}&key=${YT_API_KEY}`
  );
  const data = await res.json();
  if (!data.items?.length) return null;
  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

async function getAllVideoIds(playlistId, onProgress) {
  const ids = [];
  let pageToken = "";
  let page = 0;

  do {
    const url = `${YT_API}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${YT_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      console.error("YouTube API error:", data.error.message);
      break;
    }

    for (const item of data.items || []) {
      ids.push({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        description: item.snippet.description || "",
        thumbnail: item.snippet.thumbnails?.high?.url || "",
      });
    }

    page++;
    if (onProgress) onProgress(ids.length, data.pageInfo?.totalResults || 0);

    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return ids;
}

async function getChannelVideos(url, onProgress) {
  const identifier = extractChannelIdentifier(url);
  if (!identifier) throw new Error("유효한 채널 URL이 아닙니다.");

  const channelId = await resolveChannelId(identifier);
  if (!channelId) throw new Error("채널을 찾을 수 없습니다.");

  const playlistId = await getUploadsPlaylistId(channelId);
  if (!playlistId) throw new Error("업로드 목록을 찾을 수 없습니다.");

  return getAllVideoIds(playlistId, onProgress);
}

module.exports = {
  extractVideoId,
  extractPlaylistId,
  extractChannelIdentifier,
  getVideoInfo,
  getChannelVideos,
  getAllVideoIds,
};
