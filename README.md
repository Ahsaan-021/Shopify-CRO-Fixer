# Shopify CRO Fixer

A modern SaaS-style foundation and a working first version of a Shopify conversion-rate optimisation (CRO) audit tool.

The current tool inspects the **initial HTML** of one public page and reports only signals it can verify. It does not invent conversion scores, run JavaScript from scanned sites, or claim to replace analytics, customer research, or a full UX review.

## Current status

Phase 1 is implemented:

- Responsive marketing site
- Free live static HTML audit at `/audit` with 14 checks
- Findings grouped by severity, with evidence and suggested fixes
- Honest result states: passed, warning, failed, and unverified
- Three original CRO guides with local content
- Honest Free / planned Pro pricing page
- SEO metadata, sitemap, robots.txt, and custom 404 page
- Automated tests for URL validation, IP safety, HTML parsing, result counts, redirects, compression, HTTP/TLS/DNS errors, blocked pages, and client error mapping
- Specific, honest error states for blocked sites, timeouts, missing pages, unsupported content, and non-HTML responses
- Production build, ESLint, and TypeScript checks

There is **no** authentication, database, payment integration, analytics, Chrome extension, or saved reports in this phase.

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
| `/api/audit` | POST-only audit API |

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

The tests use local HTML fixtures in `tests/fixtures/` via Vitest. They never contact an external website. The suite currently has 8 files and 131 tests. Coverage includes:

- Public-URL acceptance and SSRF rejection (loopback, private, link-local, reserved, encoded IPs, internal suffixes, unsafe ports)
- Private and reserved IP classification
- HTML parsing: title, description, H1, images, canonical URL, HTTP status, and product signals
- Consistent passed / warning / failed / unverified counts
- The real HTTP client with an injected request function: relative redirects, the four-redirect limit, redirects to loopback/internal hosts, expired deadlines, and invalid initial URLs
- gzip, deflate, and Brotli decoding, unsupported encodings, malformed compressed bodies, and responses that expand beyond 2 MB
- HTTP status classification (401, 403, 404, 410, 429, 5xx) and socket/DNS/TLS failure classification
- Cloudflare/WAF challenge and Shopify password-page detection using local fixtures
- Client error mapping for API errors, non-JSON hosting/proxy responses, network failures, and client timeouts
- Checks that raw Node error text, hostnames, IP addresses, and stack details are not echoed to the browser

## Environment variables

Only one optional variable is currently relevant:

| Name | Purpose | Local default |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL used in metadata, sitemap, and robots.txt | `http://localhost:3000` |

Copy `.env.example` to `.env.local` if you want to override it. Never commit `.env.local` or real secrets. No secret keys are needed in Phase 1.

## Deploying to Vercel

The project is compatible with Vercel's Node.js runtime, with these constraints:

- **Node.js version:** set the Vercel project to Node.js 22.x or 24.x. The `engines` field requires `^22.12.0 || ^24.0.0 || >=26.0.0` because of Vitest 5.
- **Runtime:** `/api/audit` declares `export const runtime = "nodejs"` because it uses `node:http`, `node:https`, and `node:dns`. Do not move this route to the Edge runtime.
- **Duration:** `/api/audit` declares `maxDuration = 30`. This fits the Hobby plan's 300-second function limit and leaves room for the 15-second audit deadline plus platform overhead.
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
6. Requests time out after 8 seconds; the whole audit has a 15-second deadline. The API route declares `maxDuration = 30`.
7. Raw and decompressed HTML are capped at 2 MB.
8. Only HTML responses are parsed. Scanned-site scripts are never executed.
9. Common bot-challenge pages (Cloudflare, Incapsula, PerimeterX, Vercel checkpoint) and Shopify password pages are detected instead of being reported as findings.
10. A small in-memory rate limit allows up to 5 scans per request source per 10 minutes.
11. The report returns evidence and is not saved in a database.

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

### Checks performed

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

That is 14 checks. A missing canonical tag is reported as **Unverified**, because themes and server responses can add one later; an invalid or cross-host canonical is a low-severity warning.

Other areas are deliberately marked **Unverified**:

- Visual mobile layout and tap-target size
- Speed and Core Web Vitals
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
- Does not execute remote scripts or return internal network details

The in-memory rate limiter is a speed bump, not a distributed abuse-prevention system. On serverless or multi-instance hosting, each instance has its own counter. Before exposing the API to significant traffic, add a shared limiter and deployment-level abuse controls.

The scanner is not a penetration-testing or security-audit product.

## Project structure

```text
src/
  app/
    api/audit/route.ts        POST audit endpoint
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
    audit/                    Audit workspace, report, finding cards
    blog/                     Article card and local Markdown-lite renderer
    ui/                       Button, icon
    ...                       Header, footer, forms, demo report, feature card
  content/blog-posts.ts       Local article content
  lib/audit/                  Validation, IP checks, fetch, analysis, summary, types
  lib/site.ts                 Site configuration
tests/
  fixtures/                   Local HTML fixtures (no network access)
  *.test.ts                   Vitest suites for validation, IPs, parsing, counts, fetch/redirects, error mapping
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

- Only one page is scanned per request.
- Only the initial HTML is inspected; client-rendered content is not available.
- Shopify app scripts, theme JavaScript, and dynamic variants are not executed.
- Bot protection, a login wall, or a JavaScript challenge can block a scan; the scan then fails explicitly instead of producing findings.
- Pages that take longer than 8 seconds to respond, or 15 seconds for the whole audit, time out.
- Responses larger than 2 MB of HTML are rejected.
- The rate limiter is in-memory and per server instance.
- There is no report persistence, account, billing, or team functionality.
- The homepage demo is illustrative and not a scan of a real store.

## Suggested next phase

1. Add a sandboxed headless-browser check for rendered product pages, with strict network isolation and clear consent.
2. Add multi-page crawling from a store homepage or sitemap.
3. Add optional accounts and saved reports only after defining data retention and privacy requirements.
4. Add a shared rate limiter and production observability.
5. Add real payment and subscription infrastructure only when the Pro scope is delivered and accurately described.

## Manual actions

None are required to run the site locally. Before deploying publicly:

1. Create a Git repository and push the project (this folder is not a Git repository yet).
2. Set `NEXT_PUBLIC_SITE_URL` to the real HTTPS domain in the hosting dashboard.
3. Choose Node.js 22.x or 24.x in the hosting project settings.
4. Deploy with the Node.js runtime; do not move `/api/audit` to Edge.
5. Run `npm run check` and a live scan against the deployed `/api/audit` endpoint.
6. Add shared rate limiting and hosting-level abuse protection.
7. Review privacy and data-retention requirements.
