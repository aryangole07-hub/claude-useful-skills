# Launch readiness: security + legal (gate before any site goes live)

Run both halves before a deploy. Report each item as PASS / FIXED / NEEDS OWNER (a decision or fact only the owner
has) / N/A, with file:line evidence. Legal pages are drafts: say plainly that a lawyer should review them before
launch, and never present a template as legal advice. Don't invent business facts (address, GST, refund terms):
mark them `<!-- CONFIRM: ... -->`.

## A. Security (19 checks)

1. **Hide API keys.** No secret in client code or bundles: in Vite, anything prefixed `VITE_` ships to the browser;
   in Next, `NEXT_PUBLIC_` does. Grep the built output (`dist/`, `.next/static`) for key patterns.
2. **Env variables.** `.env*` gitignored, an `.env.example` with names only, server-only secrets never imported by
   client components, production values set in the host (Vercel etc.), not in files.
3. **Protect admin routes.** Server-side checks on every admin page *and* every admin API; hiding a link is not
   protection. Deny by default.
4. **Proper authentication.** Use a vetted provider (Supabase/GoTrue, Auth.js, Clerk): httpOnly + Secure +
   SameSite cookies or short-lived tokens, session expiry and rotation, CSRF protection for cookie auth, and
   login/reset/OAuth flows that don't leak whether an account exists.
5. **Check user access.** Authorisation on every object read/write (no IDOR: user A can't fetch B's row by changing
   an id). RLS on every exposed table, tested with two dummy users.
6. **Sanitise forms.** Validate on the server (zod/pydantic) for type, length and format; reject unknown fields;
   parameterised queries only.
7. **XSS.** No `dangerouslySetInnerHTML` / `innerHTML` with user or scraped content unless sanitised (DOMPurify);
   escape in templates; validate URLs (`javascript:`); Content-Security-Policy.
8. **Rate limiting** on login, sign-up, password reset, contact forms, search and any LLM / paid-API endpoint
   (per IP and per account), plus a CAPTCHA (Turnstile) on public forms.
9. **Secure API endpoints.** Auth on every non-public route, least-privilege keys, request size limits, timeouts,
   errors that don't leak stack traces or SQL.
10. **CORS.** Explicit allow-list of origins; never `*` together with credentials; don't reflect the Origin header.
11. **Security headers.** CSP, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
    `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `frame-ancestors` (or
    `X-Frame-Options`). Check them at securityheaders.com after deploy.
12. **Debug mode off.** No dev servers, source maps with secrets, verbose errors, `DEBUG=True`, or test routes
    (`/test`, `/dev-tools`) in production.
13. **Update dependencies.** `npm audit` / `pip-audit`; patch criticals; pin and update the lockfile.
14. **Remove unused packages** (`npx depcheck`, `knip`); fewer packages, smaller attack surface.
15. **Exposed files.** Nothing public under `/.git`, `/.env`, backups, dumps, `*.sql`, logs, or admin JSON; check the
    built `public/` folder and the server's static roots.
16. **Secure DB access.** DB not on the public internet (or behind a tunnel/VPN with TLS), app role with least
    privilege, no superuser in the app, backups encrypted, service-role keys server-side only.
17. **Hash passwords properly.** Only via the auth provider, or argon2id / bcrypt (cost >= 12). Never store, log or
    email plaintext passwords.
18. **Git history for secrets.** `gitleaks detect` / `trufflehog git file://.`; rotate anything found (deleting the
    commit is not enough).
19. **Full security audit:** run the `security-audit` skill (Cloudflare) in full audit mode, source-only.

## B. Legal and trust (so the site doesn't get the owner sued)

**Pages (linked from the footer of every page):**
- **Privacy policy:** what data is collected, why, the legal basis/consent, retention, who it's shared with
  (processors: hosting, analytics, email, payments), cross-border transfers, user rights (access, correction,
  erasure, withdraw consent, grievance), contact + grievance officer, last-updated date. It must match what the site
  actually does: audit the code and network calls first.
