# Continue the Atlas project on a new computer

The whole project — **source code, the SQLite database (all 141 posts) and every
uploaded image (38 MB)** — is stored in this folder. Copy or clone it to the new
machine and it runs as-is.

## Option A — fresh copy / USB / network share

1. Copy the project folder (or the backup zip) to the new computer.
   The backup zip excludes `node_modules`, so install dependencies once:

2. On the new computer (needs Node.js >= 22.5):

```bash
cd <project folder>
npm run install:all     # installs root + server + client deps
npm run dev             # starts API :3000 and Vite :5173
```

3. Open http://localhost:5173 — the site is ready with all content.
   Admin: http://localhost:5173/admin  (admin / admin123)

## Option B — via Git (recommended for ongoing work)

```bash
# one-time, on the new machine
git clone <your-repo-url>
cd atlas
npm run install:all
npm run dev
```

### Pushing this repo to GitHub / Gitee (do once, from this machine)

```bash
git remote add origin <your-repo-url>     # e.g. https://github.com/you/atlas.git
git branch -M main
git push -u origin main
```

(If your commit identity isn't set: `git config user.name "You"` and
`git config user.email "you@example.com"`.)

### Typical workflow after that

```bash
git add -A && git commit -m "what changed" && git push   # save work
git pull                                                # get latest on the other machine
```

## Notes

- The SQLite DB is committed on purpose so content travels with the code;
  it's a single portable file (`server/data/news.db`).
- The public tunnel URL changes each time you start a tunnel —
  `D:\webkaifa\tools\cloudflared.exe tunnel --url http://localhost:5173`
  (or re-download cloudflared on the new machine).
- To re-import fresh content from the web: `npm run crawl`

## Troubleshooting: GitHub connection is flaky/reset

If `git clone`/`git push` fail with "Connection was reset" / "Could not connect":

1. Retry — GitHub connections are intermittently reset on some networks.
2. If you have a local proxy (e.g. Clash/V2Ray on 127.0.0.1:7897), route git
   through it:

```bash
git config --local http.proxy http://127.0.0.1:7897
git config --local https.proxy http://127.0.0.1:7897
```

3. If Git Credential Manager fails to authenticate through the proxy, make it
   bypass the proxy for GitHub (one time; the credential is then cached):

```bash
set NO_PROXY=github.com,api.github.com
git push -u origin main
```

## Bringing your DeepSeek Harness conversation memory to another computer

DSH stores conversations locally in `C:\Users\<you>\.dsh` (sessions are
zstd-compressed JSONL, keyed by workspace path). To continue THIS project's
conversation on another machine:

1. Copy `D:\dsh-memory-backup.zip` to the new machine.
2. Close DSH on both machines (avoid copying a live database).
3. Unzip into the SAME location: `C:\Users\<you>\.dsh`
   (merge with what's already there; the zip contains `sessions/`, `skills/`,
   `storages/`, `settings.yaml`, `.credentials.yaml`).
4. Use the **same workspace path** `D:\webkaifa` for the project on the new
   machine — sessions are matched to the workspace path, so keeping the path
   identical makes the old conversation appear under it.

Alternative without the backup zip: install Git, then copy the whole
`C:\Users\<you>\.dsh` folder once.
