# Shopify CRO Fixer

A modern SaaS-style foundation and a working Shopify conversion-rate optimisation (CRO) audit tool.

The current tool inspects the **initial HTML** of one public page, reads **Shopify's public product JSON** for product pages, and requests **Google PageSpeed Insights** mobile lab data. It reports only what it can verify. It does not invent conversion scores, run JavaScript from scanned sites, or claim to replace analytics, customer research, or a full UX review.

**Live production:** <https://shopify-cro-fixer.vercel.app>

## Current status

Phase 2 is implemented:

- Responsive marketing site
- Free live audit at `/audit` with 14 HTML checks plus 7 Shopify product-JSON checks on direct product URLs
- Real product data: images and alt text, variants and options, variant images, price and compare-at presence, description length, product type and tags, and variant availability
- Honest `Unverified` fallback when Shopify product JSON is disabled, blocked, missing, non-JSON, or too large
- Optional Google PageSpeed Insights mobile lab data in a separate `/api/speed` request, so a slow PSI response never breaks the main audit
- Rule-based High / Medium / Low priority and Easy / Moderate / Advanced effort, explicitly labelled as editorial, not predicted conversion lift
- Step-by-step Shopify fix instructions and optional theme snippets labelled as theme-dependent
- A top-of-report Fix plan in priority order
- Findings grouped by severity, with evidence and suggested fixes
- Honest result states: passed, warning, failed, and unverified
- Three original CRO guides with local content
- Honest Free / planned Pro pricing page
- SEO metadata, sitemap, robots.txt, and custom 404 page
- Automated tests for URL validation, IP safety, HTML parsing, product JSON parsing, PSI parsing, priority rules, result counts, redirects, compression, HTTP/TLS/DNS errors, blocked pages, and client error mapping
- Specific, honest error states for blocked sites, timeouts, missing pages, unsupported content, and non-HTML responses
- Production build, ESLint, and TypeScript checks

There is **no** authentication, database, payment integration, analytics, Chrome extension, or saved reports in this phase. Multi-page scanning is not implemented.

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

## Tech stack

- Next.js 16.4.3 (App Router, Turbopack)
- React 19.3.0
- TypeScript 5.9
- Tailwind CSS 4.3
- ESLint 9 with `eslint-config-next`
- `node-html-parser` for safe HTML inspection
- Node.js `^22.12.0 || ^24.0.0 || >=26.0.0` required (Vitest 5 uses this range); tested with Node.js 24.18.0 and npm 11.16.0

## Run locally

From this folder (`C:\shopify-cro-fixer`):

```powershell
npm install
npm run dev
```

Open <http://localhost:3000> in a browser.

No environment variables are required for local development.

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

The tests use local HTML/JSON fixtures and mocked PSI responses via Vitest. They never contact an external website. The suite currently has 12 files and 167 tests. Coverage includes:

- Public-URL acceptance and SSRF rejection (loopback, private, link-local, reserved, encoded IPs, internal suffixes, unsafe ports)
- Private and reserved IP classification
- HTML parsing: title, description, H1, images, canonical URL, HTTP status, and product signals
- Shopify product JSON: good data, missing alt text, empty/short descriptions, no variants, missing prices, malformed JSON, handle mismatch, oversized JSON, 404/blocked/non-JSON fallbacks, and redirect safety
- Google PSI parsing with mocked responses: success, missing metrics, quota/403, timeout, malformed JSON, upstream errors, and the fixed endpoint host
- Deterministic priority/effort rules and fix-plan ordering
- Consistent passed / warning / failed / unverified counts
- The real HTTP client with an injected request function: relative redirects, the four-redirect limit, redirects to loopback/internal hosts, expired deadlines, and invalid initial URLs
- gzip, deflate, and Brotli decoding, unsupported encodings, malformed compressed bodies, and responses that expand beyond 2 MB
- HTTP status classification (401, 403, 404, 410, 429, 5xx) and socket/DNS/TLS failure classification
- Cloudflare/WAF challenge and Shopify password-page detection using local fixtures
- Client error mapping for API errors, non-JSON hosting/proxy responses, network failures, and client timeouts
- Checks that raw Node error text, hostnames, IP addresses, and stack details are not echoed to the browser

