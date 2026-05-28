// ISOLATED world: MAIN world 가 보낸 자막을 받아 Markdown 으로 변환·저장·다운로드 한다.
(() => {
  const MARK = "inflearn-subtitle-capture";

  window.addEventListener("message", (ev) => {
    if (ev.source !== window) return;
    const d = ev.data;
    if (!d || d.__src !== MARK || !d.payload) return;
    handle(d.payload);
  });

  function videoIdFromUrl(url) {
    const m = /\/videos\/([0-9a-f-]+)\//.exec(url || "");
    return m ? m[1] : "unknown";
  }

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
        .slice(0, 80) || "inflearn-subtitle"
    );
  }

  function toMarkdown(p) {
    const vid = videoIdFromUrl(p.url);
    const segs = Array.isArray(p.segments) ? p.segments : [];
    const title = sanitize(p.title);
    const lines = segs.map(
      (s) => `[${ts(s.start)}] ${String(s.text || "").trim()}`
    );
    const header = [
      `# ${title}`,
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
    return { title, vid, md: header.concat(lines).join("\n") + "\n", count: segs.length };
  }

  function handle(p) {
    const r = toMarkdown(p);
    chrome.storage.local.get({ items: [] }, ({ items }) => {
      const rec = { vid: r.vid, title: r.title, count: r.count, md: r.md, at: Date.now() };
      const idx = items.findIndex((it) => it.vid === r.vid);
      if (idx >= 0) items[idx] = rec;
      else items.unshift(rec);
      chrome.storage.local.set({ items: items.slice(0, 30) });
    });
    showButton(r);
  }

  function showButton(r) {
    let btn = document.getElementById("inflearn-sub-dl-btn");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "inflearn-sub-dl-btn";
      Object.assign(btn.style, {
        position: "fixed",
        right: "20px",
        bottom: "20px",
        zIndex: "2147483647",
        padding: "10px 14px",
        background: "#1dc078",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,.25)",
      });
      (document.body || document.documentElement).appendChild(btn);
    }
    btn.textContent = `📄 자막 MD 다운로드 (${r.count})`;
    btn.onclick = () => {
      chrome.runtime.sendMessage({
        action: "download",
        md: r.md,
        filename: `inflearn-subtitles/${r.title}.md`,
      });
      btn.textContent = "✓ 저장됨";
      setTimeout(() => {
        btn.textContent = `📄 자막 MD 다운로드 (${r.count})`;
      }, 1500);
    };
  }
})();