- **Terms and conditions:** service description, accounts, acceptable use, IP, disclaimers, limitation of
  liability, termination, governing law and jurisdiction, changes, contact.
- **Cookie policy:** every cookie and local-storage key with its purpose, duration and party (first or third).
- **Refund / cancellation policy** wherever anything is sold (credits, subscriptions): eligibility, window, how to
  request, timelines. Required by payment gateways (Razorpay/Stripe) and e-commerce rules.
- **Business details:** legal name, address, contact email/phone, and GSTIN/CIN where applicable (India's
  Consumer Protection (E-Commerce) Rules 2020 require seller details and a grievance officer for e-commerce).

**Consent and data:**
- **Cookie consent:** required if you set non-essential cookies (analytics, ads, session replay) for visitors from
  the EU/UK (GDPR + ePrivacy), and expected under India's DPDP Act 2023 for personal-data processing. Strictly
  necessary cookies (login session, CSRF, load balancing) don't need consent. If needed: block non-essential
  scripts until opt-in, offer Reject as easily as Accept, remember the choice, and let users change it.
- **Form consent:** each form says what's collected and why, links the privacy policy, and uses an unticked,
  separate checkbox for marketing. No pre-ticked boxes.
- **Collect only what's necessary** (data minimisation): drop fields you don't use, and don't log personal data or
  form bodies.
- **Analytics:** list every tracker (GA, PostHog, Hotjar, pixels). Prefer privacy-friendly or self-hosted options;
  anonymise IPs, turn off session replay on sensitive pages, mask inputs, and honour consent.
- **Third-party embeds** (YouTube, maps, chat widgets, fonts, social buttons) set cookies and send data: use
  privacy-enhanced modes (`youtube-nocookie.com`), click-to-load, self-hosted fonts, and list them in the policies.

**Accessibility** (also a legal requirement in many places: ADA lawsuits in the US, the European Accessibility Act
from June 2025, India's RPwD Act 2016 / GIGW): WCAG 2.2 AA, alt text on every meaningful image (`alt=""` on
decorative ones), contrast (4.5:1 text, 3:1 UI), keyboard-friendly forms (labels, logical tab order, visible focus,
errors announced), clear button labels ("Send message", not "Submit"), no zoom blocking.

**Honest content:**
- **Remove fake reviews and testimonials.** Fake or unverifiable reviews breach consumer-protection law (India's
  CCPA guidelines on fake online reviews; the US FTC rule from 2024). Keep only real ones, with consent.
- **Remove unsupported claims** ("#1", "guaranteed returns", "100% accurate", medical or financial promises). For
  finance sites: SEBI rules on investment advice and research analysts, with clear "not investment advice"
  disclaimers.
- **Image copyright:** every image is your own, licensed (record the licence and source), AI-generated (check the
  tool's terms), or public domain with credit. No images taken from Google search or competitors.

**Local laws to check** (flag, don't guess). India: DPDP Act 2023 + Rules, IT Act 2000 and the IT (Reasonable
Security Practices) Rules 2011, the Consumer Protection Act 2019 and E-Commerce Rules 2020, GST invoicing, and
SEBI for investment content. EU/UK visitors: GDPR, ePrivacy. US: CCPA/CPRA (California), COPPA if children may
use the site. Note anything else that applies: age limits, payments (PCI-DSS: never touch card data, use the
gateway's hosted fields), email marketing (opt-in and unsubscribe), and trademarks in the name or logo.

**Other risks to flag:** domain and brand trademark conflicts, open-source licence obligations (attribution, GPL),
scraped data and robots.txt / ToS of the source sites, user-generated content moderation (IT Rules 2021
intermediary duties), data breach notification duties (DPDP, CERT-In reporting within 6 hours), and backups.

**"Make no mistakes" means:** verify every item against the actual code and the live network traffic, cite
evidence, and list what could not be verified. Never claim the site is legally compliant: say it's ready for a
lawyer's review.
