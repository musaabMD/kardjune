# Cloudflare-First Architecture

DrKard no longer uses Convex in the production data path. The app is designed around Cloudflare storage primitives:

| Data | Store |
| --- | --- |
| Question banks | R2 bucket `drkard-qbanks` |
| User uploads | R2 bucket `drkard-uploads` |
| Users, subscriptions, sessions, feedback, AI metadata | D1 database `drkard-core` |
| Free-tier question/upload counters | KV namespace `drkard-limits` |
| Next/OpenNext incremental cache | R2 bucket `drkard-opennext-cache` |
| Private HQ analytics/events | D1 table `analytics_events` |

Question bank objects use versioned keys:

```txt
qbanks/v1/{examSlug}/all.json
```

Each object contains:

```json
{ "questions": [] }
```

Run D1 migrations before deploying:

```bash
wrangler d1 migrations apply drkard-core
```

Upload qbank files with:

```bash
wrangler r2 object put drkard-qbanks/qbanks/v1/smle/all.json --file data/qbanks/v1/smle/all.json
```

Local development falls back to bundled sample exams/questions when D1 or R2 bindings are unavailable.

## Private HQ

`hq.drkard.com` rewrites to `/hq` in `middleware.ts`. The page is marked `noindex` and uses Clerk server auth. Only `mousab.r@gmail.com` can view it; other signed-in users receive a 404.

Keep the DrKard goals in `lib/hq-goals.ts`. Retire old Codefast/course-style goals such as `scroll_to_*`, `faq_*`, `check_testimonial_*`, `leadmagnet_*`, and course checkout events.
