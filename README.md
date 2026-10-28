# Shopify CRO Fixer

A modern SaaS-style foundation and a working Shopify conversion-rate optimisation (CRO) audit tool.

The current tool inspects the **initial HTML** of one public page, reads **Shopify's public product JSON** for product pages, renders the **mobile page in an isolated headless browser**, and requests **Google PageSpeed Insights** mobile lab data. It reports only what it can verify. It does not invent conversion scores, claim revenue lift, or replace analytics, customer research, or a full UX review.

**Live production:** <https://shopify-cro-fixer.vercel.app>

## Current status

Phase 3 is implemented:

- Responsive marketing site
- Free live audit at `/audit` with 14 HTML checks plus 7 Shopify product-JSON checks on direct product URLs
- Real product data: images and alt text, variants and options, variant images, price and compare-at presence, description length, product type and tags, and variant availability
- A separate rendered mobile audit in headless Chromium at 390 × 844 with a mobile user agent
- Measured rendered checks: above-the-fold title/price/add-to-cart, add-to-cart size and 44 × 44 tap-target guideline, sticky add-to-cart, image count/alt text/video, variant preselection, price/compare-at/discount badge, horizontal overflow, popup coverage, and a first-screen screenshot
- Heuristic CRO signal detection for trust, shipping and returns, social proof, offers and bundles, urgency, product content, support, and accelerated checkout, each with Detected / Not detected / Unable to verify plus evidence and location
- Honest `Unverified` fallback when Shopify product JSON is disabled, blocked, missing, non-JSON, or too large
- Optional Google PageSpeed Insights mobile lab data in a separate `/api/speed` request, so a slow PSI response never breaks the main audit
- Rule-based High / Medium / Low priority and Easy / Moderate / Advanced effort, explicitly labelled as editorial, not predicted conversion lift
- Two-track Shopify fixes: **For store owners** and **For developers**, with theme snippets labelled as theme-dependent
- A top-of-report Fix plan in priority order
- CRO findings grouped first (Above the fold, Trust and guarantees, Offers and pricing, Social proof, Product content, Mobile usability), with SEO/technical hygiene kept separate at the end
- Failed and warning findings expanded, unverified checks listed separately, and passed checks collapsed into one-line summaries
- Honest result states: passed, warning, failed, and unverified
- Three original CRO guides with local content
- Honest Free / planned Pro pricing page
- SEO metadata, sitemap, robots.txt, and custom 404 page
- Automated tests for URL validation, IP safety, HTML parsing, product JSON parsing, rendered signal detection, rendered checks, render request blocking, PSI parsing, priority rules, result counts, redirects, compression, HTTP/TLS/DNS errors, blocked pages, and client error mapping
- Specific, honest error states for blocked sites, timeouts, missing pages, unsupported content, and non-HTML responses
- Production build, ESLint, and TypeScript checks

There is **no** authentication, database, payment integration, analytics, Chrome extension, or saved reports in this phase. Multi-page scanning is not implemented.

> **Render availability on Vercel:** the code uses `puppeteer-core` with `@sparticuz/chromium` and is configured to run on the Node.js runtime with `maxDuration = 60`. Serverless Chromium is memory- and bundle-sensitive. Verify `/api/render` on the deployed plan; if it cannot run reliably, the static HTML and product JSON report still works and rendered checks are shown as unavailable.


## Pages

| Route | What it does |
| --- | --- |
| `/` | Homepage, audit form, workflow, feature cards, clearly labelled demo report |
| `/audit` | Live audit form, loading/error/empty/success states, detailed findings |
| `/pricing` | Current free plan and clearly labelled planned Pro scope |
| `/blog` | Article index |
| `/blog/shopify-product-page-cro` | Product-page CRO fundamentals |
| `/blog/mobile-ux-shopify-conversions` | Mobile UX problems and review checklist |
| `/blog/trust-signals-checkout` | Trust signals and checkout confidence |
| `/sitemap.xml` | Static sitemap generated from routes and blog content |
| `/robots.txt` | Crawl rules and sitemap location |
| `/api/audit` | POST-only HTML + Shopify product audit API |
| `/api/speed` | POST-only Google PageSpeed Insights proxy, called separately by the report UI |
| `/api/render` | POST-only rendered mobile audit, called separately after the static report |