## Environment variables

| Name | Purpose | Local default |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL used in metadata, sitemap, and robots.txt | `http://localhost:3000` |
| `PAGESPEED_API_KEY` | Optional **server-only** Google PageSpeed Insights API key. Without it, PSI still runs with Google's lower anonymous quota. | not set |

Copy `.env.example` to `.env.local` if you want to override these. Never commit `.env.local` or real secrets. `PAGESPEED_API_KEY` must never be prefixed with `NEXT_PUBLIC_`, because that would expose it to the browser.

## Deploying to Vercel

This project is live at <https://shopify-cro-fixer.vercel.app>. The Vercel project is connected to this GitHub repository, so pushes to `main` trigger a new production deployment. The notes below still apply to a fresh deployment:

- **Node.js version:** set the Vercel project to Node.js 22.x or 24.x. The `engines` field requires `^22.12.0 || ^24.0.0 || >=26.0.0` because of Vitest 5.
- **Runtime:** `/api/audit` and `/api/speed` declare `export const runtime = "nodejs"`. The audit route uses `node:http`, `node:https`, and `node:dns`. Do not move either route to the Edge runtime.
- **Duration:** both routes declare `maxDuration = 30`. The audit keeps a 15-second total deadline (including a 6-second product-JSON sub-limit). PSI uses a 20-second server timeout and the UI waits up to 27 seconds.
- **Environment variable:** set `NEXT_PUBLIC_SITE_URL` to the real HTTPS domain (for example `https://your-project.vercel.app`). The localhost default would produce wrong canonical, sitemap, and robots URLs in production.
- **Build command:** `npm run build`. **Install command:** `npm install`. No database, queue, cron job, or paid API is required.
- **Rate limiting:** the limiter is in-memory and per function instance. On Vercel, concurrent or scaled instances do not share counters. Add a shared limiter (for example Upstash Redis or Vercel KV) before relying on it for abuse protection.
- **Function logs:** scan outcome and failure logs include the error code, HTTP status, and duration, but no page content or credentials.

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
8. Only HTML responses are parsed. Scanned-site scripts are never executed.
9. When the final URL ends in `/products/<handle>`, the scanner requests `<origin>/products/<handle>.json` through the **same** secure transport. Product JSON is capped at 1 MB and gets a 6-second sub-deadline. If it is disabled, blocked, 404, non-JSON, malformed, or too large, the seven product checks are marked **Unverified** with the reason.
10. Common bot-challenge pages (Cloudflare, Incapsula, PerimeterX, Vercel checkpoint) and Shopify password pages are detected instead of being reported as findings.
11. A small in-memory rate limit allows up to 5 audits per request source per 10 minutes. The separate speed route allows up to 10 checks per 10 minutes.
12. After the report loads, the UI sends a second request to `/api/speed`. That route calls the fixed `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` host with `strategy=mobile`. A slow or quota-limited PSI response never removes HTML or product findings.
13. The report returns evidence and is not saved in a database.

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

If Google returns quota/rate-limit errors, times out, returns malformed data, or cannot be reached, the panel says **Speed data unavailable** and the rest of the report stays intact. No speed number is invented. The optional `PAGESPEED_API_KEY` is read only on the server and is never sent to the browser or written to logs.

### Priority, effort, and fix plan

Every failed or warning-level check gets:

- **Priority**: High, Medium, or Low using the documented rule below
- **Effort**: Easy, Moderate, or Advanced (editorial estimate)
- **How to fix in Shopify**: numbered steps, with an optional theme snippet labelled `Example - adapt to your theme, back up your theme first`

Priority rule:

