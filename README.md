# Atlas — News Blog Publishing Platform

A full-stack news blog with a magazine-style homepage (design template A, inspired by
[Amazing Architecture](https://amazingarchitecture.com), [Big News Network](https://www.bignewsnetwork.com)
and [Vegas Newser](https://vegasnewser.com)).

- **Frontend**: React 18 + Vite + React Router + Axios (English public site)
- **Backend**: Node.js + Express + SQLite (built-in `node:sqlite`, no native compilation)
- **Auth**: JWT + bcrypt; **Uploads**: multer → `server/uploads/`
- **Content importer**: RSS crawler that fills the site from external news feeds

## Requirements

- Node.js **>= 22.5** (uses the built-in `node:sqlite`; tested on v24)

## Install

```bash
npm install               # root (concurrently)
npm --prefix server install
npm --prefix client install
# or simply:
npm run install:all
```

## Quick start

```bash
npm run seed     # create DB + sample data (admin / admin123)
npm run dev      # starts API on :3000 and Vite on :5173
```

Open **http://localhost:5173** — the public site.
Open **http://localhost:5173/admin** — the publishing dashboard (login: `admin` / `admin123`).

## Content model (reference: uk.euleader.org)

Content is split into two worlds, like the reference site:

- **Press Releases** (`/category/press-releases`) — your own published/submitted content.
  The admin editor defaults new posts to this category.
- **Everything else** (`Architecture`, `World News`, `Technology`, `Business`, …) —
  content crawled from other websites. Crawled posts carry a
  `Syndicated from <source>` badge and are labeled in the admin table.

## Import content from other websites (crawler)

```bash
npm run crawl                # import latest items from all enabled feeds
npm run crawl -- --limit 20  # up to 20 items per feed
npm run crawl -- --source verge      # only one feed (key, either "--source x" or "--source=x")
npm run crawl -- --refresh   # delete previously crawled posts, then re-import
```

Feeds are configured in `server/src/crawler.js`. Sources:

| Key | Source | Category |
|---|---|---|
| archd | ArchDaily | Architecture |
| dezeen | Dezeen | Architecture |
| npr | NPR News | World News |
| verge | The Verge | Technology |
| skynews | Sky News | World News |
| cnet | CNET | Technology |
| marketwatch | MarketWatch | Business |
| guardian-world / -tech | The Guardian | World News / Technology |
| bbc-world | BBC World | World News |
| euleader-world / -politics | uk.euleader.org | World News |
| euleader-science | uk.euleader.org | Science |
| euleader-sport | uk.euleader.org | Sports |
| euleader-travel | uk.euleader.org | Travel |
| tg-trtworld / tg-skynews / tg-apnews | Telegram news channels | World News |

How the importer works:
- Uses the feed's full HTML body when substantial; otherwise **fetches the article page
  and extracts the main content** (cheerio DOM extraction — powers the uk.euleader.org
  and BBC/Guardian/ArchDaily sources, whose feeds carry summaries).
- **Reader fallback**: if a site blocks direct page fetching (e.g. MarketWatch's
  CAPTCHA wall), the importer tries the [r.jina.ai](https://r.jina.ai) reader for clean markdown.
- **Proxy-aware networking**: some domains (t.me, theguardian.com, bbc feeds, archdaily)
  are routed through the machine's local HTTP proxy (`127.0.0.1:7897`); the crawler uses
  an `undici` ProxyAgent automatically (override with `HTTPS_PROXY`/`HTTP_PROXY`).
- **Downloads cover images to `/uploads/crawl`** with magic-byte validation
  (jpg/png/webp/gif/avif — AVIF is kept as `.avif`). **Items that cannot get a real
  cover image are skipped** (no placeholder covers for crawled content).
- **Telegram channels**: `t.me/s/<channel>` public pages are parsed for message text,
  timestamp and photo (downloaded from the telesco.pe CDN); text-only messages are skipped.
- Deduplicates by source URL — re-running imports only new items.
- Imported posts are published under the `crawler` author account, carry a
  `Syndicated from <source>` badge and a **"Read original"** link to the source article.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | run API + Vite concurrently |
| `npm run seed` | (re)create sample categories/tags/posts/settings |
| `npm run crawl` | import external RSS content |
| `npm --prefix client run build` | production build of the frontend |

## Project structure

```
├── server/                  # Express + SQLite API
│   ├── src/
│   │   ├── index.js         # app entry (:3000)
│   │   ├── db.js            # schema + helpers
│   │   ├── seed.js          # sample data
│   │   ├── crawler.js       # RSS importer
│   │   ├── middleware/auth.js
│   │   └── routes/          # posts, categories, tags, authors, settings, auth, admin, upload
│   ├── uploads/             # uploaded covers (runtime)
│   └── data/news.db         # SQLite database (runtime)
├── client/                  # React + Vite frontend (:5173, proxies /api + /uploads)
│   └── src/
│       ├── components/      # Layout, PostCard, Cover, Pagination, MarkdownView
│       ├── pages/           # Home, Category, Tag, Search, Post, Author, NotFound
│       └── pages/admin/     # Login, Posts, PostEditor, Categories, Tags, Settings
└── templates/               # static homepage design mockups (template A chosen)
```

## API overview

Public: `GET /api/settings/home`, `/api/posts` (page/category/tag/q/author/featured filters),
`/api/posts/:slug`, `/api/posts/:id/related`, `/api/categories`, `/api/tags`, `/api/authors`.

Admin (Bearer JWT): `POST /api/auth/login`, CRUD under `/api/admin/posts|categories|tags`,
`POST /api/admin/upload`, `GET /api/admin/stats`, `PUT /api/admin/settings`.