## Tech stack

- Next.js 16.4.3 (App Router, Turbopack)
- React 19.3.0
- TypeScript 5.9
- Tailwind CSS 4.3
- ESLint 9 with `eslint-config-next`
- `node-html-parser` for safe HTML inspection
- `puppeteer-core` + `@sparticuz/chromium` for the isolated rendered audit
- Node.js `^22.12.0 || ^24.0.0 || >=26.0.0` required (Vitest 5 uses this range); tested with Node.js 24.18.0 and npm 11.16.0

## Run locally

From this folder (`C:\shopify-cro-fixer`):

```powershell
npm install
npm run dev
```

Open <http://localhost:3000> in a browser.

No environment variables are required for local development. The rendered audit uses an installed Chrome or Edge browser if one is found. Set `CHROME_EXECUTABLE_PATH` if auto-detection fails. The speed panel says `Speed data unavailable: PageSpeed API key not configured` until you add a **new** key to `.env.local`.

### Production check

```powershell
npm run check
npm start
```

`npm run check` runs lint, TypeScript, the automated test suite, and a production build. `npm start` requires a successful build first.

### Tests

```powershell
npm test            # Run the suite once
npm run test:watch  # Re-run on file changes
```

The tests use local HTML/JSON fixtures and mocked PSI responses via Vitest. They never contact an external website. The suite currently has 17 files and 221 tests. Coverage includes:

- Public-URL acceptance and SSRF rejection (loopback, private, link-local, reserved, encoded IPs, internal suffixes, unsafe ports)
- Private and reserved IP classification
- HTML parsing: title, description, H1, images, canonical URL, HTTP status, and product signals
- Shopify product JSON: good data, missing alt text, empty/short descriptions, no variants, missing prices, malformed JSON, handle mismatch, oversized JSON, 404/blocked/non-JSON fallbacks, and redirect safety
- Rendered signal detection: trust badges, payment icons, review apps, offers, bundles, urgency, shipping/returns, FAQ/size guide, support, and accelerated checkout
- Rendered checks: above-the-fold positions, tap-target size, sticky bar, image count, variants, discount context, overflow, popup coverage, and the editorial 400-character / 4-image thresholds
- Deterministic priority/effort rules and fix-plan ordering
- Render request security: private/loopback/metadata IPs, mixed DNS answers, bad schemes, credentials, non-standard ports, internal redirects, denied proxy requests, and CONNECT blocking
- Rendered fallback when rendering is disabled, unavailable, or throws a raw error, including safe error wording
- Google PSI parsing with mocked responses: success, missing metrics, missing key, quota/403, timeout, malformed JSON, upstream errors, and the fixed endpoint host
- A check that the PSI API key never appears in a result or route error
- Consistent passed / warning / failed / unverified counts
- The real HTTP client with an injected request function: relative redirects, the four-redirect limit, redirects to loopback/internal hosts, expired deadlines, and invalid initial URLs
- gzip, deflate, and Brotli decoding, unsupported encodings, malformed compressed bodies, and responses that expand beyond 2 MB
- HTTP status classification (401, 403, 404, 410, 429, 5xx) and socket/DNS/TLS failure classification
- Cloudflare/WAF challenge and Shopify password-page detection using local fixtures
- Client error mapping for API errors, non-JSON hosting/proxy responses, network failures, and client timeouts
- Checks that raw Node error text, hostnames, IP addresses, and stack details are not echoed to the browser

The rendered browser itself was **not** exercised in the automated suite, because the tests are required to stay offline. Browser behaviour is verified manually against a public product page when possible.