- Failed check + high or medium severity -> **High**
- Failed check + low severity -> **Medium**
- Warning + high or medium severity -> **Medium**
- Warning + low severity -> **Low**
- Passed and unverified checks are not placed in the fix plan

The top actions appear in a **Fix plan** at the top of the report. This is rule-based editorial prioritisation. It is **not** a predicted conversion lift, and the tool does not output revenue or conversion estimates. The only numeric score shown is Google's own PageSpeed performance score, clearly labelled.

Other areas are deliberately marked **Unverified**:

- Visual mobile layout and tap-target size
- Cart and checkout flow
- JavaScript-rendered content
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
- Does not execute remote scripts or return internal network details
- Calls Google PSI only through a fixed allow-listed host with the validated target URL encoded as a query parameter

The in-memory rate limiter is a speed bump, not a distributed abuse-prevention system. On serverless or multi-instance hosting, each instance has its own counter. Before exposing the API to significant traffic, add a shared limiter and deployment-level abuse controls.

The scanner is not a penetration-testing or security-audit product.

## Project structure

```text
src/
  app/
    api/audit/route.ts        POST HTML + product audit endpoint
    api/speed/route.ts        POST Google PSI endpoint
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
    audit/                    Audit workspace, report, finding cards, speed panel
    blog/                     Article card and local Markdown-lite renderer
    ui/                       Button, icon
    ...                       Header, footer, forms, demo report, feature card
  content/blog-posts.ts       Local article content
  lib/audit/                  Validation, IP checks, fetch, product JSON, PSI, analysis, fix plan, rate limits, types
  lib/site.ts                 Site configuration
tests/
  fixtures/                   Local HTML fixtures (no network access)
  *.test.ts                   Vitest suites for validation, IPs, parsing, product JSON, PSI, priority rules, counts, fetch/redirects, error mapping
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
- Only the initial HTML is inspected; client-rendered content is not available.
- Shopify product checks only run for direct `/products/<handle>` URLs. A product page detected only by markup, or a URL with extra path segments, is marked Unverified for product JSON.
- Shopify app scripts, theme JavaScript, and dynamic variants are not executed.
- Bot protection, a login wall, or a JavaScript challenge can block a scan; the scan then fails explicitly instead of producing findings.
- Pages that take longer than 8 seconds to respond, or 15 seconds for the whole audit, time out.
- Responses larger than 2 MB of HTML or 1 MB of product JSON are rejected.
- Google PSI may be slow or quota-limited. The speed panel then shows an honest unavailable state.
- PSI lab data is not real-user field data and can differ from shoppers' devices.
- The rate limiter is in-memory and per server instance.
- There is no report persistence, account, billing, or team functionality.
- The homepage demo is illustrative and not a scan of a real store.

## Suggested next phase

1. Add a sandboxed headless-browser check for rendered product pages, with strict network isolation and clear consent.
2. Add multi-page crawling from a store homepage or sitemap, with a hard request and time budget.
3. Add a PDF export of the existing report, then optional email capture with explicit consent.
4. Add optional accounts and saved reports only after defining data retention and privacy requirements.
5. Add a shared rate limiter and production observability.
6. Add real payment and subscription infrastructure only when the Pro scope is delivered and accurately described.

## Deployment status

- GitHub repository: <https://github.com/Ahsaan-021/Shopify-CRO-Fixer>
- Production site: <https://shopify-cro-fixer.vercel.app>
- Pushes to `main` automatically deploy to Vercel.
- `NEXT_PUBLIC_SITE_URL` is set to the production domain in Vercel.
- `PAGESPEED_API_KEY` is optional and server-only. Add it in Vercel Project > Settings > Environment Variables and redeploy if the anonymous PSI quota is too low.

Still recommended before significant traffic:

1. Add shared rate limiting and hosting-level abuse protection.
2. Review privacy and data-retention requirements.
3. Re-run `npm run check` before each release.
4. Keep `/api/audit` and `/api/speed` on the Node.js runtime; do not move them to Edge.
