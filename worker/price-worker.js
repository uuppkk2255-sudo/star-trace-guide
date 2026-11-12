// STAR TRACE 가이드 가격 서버 (Cloudflare Workers 무료 플랜용)
// 환경변수(Settings > Variables)에 APP_KEY, APP_SECRET, TRACKING_ID 를 넣어주세요.
// 알리 제휴(Portals) 가입 후 발급받는 값입니다. 요청 규격은 알리 Open Platform 문서와 한 번 대조해 주세요.

// 페이지의 모델 이름 : 알리 상품 ID (상품 페이지 주소의 숫자)
const PRODUCTS = {
  "CCA MX1": "상품ID_입력",
  "KZ AZ15": "상품ID_입력",
  "KZ AZ09 Pro": "상품ID_입력",
};

const CACHE_SECONDS = 60 * 60 * 3; // 3시간마다 새로 조회

async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function fetchAliPrices(env) {
  const ids = Object.values(PRODUCTS).join(",");
  const params = {
    method: "aliexpress.affiliate.productdetail.get",
    app_key: env.APP_KEY,
    timestamp: Date.now().toString(),
    sign_method: "sha256",
    product_ids: ids,
    target_currency: "KRW",
    target_language: "KO",
    ship_to_country: "KR",
    tracking_id: env.TRACKING_ID,
  };
  const base = Object.keys(params).sort().map(k => k + params[k]).join("");
  params.sign = await hmacSha256Hex(env.APP_SECRET, base);

  const res = await fetch("https://api-sg.aliexpress.com/sync?" + new URLSearchParams(params));
  const json = await res.json();
  const list =
    json?.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.products?.product || [];

  const byId = {};
  for (const p of list) byId[String(p.product_id)] = p;

  const items = {};
  for (const [name, id] of Object.entries(PRODUCTS)) {
    const p = byId[id];
    if (!p) continue;
    items[name] = {
      price: Math.round(Number(p.target_sale_price || p.target_app_sale_price)),
      url: p.promotion_link || p.product_detail_url,
    };
  }
  return { updatedAt: new Date().toISOString(), items };
}

export default {
  async fetch(request, env, ctx) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json; charset=utf-8",
    };
    const cache = caches.default;
    const cacheKey = new Request(new URL(request.url).origin + "/prices");

    let res = await cache.match(cacheKey);
    if (res) return new Response(res.body, { headers: cors });

    try {
      const data = await fetchAliPrices(env);
      res = new Response(JSON.stringify(data), {
        headers: { ...cors, "Cache-Control": `max-age=${CACHE_SECONDS}` },
      });
      ctx.waitUntil(cache.put(cacheKey, res.clone()));
      return res;
    } catch (e) {
      return new Response(JSON.stringify({ error: "price_fetch_failed" }), { status: 502, headers: cors });
    }
  },
};