## Environment variables

| Name | Purpose | Local default |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL used in metadata, sitemap, and robots.txt | `http://localhost:3000` |
| `PAGESPEED_API_KEY` | **Server-only** Google PageSpeed Insights API key. Required for the speed panel. Without it the panel says `Speed data unavailable: PageSpeed API key not configured.` | not set |
| `RENDERED_AUDIT_ENABLED` | Server-only switch for `/api/render`. Blank or `true` enables it; `false`, `0`, or `off` disables the browser and keeps static findings. | blank (enabled) |
| `CHROME_EXECUTABLE_PATH` | Optional local Chrome/Edge path for development. Vercel uses `@sparticuz/chromium`. | not set |

Copy `.env.example` to `.env.local` if you want to override these. Never commit `.env.local` or real secrets. `PAGESPEED_API_KEY` must never be prefixed with `NEXT_PUBLIC_`, because that would expose it to the browser. `.env*` is ignored by Git; confirm with `git check-ignore -v .env.local`.

## Deploying to Vercel

This project is live at <https://shopify-cro-fixer.vercel.app>. The Vercel project is connected to this GitHub repository, so pushes to `main` trigger a new production deployment. The notes below still apply to a fresh deployment:

- **Node.js version:** set the Vercel project to Node.js 22.x or 24.x. The `engines` field requires `^22.12.0 || ^24.0.0 || >=26.0.0` because of Vitest 5.
- **Runtime:** `/api/audit`, `/api/speed`, and `/api/render` declare `export const runtime = "nodejs"`. The audit route uses `node:http`, `node:https`, and `node:dns`; the render route launches a local browser and proxy. Do not move these routes to the Edge runtime.
- **Duration and memory:** `/api/audit` and `/api/speed` declare `maxDuration = 30`. `/api/render` declares `maxDuration = 60` and has an internal 38-second deadline. Serverless Chromium is memory-hungry; use a plan/function size with at least 2048 MB if the deployed render fails with launch or memory errors.
- **Environment variables:** set `NEXT_PUBLIC_SITE_URL` to the real HTTPS domain. Add `PAGESPEED_API_KEY` as a **server-only** variable in Project > Settings > Environment Variables, then redeploy. `RENDERED_AUDIT_ENABLED` is optional and defaults to enabled; set it to `false` only if you need to turn rendering off.
- **Build command:** `npm run build`. **Install command:** `npm install`. No database, queue, cron job, or paid API is required.
- **Rate limiting:** the limiter is in-memory and per function instance. On Vercel, concurrent or scaled instances do not share counters. Add a shared limiter (for example Upstash Redis or Vercel KV) before relying on it for abuse protection. Rendered scans are limited to 2 per 10 minutes per source in addition to the 5 audits and 10 speed checks per 10 minutes.
- **Function logs:** scan outcome and failure logs include the status, code, and duration, but no page content, API keys, hostnames, or IP addresses.

Before the first production deploy, run `npm run check` locally and confirm it passes.

## How the live audit works

The audit is a **real scan**, not a demo. A submission goes through these steps:

