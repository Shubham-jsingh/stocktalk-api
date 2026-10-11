# Production database migrations

Production must use **`DB_SYNCHRONIZE=false`**. Schema changes go through TypeORM migrations only.

## What runs where

| Step | Where | Command |
|------|--------|---------|
| Build image | Cloud Build | `gcloud builds submit --config cloudbuild.yaml` |
| Deploy API | Cloud Run | Included in `cloudbuild.yaml` |
| **Migrations** | **Your machine (or CI job)** | `npm run migration:run:prod` via Cloud SQL Auth Proxy |

Migrations are **not** executed automatically on deploy today. Run them **before** deploying code that depends on new columns.

Latest migration: `1757100000000-PostAndCommentMentions` — `post_mentions` and `comment_mentions`. Run earlier migrations first if they are not already applied.

---

## One-time: install Cloud SQL Auth Proxy

```bash
# macOS (Homebrew)
brew install cloud-sql-proxy
```

---

## Run migrations against Cloud SQL

### 1. Start the proxy (leave this terminal open)

```bash
cloud-sql-proxy tradefeedapi:asia-south1:stocktalk-db --port 5432
```

### 2. In another terminal, set DB env and run migrations

Use the **Cloud SQL** user/password (not your local Mac Postgres user):

```bash
cd /path/to/stocktalk-api

export DB_HOST=127.0.0.1
export DB_PORT=5432
export DB_USERNAME=stocktalk
export DB_PASSWORD='YOUR_CLOUD_SQL_PASSWORD'
export DB_NAME=stocktalk
# Do not set INSTANCE_CONNECTION_NAME when using the proxy on localhost

npm run migration:show:prod   # pending vs applied
npm run migration:run:prod    # apply pending
```

### 3. Verify

`migration:show:prod` should list all migrations as executed, including `AddPostStockLink1756700000000`.

---

## Order for this release

1. **Backup** Cloud SQL (Console → SQL → Backups, or on-demand backup).
2. **Run migrations** (`migration:run:prod`).
3. **Deploy** the new Cloud Run image (`gcloud builds submit` …).
4. Smoke-test: `GET /api/health`, create a post with optional `stockId`.

---

## Optional: run from Cloud Shell

If Cloud Shell can reach Cloud SQL (private IP / authorized networks), use the same env vars and `migration:run:prod` after cloning the repo and `npm ci`.

---

## Rollback

`migration:revert` only reverts the **last** migration and is not wired for prod JS by default. Prefer **restore from backup** if a migration causes issues in production.
