function fmtDate(ms) {
  try {
    return new Date(ms).toLocaleString("ko-KR");
  } catch (e) {
    return "";
  }
}

function render(items) {
  const list = document.getElementById("list");
  list.innerHTML = "";
  if (!items || !items.length) {
    const div = document.createElement("div");
    div.className = "empty";
    div.textContent =
      "아직 캡처된 자막이 없습니다. 인프런 강의 페이지에서 스크립트(자막) 패널을 열면 자동으로 잡힙니다.";
    list.appendChild(div);
    return;
  }
  items.forEach((it) => {
    const row = document.createElement("div");
    row.className = "row";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = it.title;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${it.count}개 세그먼트 · ${fmtDate(it.at)}`;

    const dl = document.createElement("button");
    dl.className = "dl";
    dl.textContent = "MD 다운로드";
    dl.onclick = () =>
      chrome.runtime.sendMessage({ action: "download", vid: it.vid });

    const cp = document.createElement("button");
    cp.className = "cp";
    cp.textContent = "복사";
    cp.onclick = async () => {
      try {
        await navigator.clipboard.writeText(it.md);
        cp.textContent = "복사됨";
      } catch (e) {
        cp.textContent = "실패";
      }
      setTimeout(() => (cp.textContent = "복사"), 1200);
    };

    row.append(t, meta, dl, cp);
    list.appendChild(row);
  });
}

chrome.storage.local.get({ items: [] }, ({ items }) => render(items));

document.getElementById("clear").onclick = () => {
  chrome.storage.local.set({ items: [] }, () => render([]));
};