1. URL validation in the browser and again on the server.
2. Only public `http://` and `https://` website URLs are accepted.
3. Explicit credentials, raw IP addresses, localhost, reserved internal suffixes, and non-standard ports are rejected.
4. DNS is resolved and **every** returned address must be public. The server then connects to the validated IP while preserving the hostname for TLS.
5. Redirects are followed manually, limited to four, and every redirect destination is revalidated and resolved again.
6. Requests time out after 8 seconds; the whole audit has a 15-second deadline. The API routes declare `maxDuration = 30`.
7. Raw and decompressed HTML are capped at 2 MB.
8. Only HTML responses are parsed in the static pass. Scanned-site scripts are never executed on the server.
9. When the final URL ends in `/products/<handle>`, the scanner requests `<origin>/products/<handle>.json` through the **same** secure transport. Product JSON is capped at 1 MB and gets a 6-second sub-deadline. If it is disabled, blocked, 404, non-JSON, malformed, or too large, the seven product checks are marked **Unverified** with the reason.
10. Common bot-challenge pages (Cloudflare, Incapsula, PerimeterX, Vercel checkpoint) and Shopify password pages are detected instead of being reported as findings.
11. A small in-memory rate limit allows up to 5 audits per request source per 10 minutes. The speed route allows up to 10 checks per 10 minutes, and the render route allows 2 rendered scans per 10 minutes.
12. After the report loads, the UI sends a second request to `/api/speed`. That route calls the fixed `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` host with `strategy=mobile`. A slow or quota-limited PSI response never removes HTML or product findings.
13. After the report loads, the UI also sends a separate request to `/api/render`. That route launches an isolated headless browser at 390 × 844, forces all traffic through a local allow-listing proxy, measures the rendered layout, and returns a small screenshot and plain JSON. If rendering is disabled or fails, the static report stays and the UI explains which checks did not run.
14. The report returns evidence and is not saved in a database.

The scanner does not read Shopify admin data, cookies, private networks, or checkout information.

### Failure behaviour

A failed scan never returns a report or invented findings. The API returns a structured JSON error with a stable code, a safe message, and an HTTP status. The browser keeps that code and shows a specific title, explanation, and next step:

| Code | What the user sees |
| --- | --- |
| `INVALID_URL`, `UNSAFE_TARGET` | The URL is malformed, not public, or points at a local/private address |
| `DNS_FAILED`, `DNS_TIMEOUT` | The domain could not be resolved or the lookup timed out |
| `TIMEOUT` | The page or the overall audit exceeded its time limit |
| `TOO_MANY_REDIRECTS` | More than four redirects; use the final URL from the address bar |
| `RESPONSE_TOO_LARGE` | The HTML exceeded the 2 MB limit |
| `UNSUPPORTED_CONTENT` | The URL returned something other than HTML |
| `UNSUPPORTED_ENCODING`, `INVALID_RESPONSE` | The response encoding could not be decoded safely |
| `HTTP_ERROR` | The scanned site returned an error status; the exact status is shown (for example 404 or 503) |
| `BLOCKED_BY_SITE` | Bot protection, a login wall, or a password page stopped the scan |
| `TLS_ERROR`, `CONNECTION_ERROR` | The HTTPS certificate failed or the connection was refused/closed |
| `RATE_LIMITED`, `INVALID_REQUEST`, `INTERNAL_ERROR` | The scan limit, a malformed request, or an audit-service problem |

If a proxy or hosting platform returns a non-JSON 502/504/429 page, the browser maps the HTTP status to the matching timeout, rate-limit, or service-unavailable message instead of one generic error. Raw Node error text, hostnames, IP addresses, and response headers are not exposed to the client.

### HTML checks

Where the relevant HTML is actually available, the report checks:

- HTTP response status returned by the final URL
- Page title presence and length
- Meta description presence and length
- H1 presence/count
- Responsive viewport declaration
- HTML language attribute
- Image alt attributes on server-rendered `<img>` elements
- Canonical URL presence, and whether it resolves to a usable web address on the same host
- `noindex` directives in meta tags or `X-Robots-Tag`
- Product-page signals: `/products/` URL, Product JSON-LD, `og:type=product`, `template-product`, standard add-to-cart markup
- Presence of shipping, returns, support, privacy, or guarantee references in page text
- Product structured data and add-to-cart markup when a product page is detected

That is 14 HTML checks. A missing canonical tag is reported as **Unverified**, because themes and server responses can add one later; an invalid or cross-host canonical is a low-severity warning.

### Shopify product checks (real JSON only)

When the final URL is a direct `/products/<handle>` URL, the report also checks the store's public product JSON:

- Number of product images and how many have alt text
- Number of variants and options
- Whether variants have assigned images
- Price presence and compare-at price presence (presence only; pricing strategy is not judged)
- Description length, including empty and very short descriptions
- Product type and tag presence
- Variant availability signals

