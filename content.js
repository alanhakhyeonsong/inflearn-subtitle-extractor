// 콘텐츠 스크립트: 백그라운드가 자막을 캡처하면 우하단에 다운로드 버튼을 띄운다.
console.log("[inflearn-sub] content script loaded");

function showButton(vid, title, count) {
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
  const label = `📄 자막 MD 다운로드 (${count})`;
  btn.textContent = label;
  btn.onclick = () => {
    chrome.runtime.sendMessage({ action: "download", vid });
    btn.textContent = "✓ 저장됨";
    setTimeout(() => {
      btn.textContent = label;
    }, 1500);
  };
}

// 캡처가 콘텐츠 스크립트 로드보다 먼저 끝난 경우 대비: 로드 직후 한 번 조회
chrome.runtime.sendMessage({ action: "getButton" }, (resp) => {
  if (chrome.runtime.lastError) return;
  if (resp && resp.rec) showButton(resp.rec.vid, resp.rec.title, resp.rec.count);
});

// 캡처가 로드 이후 발생한 경우: 백그라운드 푸시 수신
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "inflearn-show-button") {
    showButton(msg.vid, msg.title, msg.count);
  }
});
