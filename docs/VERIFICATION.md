# Verification record — 29 October 2026

- `npm ci`: successful, no reported npm vulnerabilities.
- `npm run build`: TypeScript and Vite passed; application and chart code split into separate chunks.
- `python -m unittest discover -s tests -v`: **13 tests passed**.
- `docker compose up --build -d`: built successfully; container health check passed.
- Requests executed **inside the container**: frontend returned 200 with Windledger title; analysis returned 744 matched hours and MAE 2038.9 MW; CSV returned 200 and 745 lines including the header.
- GitHub Actions: successful React build, Python tests and Docker build. See the repository's Actions tab for the current commit.
- Public repository access is checked with unauthenticated HTTP, separately from the authenticated `gh` session.

## Verification limits

The browser integration host was unavailable. The native Windows browser path stopped because its URL-policy enforcement is unsupported. **Visual, mobile-viewport, keyboard-flow, and incognito-browser checks have not been completed.** Responsive styles and accessibility affordances exist, but automated build/API checks do not substitute for those checks.

Vercel account authentication and deployment are separate from local application checks. Temporary deployment packaging hit a Windows `uv` cache rename failure and then a generated-dependency tracing conflict; production deployment has not been claimed successful on that basis. The README and submission checklist must be updated only after a real deployment URL is verified.

No YouTube video has been recorded or uploaded and no submission form has been sent. Use `DEMO_SCRIPT.md` to record the customer and technical walkthrough, then complete the access checks before submission.