These 7 checks never guess. If the JSON is unavailable for any reason, every product check is shown as **Unverified** with a fixed, hostname-free reason. The product JSON request goes through the same DNS validation, IP pinning, redirect revalidation, timeout, encoding, and size limits as the HTML request.

### Google PageSpeed Insights

The report UI makes a separate request to `/api/speed`. That route calls only the fixed Google PSI host and returns:

- Google's mobile performance score
- LCP, CLS, TBT, and INP when Google provides them
- The top few opportunities and diagnostics
- The fetch time and the label `Google PageSpeed Insights (lab data)`

If Google returns quota/rate-limit errors, times out, returns malformed data, or cannot be reached, the panel says **Speed data unavailable** and the rest of the report stays intact. No speed number is invented. If no key is configured, the panel uses the exact message `Speed data unavailable: PageSpeed API key not configured.` The `PAGESPEED_API_KEY` is read only on the server, sent only to the fixed `googleapis.com` host, and is never sent to the browser, written to logs, or included in errors.

### Rendered mobile audit

`/api/render` runs separately after the static report and uses `puppeteer-core` with `@sparticuz/chromium` on Vercel. Locally it uses an installed Chrome or Edge browser when available.

- Mobile viewport 390 × 844, device scale factor 1, mobile user agent
- `DOMContentLoaded`, a bounded network-idle wait, then a short settle pause
- A strict 38-second internal deadline and `maxDuration = 60`
- A fresh isolated browser context per scan; no cookies or storage reuse
- A first-screen JPEG screenshot kept small enough for a safe response (or a clear skipped message)

Measured checks:

- Product title, price, and primary add-to-cart visible on the first screen, with measured positions
- Add-to-cart size in pixels, visible label, and the 44 × 44 editorial tap-target guideline
- Sticky or fixed add-to-cart after a bounded scroll
- Product image count, alt-text coverage, gallery presence, and video presence
- Variant selector presence and whether an option is preselected
- Visible price, compare-at text, and a discount badge near the buy box
- Horizontal overflow at 390px (`scrollWidth > viewportWidth`)
- Fixed or sticky overlay coverage of the first screen, as a percentage
- Mobile first-screen screenshot

Rendered ecommerce signals are reported as **Detected**, **Not detected**, or **Unable to verify**, with evidence and an approximate location (above the fold, near the buy box, below the fold, footer only, or page-wide). Covered groups: trust and guarantees, shipping and returns, social proof and review apps, offers and bundles, urgency and low stock, product content, support, and accelerated checkout.

Automated detection is **heuristic**. “Not detected” means **not found in the rendered page**, never “does not exist”. Apps, the selected variant, region, login state, and cross-origin iframes can change what is shown. Confirm important findings in a real browser.

### Editorial content guidelines

The 400-character description guideline and the 4-image guideline live in `src/lib/audit/thresholds.ts`. They are editorial guidance, not proven conversion rules, and the report shows the measured numbers as evidence.

### Priority, effort, and fix plan

Every failed or warning-level check gets:

- **Priority**: High, Medium, or Low using the documented rule below
- **Effort**: Easy, Moderate, or Advanced (editorial estimate)
- **Why it matters**: a short, non-numeric explanation
- **How to fix in Shopify**: two tracks, **For store owners** (theme editor/app/admin steps) and **For developers** (Liquid/CSS/JS example labelled `Example - adapt to your theme, back up first`)

Priority rule:

- Failed check + high or medium severity -> **High**
- Failed check + low severity -> **Medium**
- Warning + high or medium severity -> **Medium**
- Warning + low severity -> **Low**
- Passed and unverified checks are not placed in the fix plan

The report order is:

1. Fix plan
2. Failed and warning findings, grouped by CRO category with SEO/technical hygiene last
3. Unverified checks
4. Passed checks, collapsed by default as one-line summaries

