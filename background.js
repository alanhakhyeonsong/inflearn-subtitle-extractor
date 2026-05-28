// Service worker:
//  1) webRequest 로 자막(subtitles/json) 요청을 감지
//  2) 같은 서명 URL 을 서비스워커가 직접 한 번 더 받아 JSON 파싱
//  3) Markdown 변환 후 storage 저장 + 콘텐츠 스크립트에 버튼 표시 요청
//  4) chrome.downloads 로 .md 저장
console.log("[inflearn-sub] service worker 로드됨");

const seenUrls = new Set(); // 우리 재요청으로 인한 무한 루프 방지
const lastByTab = {}; // tabId -> 최근 캡처 레코드 (콘텐츠 스크립트 로드 경쟁 대비)

function pad(n) {
  return String(n).padStart(2, "0");
}

function ts(ms) {
  const s = Math.floor((ms || 0) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function sanitize(name) {
  return (
    (name || "inflearn-subtitle")
      .replace(/\s*[-|]\s*인프런.*$/, "")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "inflearn-subtitle"
  );
}

function videoId(url) {
  const m = /\/videos\/([0-9a-f-]+)\//.exec(url || "");
  return m ? m[1] : "unknown";
}

// 탭 URL 의 unitId 로 units API 를 호출해 강의 단위 제목을 얻는다(인증 불필요).
async function fetchUnitTitle(unitId) {
  if (!unitId) return "";
  try {
    const res = await fetch(
      `https://ucc-api.inflearn.com/client/api/v2/units/${unitId}?lang=ko`
    );
    if (!res.ok) return "";
    const j = await res.json();
    const t = j && j.data && j.data.title;
    return t ? String(t).trim() : "";
  } catch (e) {
    return "";
  }
}

function toMarkdown(title, url, segs) {
  const vid = videoId(url);
  const t = sanitize(title);
  const lines = segs.map(
    (s) => `[${ts(s.start)}] ${String(s.text || "").trim()}`
  );
  const header = [
    `# ${t}`,
    "",
    `- 캡처 일시: ${new Date().toISOString()}`,
    `- 영상 ID: ${vid}`,
    `- 세그먼트 수: ${segs.length}`,
    "",
    "> 개인 학습용 자막 추출. 외부 재배포 금지.",
    "",
    "---",
    "",
  ];
  return {
    vid,
    title: t,
    count: segs.length,
    md: header.concat(lines).join("\n") + "\n",
  };
}

chrome.webRequest.onCompleted.addListener(
  (details) => {
    const url = details.url;
    if (!url.includes("subtitles/json")) return;
    if (details.statusCode && details.statusCode !== 200) return;
    if (seenUrls.has(url)) return; // 우리 재요청은 무시
    seenUrls.add(url);
    console.log("[inflearn-sub] 자막 요청 감지:", url.slice(0, 90));
    capture(url, details.tabId);
  },
  { urls: ["*://*.inflearn.com/*"] }
);

async function capture(url, tabId) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("[inflearn-sub] 재요청 실패 status=", res.status);
      return;
    }
    const segs = await res.json();
    if (!Array.isArray(segs) || !segs.length) {
      console.warn("[inflearn-sub] 자막 데이터가 비어있음");
      return;
    }
    let title = "";
    let unitTitle = "";
    try {
      const tab = await chrome.tabs.get(tabId);
      title = (tab && tab.title) || "";
      if (tab && tab.url) {
        const unitId = new URL(tab.url).searchParams.get("unitId");
        unitTitle = await fetchUnitTitle(unitId);
      }
    } catch (e) {}

    // {강의명 _ 학습 페이지} _ {강의 단위 제목}
    const composed = unitTitle ? `${title} _ ${unitTitle}` : title;
    const rec = toMarkdown(composed, url, segs);
    const { items = [] } = await chrome.storage.local.get({ items: [] });
    const idx = items.findIndex((it) => it.vid === rec.vid);
    const full = { ...rec, at: Date.now() };
    if (idx >= 0) items[idx] = full;
    else items.unshift(full);
    await chrome.storage.local.set({ items: items.slice(0, 30) });
    console.log("[inflearn-sub] 캡처 완료:", rec.title, `(${rec.count}개)`);

    if (tabId >= 0) {
      lastByTab[tabId] = rec;
      chrome.tabs
        .sendMessage(tabId, {
          type: "inflearn-show-button",
          vid: rec.vid,
          title: rec.title,
          count: rec.count,
        })
        .catch(() => {}); // 콘텐츠 스크립트 미로드 시 무시 (getButton 으로 보완)
    }
  } catch (e) {
    console.warn("[inflearn-sub] capture 오류:", e);
  }
}

function downloadMd(it, sendResponse) {
  const url = "data:text/markdown;charset=utf-8," + encodeURIComponent(it.md);
  chrome.downloads.download(
    { url, filename: `inflearn-subtitles/${it.title}.md`, saveAs: false },
    (id) => sendResponse({ ok: !chrome.runtime.lastError, id })
  );
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;

  // 콘텐츠 스크립트 로드 시점에 이 탭의 최근 캡처 조회
  if (msg.action === "getButton") {
    const tabId = sender.tab && sender.tab.id;
    sendResponse({ rec: (tabId != null && lastByTab[tabId]) || null });
    return; // 동기 응답
  }

  // vid 로 다운로드 (storage 에서 조회)
  if (msg.action === "download" && msg.vid) {
    chrome.storage.local.get({ items: [] }, ({ items }) => {
      const it = items.find((x) => x.vid === msg.vid);
      if (!it) {
        sendResponse({ ok: false });
        return;
      }
      downloadMd(it, sendResponse);
    });
    return true; // 비동기 응답
  }
});

// 탭 닫힘 시 메모리 정리
chrome.tabs.onRemoved.addListener((tabId) => {
  delete lastByTab[tabId];
});
