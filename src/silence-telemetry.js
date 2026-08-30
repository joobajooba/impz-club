const BLOCKED = /pulse\.walletconnect\.org/i;

function requestUrl(input) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  if (input && typeof input === "object" && "url" in input) return String(input.url);
  return "";
}

function isBlocked(input) {
  return BLOCKED.test(requestUrl(input));
}

const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  if (isBlocked(input)) {
    return Promise.resolve(new Response(null, { status: 204, statusText: "No Content" }));
  }
  return nativeFetch(input, init);
};

if (navigator.sendBeacon) {
  const nativeBeacon = navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = (url, data) => {
    if (BLOCKED.test(String(url))) return true;
    return nativeBeacon(url, data);
  };
}
