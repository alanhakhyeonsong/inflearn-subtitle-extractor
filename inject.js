// MAIN world: 페이지의 fetch / XHR 를 감싸 자막(subtitles/json) 응답을 가로챈다.
(() => {
  const MARK = "inflearn-subtitle-capture";
  const isSub = (url) =>
    typeof url === "string" && url.indexOf("/subtitles/json") !== -1;

  function post(payload) {
    try {
      window.postMessage({ __src: MARK, payload }, "*");
    } catch (e) {}
  }

  // --- fetch 가로채기 ---
  const origFetch = window.fetch;
  if (typeof origFetch === "function") {
    window.fetch = function (...args) {
      const req = args[0];
      const url = typeof req === "string" ? req : req && req.url;
      const promise = origFetch.apply(this, args);
      if (isSub(url)) {
        promise
          .then((res) => res.clone().json())
          .then((segments) =>
            post({ url, title: document.title, segments })
          )
          .catch(() => {});
      }
      return promise;
    };
  }

  // --- XHR 가로채기 ---
  const OrigOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__subUrl = url;
    return OrigOpen.call(this, method, url, ...rest);
  };
  const OrigSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    if (isSub(this.__subUrl)) {
      this.addEventListener("load", function () {
        try {
          const segments = JSON.parse(this.responseText);
          post({ url: this.__subUrl, title: document.title, segments });
        } catch (e) {}
      });
    }
    return OrigSend.apply(this, args);
  };
})();
