# STAR TRACE 이어폰 무선·음질 가이드

굿즈 인이어 이어폰의 블루투스 모듈·음질 정보를 정리한 비공식 팬 페이지.

## 폴더 구조
- `site/index.html` : 가이드 페이지 (GitHub Pages / Vercel / Netlify에 그대로 배포)
- `worker/price-worker.js` : 알리 제휴 API로 가격을 가져오는 가격 서버 (Cloudflare Workers)
- `worker/wrangler.toml` : 워커 배포 설정

## 배포 순서
1. `site/` 폴더를 정적 호스팅에 배포
2. 알리 제휴(Portals) 가입 → APP_KEY, APP_SECRET, TRACKING_ID 발급
3. `worker/price-worker.js`의 `PRODUCTS`에 상품 ID 입력
4. `cd worker` → `npx wrangler secret put APP_KEY` (APP_SECRET, TRACKING_ID도 동일)
5. `npx wrangler deploy` → 나온 주소를 `site/index.html`의 `PRICE_API_URL`에 입력

## 주의
- 비밀 키는 절대 커밋하지 않기 (`.gitignore`에 `.dev.vars` 포함)
- 제휴 링크 사용 시 페이지 하단 광고 표기 유지
