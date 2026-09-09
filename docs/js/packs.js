// Loading story packs. Content is plain JSON so a chapter can be rewritten
// without touching any JavaScript.

const ROOT = 'content/packs';

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${res.status} loading ${url}`);
  return res.json();
}

export function loadPack(packId) {
  return getJSON(`${ROOT}/${packId}/pack.json`);
}

export function loadChapter(packId, chapterId) {
  return getJSON(`${ROOT}/${packId}/chapters/${chapterId}.json`);
}

export function trackUrl(packId, chapterId) {
  return `${ROOT}/${packId}/audio/${chapterId}.mp3`;
}

/**
 * A built chapter ships a timeline file next to its mp3. Its presence is how we
 * decide between the two playback modes: timeline found -> real audio track,
 * nothing found -> device text-to-speech fallback.
 */
export async function loadTimeline(packId, chapterId) {
  try {
    const res = await fetch(`${ROOT}/${packId}/audio/${chapterId}.timeline.json`, { cache: 'no-cache' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
