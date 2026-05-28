// Service worker: chrome.downloads 로 Markdown 파일을 내려받는다.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === "download" && typeof msg.md === "string") {
    const url =
      "data:text/markdown;charset=utf-8," + encodeURIComponent(msg.md);
    chrome.downloads.download(
      {
        url,
        filename: msg.filename || "inflearn-subtitles/subtitle.md",
        saveAs: false,
      },
      (id) => {
        sendResponse({ ok: !chrome.runtime.lastError, id });
      }
    );
    return true; // 비동기 응답
  }
});
