# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities to **security@continue.dev**. Do not open a public issue.

We will acknowledge your report within 48 hours and aim to provide a fix or mitigation within 7 days for critical issues.

## Scope

next-geo includes an auto-conversion handler that fetches pages from the same host and converts HTML to markdown. This is the primary attack surface — specifically:

- **SSRF** — The handler validates that internal fetch targets resolve to the same host and follows redirects only within the same host. If you find a bypass, please report it.
- **Content injection** — The HTML-to-markdown conversion strips scripts and styles, but novel injection vectors through Turndown are in scope.
- **Denial of service** — The handler enforces response size limits, but resource exhaustion vectors are in scope.

Out of scope:
- Vulnerabilities in Next.js itself (report to [Vercel](https://vercel.com/security))
- Vulnerabilities in Turndown (report to [Turndown](https://github.com/mixmark-io/turndown/issues))
- Issues that require the attacker to already have server-side code execution