The top actions appear in a **Fix plan** at the top of the report. This is rule-based editorial prioritisation. It is **not** a predicted conversion lift, and the tool does not output revenue or conversion estimates. The only numeric score shown is Google's own PageSpeed performance score, clearly labelled. There is no invented “conversion score”. If a category scorecard is shown, it is only `x of y checks passed`.

Other areas are deliberately marked **Unverified** or described as heuristic:

- Checkout and payment completion
- Login state, experiments, region-specific apps, and some cross-origin widgets
- Visual hierarchy, copy quality, offer strength, and real customer intent

A passing check means a signal was present. It is not proof of a conversion lift.

### Demo report

The homepage contains a sample audit labelled **Demo Report** and “Illustrative data only”. The audit API never returns demo findings. A real submission either returns a live scan or a clear failure state.

## Security notes

The scanner implements SSRF protections appropriate for a small public tool:

- Rejects private, loopback, link-local, multicast, documentation, and reserved IP ranges
- Rejects the whole hostname if any DNS answer is private
- Pins each request to the validated IP
- Revalidates every redirect target
- Disables automatic redirect following
- Enforces timeout, response-size, and content-type limits
- Sends product JSON requests through the same controls as HTML
- Does not execute remote scripts on the server or return internal network details
- Calls Google PSI only through a fixed allow-listed host with the validated target URL encoded as a query parameter

Rendered audit security adds:

- Forces Chromium through a local proxy at `127.0.0.1`; every document, redirect, subresource, and iframe request passes through it
- Resolves DNS in the proxy, rejects any private/loopback/link-local/reserved/metadata answer, and connects the socket to the exact validated IP (DNS-rebinding resistant)
- Allows only `http:`/`https:` on standard ports and only GET, HEAD, and OPTIONS
- Blocks `file:`, `data:`, `ftp:`, `ws:`, `wss:`, and `blob:` requests; rejects downloads and dismisses dialogs
- Overrides WebSocket, EventSource, and RTCPeerConnection inside the page
- Uses a fresh browser context with permissions denied and no reused cookies or storage
- Limits navigations, requests, connections, bytes, and total runtime; closes the browser and proxy in a `finally` block
- Executes exactly one fixed `page.evaluate` script that reads layout/text and returns plain JSON; the server validates every field before using it
- Never renders page output into the server DOM or returns raw page HTML to the client

Residual risk: serverless Chromium and a local proxy are complex. A malformed browser build, a proxy bug, or a malicious page could still cause a crash or an unexpected request pattern. Rendered scanning is therefore bounded by the time, byte, and request limits above, and it can be disabled with `RENDERED_AUDIT_ENABLED=false` without affecting static findings.

The in-memory rate limiter is a speed bump, not a distributed abuse-prevention system. On serverless or multi-instance hosting, each instance has its own counter. Before exposing the API to significant traffic, add a shared limiter and deployment-level abuse controls.

The scanner is not a penetration-testing or security-audit product.

## Project structure

```text
src/
  app/
    api/audit/route.ts        POST HTML + product audit endpoint
    api/speed/route.ts        POST Google PSI endpoint
    api/render/route.ts       POST rendered mobile audit endpoint
    audit/page.tsx            Audit page
    blog/page.tsx             Blog index
    blog/[slug]/page.tsx      Article pages
    pricing/page.tsx          Pricing page
    page.tsx                  Homepage
    layout.tsx                Site shell and metadata
    not-found.tsx             Custom 404
    robots.ts                 robots.txt
    sitemap.ts                sitemap.xml
  components/
    audit/                    Audit workspace, report, finding cards, rendered panel, speed panel
    blog/                     Article card and local Markdown-lite renderer
    ui/                       Button, icon
    ...                       Header, footer, forms, demo report, feature card
  content/blog-posts.ts       Local article content
  lib/audit/                  Validation, IP checks, fetch, product JSON, PSI, analysis, fix plan, rate limits, types
  lib/audit/render/           Render config, SSRF proxy, network guard, fixed extraction script, validation, signal rules, checks, browser launch
  lib/audit/thresholds.ts     Editorial CRO thresholds in one place
  lib/site.ts                 Site configuration
tests/
  fixtures/                   Local HTML/JSON/snapshot fixtures (no network access)
  *.test.ts                   Vitest suites for validation, IPs, parsing, product JSON, render signals/checks/security, PSI, priority rules, counts, fetch/redirects, error mapping
```

Blog content is stored as plain TypeScript strings with a small supported Markdown subset (`##`, `###`, paragraphs, lists, blockquotes, bold, and links). This keeps content local and easy to edit without a CMS or new dependency.

## Available commands

```powershell
npm run dev         # Development server
npm run build       # Production build
npm start           # Serve the production build
npm run lint        # ESLint
npm run typecheck   # TypeScript only
npm test            # Automated tests
npm run test:watch  # Tests in watch mode
npm run check       # Lint + typecheck + tests + build
```

## Known limitations

- Only one page is scanned per request. Multi-page scanning is not implemented.
- The static pass inspects only the initial HTML; client-rendered content is covered by the separate rendered audit when it runs.
- Shopify product checks only run for direct `/products/<handle>` URLs. A product page detected only by markup, or a URL with extra path segments, is marked Unverified for product JSON.
- Rendered signal detection is heuristic. “Not detected” means not found in that one rendered page, not proof that a feature is absent.
- Cross-origin iframes, some app widgets, and A/B tests may not be captured.
- The scanner does not click, add to cart, or complete checkout.
- Serverless Chromium on Vercel can fail or be slow. The report falls back to static findings and explains which checks did not run.
- Bot protection, a login wall, or a JavaScript challenge can block a scan; the scan then fails explicitly instead of producing findings.
- Pages that take longer than 8 seconds to respond, or 15 seconds for the whole static audit, time out. Rendered scans have a 38-second internal deadline.
- Responses larger than 2 MB of HTML or 1 MB of product JSON are rejected.
- Google PSI may be slow or quota-limited. The speed panel then shows an honest unavailable state.
- PSI lab data is not real-user field data and can differ from shoppers' devices.
- The rate limiter is in-memory and per server instance.
- There is no report persistence, account, billing, or team functionality.
- The homepage demo is illustrative and not a scan of a real store.

## Suggested next phase

1. Add PDF export of the existing report, then optional email capture with explicit consent.
2. Add multi-page crawling from a store homepage or sitemap, with a hard request and time budget.
3. Add optional accounts and saved reports only after defining data retention and privacy requirements.
4. Add a shared rate limiter and production observability for render time, memory, and failure codes.
5. Add real payment and subscription infrastructure only when the Pro scope is delivered and accurately described.
6. Consider a small dedicated scanner service if serverless Chromium proves unreliable on the current Vercel plan.

## Deployment status

- GitHub repository: <https://github.com/Ahsaan-021/Shopify-CRO-Fixer>
- Production site: <https://shopify-cro-fixer.vercel.app>
- Pushes to `main` automatically deploy to Vercel.
- `NEXT_PUBLIC_SITE_URL` is set to the production domain in Vercel.
- `PAGESPEED_API_KEY` is required and server-only. Add it in Vercel Project > Settings > Environment Variables and redeploy. Never paste it into source, README, logs, or a tracked file.
- `RENDERED_AUDIT_ENABLED` is optional and enabled by default. Set it to `false` only if serverless Chromium cannot run on the current plan; the UI then shows that rendered checks did not run.

Still recommended before significant traffic:

1. Add shared rate limiting and hosting-level abuse protection.
2. Review privacy and data-retention requirements.
3. Re-run `npm run check` before each release.
4. Keep `/api/audit`, `/api/speed`, and `/api/render` on the Node.js runtime; do not move them to Edge.
