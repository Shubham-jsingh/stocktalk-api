# stocktalk-api

Backend API for a Reddit-style app for stocks/sectors, built with **NestJS + PostgreSQL + TypeORM**.

This README documents **every tool and command** used to set the project up from scratch on macOS, so you (or a teammate) can reproduce it on a clean machine.

---

## Tech stack

| Layer       | Choice                | Why                                                        |
| ----------- | --------------------- | ---------------------------------------------------------- |
| Framework   | NestJS (Node + TS)    | Structured, modular, great for a growing REST API          |
| Database    | PostgreSQL 16         | Relational data (users, posts, comments, votes, follows)   |
| ORM         | TypeORM               | First-class NestJS integration, entity-based schema        |
| Validation  | class-validator / DTO | Automatic request validation                               |
| Passwords   | bcryptjs              | Pure-JS hashing, no native build step                      |

---

## 0. Prerequisites — install the toolchain (macOS)

The project requires **Node.js**, **npm**, the **NestJS CLI**, and **PostgreSQL**.
On a fresh Mac none of these were installed (only [Homebrew](https://brew.sh) was present).

### Check what you already have

```bash
node --version      # JavaScript runtime
npm --version       # Node package manager (ships with Node)
nest --version      # NestJS CLI
psql --version      # PostgreSQL client
brew --version      # Homebrew (package manager for macOS)
```

If any command prints "command not found", install it below.

### Install Homebrew (if missing)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Install Node.js (includes npm) and PostgreSQL

```bash
brew install node postgresql@16
```

### Put PostgreSQL 16 on your PATH

`postgresql@16` is "keg-only", so add it to your shell PATH. Add this line to
`~/.zshrc` (then restart the terminal or run `source ~/.zshrc`):

```bash
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
```

### Start the PostgreSQL service

```bash
brew services start postgresql@16     # starts now + on login
# check it is running:
brew services list
```

### Install the NestJS CLI globally

```bash
npm install -g @nestjs/cli
```

Verified versions used for this project:

- Node `v26.3.0`
- npm `11.16.0`
- NestJS CLI `11.0.23`
- PostgreSQL `16.14`

---

## 1. Create the project

```bash
cd ~/Documents
nest new stocktalk-api --package-manager npm
cd stocktalk-api
```

## 2. Install project dependencies

```bash
# Database + ORM + config + validation
npm install @nestjs/typeorm typeorm pg @nestjs/config class-validator class-transformer

# Password hashing (pure JS — no native compiler needed)
npm install bcryptjs
```

## 3. Create the database

```bash
createdb stocktalk
# confirm it exists:
psql -l | grep stocktalk
```

> On a Homebrew Postgres install, your macOS username (e.g. `mac`) is a
> superuser with no password by default, which is why `DB_PASSWORD` is empty
> below. For production, create a dedicated user with a password.

## 4. Configure environment variables

Copy `.env.example` to `.env` and adjust if needed:

```bash
cp .env.example .env
```

`.env`:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=mac
DB_PASSWORD=
DB_NAME=stocktalk

# Auto-create tables from entities. DEV ONLY — use migrations in production.
DB_SYNCHRONIZE=true
```

---

## 5. Run the app

```bash
# development (auto-reload on changes)
npm run start:dev

# production-style (compiled)
npm run build
npm run start:prod
```

When it boots you should see:

```
stocktalk-api running on http://localhost:3000
```

---

## API

### Endpoint overview

| Method & path                                  | Purpose                                  |
| ---------------------------------------------- | ---------------------------------------- |
| `GET    /health`                               | Public health check                      |
| `GET    /api/health`                           | Public health check                      |
| `GET    /auth/me`                              | Current Firebase user                    |
| `POST   /storage/signed-url`                   | GCS write signed URL (Firebase token)    |
| `GET    /users/check-username?username=`       | Check if a username is available         |
| `GET    /users/:id`                            | Get a user's details                     |
| `PATCH  /users/:id`                            | Edit a user's profile                    |
| `GET    /stocks`                               | List all predefined stocks               |
| `GET    /stocks/favourites`                    | List all favourite stocks                |
| `GET    /stocks/sectors`                       | List all sectors                         |
| `GET    /stocks/search?q=`                     | Search stocks (prefix, min 3 chars)      |
| `PATCH  /stocks/:id/favourite`                 | Mark/unmark a stock as favourite         |
| `GET    /users/:userId/follows`                | List a user's followed stocks/sectors/users |
| `POST   /users/:userId/follows/stocks/:stockId`| Follow a stock                           |
| `DELETE /users/:userId/follows/stocks/:stockId`| Unfollow a stock                         |
| `POST   /users/:userId/follows/sectors/:sectorId`| Follow a sector                        |
| `DELETE /users/:userId/follows/sectors/:sectorId`| Unfollow a sector                      |
| `POST   /users/:userId/follows/users/:targetUserId`| Follow another user                  |
| `DELETE /users/:userId/follows/users/:targetUserId`| Unfollow another user                |
| `POST   /posts`                                | Create a post                            |
| `GET    /posts?feed=&userId=&page=&limit=`     | Paginated feed (all/following users/sectors) |
| `GET    /posts/:id`                            | Get a single post                        |
| `PATCH  /posts/:id`                            | Edit a post (author only)                |
| `POST   /posts/:postId/like`                   | Like a post                              |
| `POST   /posts/:postId/dislike`                | Dislike a post                           |
| `DELETE /posts/:postId/reaction`               | Remove your like/dislike                 |
| `POST   /posts/:postId/comments`               | Comment, or reply (one level deep)       |
| `GET    /posts/:postId/comments?page=&limit=`  | List comments with their replies         |

### Users

#### Create a user — `POST /users`

```json
{
  "username": "value_investor",
  "email": "vi@example.com",
  "password": "secret123",
  "fullName": "Vivian Investor",
  "investingStyle": "value",
  "bio": "Long-term value investing.",
  "youtubeLink": "https://youtube.com/@vi",
  "instagramLink": "https://instagram.com/vi",
  "websiteLink": "https://vi.example.com",
  "twitterLink": "https://twitter.com/vi",
  "profilePhotoUrl": "https://cdn.example.com/vi.png"
}
```

Validation rules:

- `username`: 3–20 chars, letters/numbers/underscore only, unique (required)
- `email`: valid email, unique (required)
- `password`: 8–64 chars, stored hashed, never returned (required)
- `fullName`: up to 100 chars (optional)
- `investingStyle`: one of `value`, `growth`, `dividend`, `day_trading`, `swing_trading`, `long_term`, `index`, `options`, `crypto` (optional)
- `bio`: up to 500 chars (optional)
- `youtubeLink` / `instagramLink` / `websiteLink` / `twitterLink` / `profilePhotoUrl`: valid URLs (optional)

Returns `201 Created` with the user (no password). Errors: `409` (duplicate), `400` (validation).

#### Check username availability — `GET /users/check-username?username=`

```bash
curl "http://localhost:3000/users/check-username?username=trader_joe"
# -> {"username":"trader_joe","available":false}
```

`username` follows the same rules as signup (3–20 chars, letters/numbers/underscore);
otherwise returns `400`.

#### Get user details — `GET /users/:id`

Returns `200` with the user, or `404` if not found.

#### Edit user — `PATCH /users/:id`

Send only the fields you want to change (all optional). Username, email, and
password are intentionally **not** editable here. Omitted fields are preserved.

```bash
curl -X PATCH http://localhost:3000/users/<id> \
  -H "Content-Type: application/json" \
  -d '{"bio":"value + dividends","investingStyle":"dividend"}'
```

Returns `200` with the updated user, or `404` if not found.

### Stocks (predefined, seeded on startup)

```bash
# All stocks
curl http://localhost:3000/stocks

# All sectors
curl http://localhost:3000/stocks/sectors

# Search by symbol or name — requires at least 3 characters
curl "http://localhost:3000/stocks/search?q=app"   # -> AAPL

# All favourite stocks
curl http://localhost:3000/stocks/favourites

# Mark / unmark a stock as favourite
curl -X PATCH http://localhost:3000/stocks/<stockId>/favourite \
  -H "Content-Type: application/json" \
  -d '{"isFavourite":true}'
```

`GET /stocks/search?q=` returns `400` if `q` is shorter than 3 characters.
Each stock has an `isFavourite` boolean (default `false`); `GET /stocks/favourites`
returns only those flagged `true`.

### Follows

```bash
# Follow a stock / sector / user  (201)
curl -X POST http://localhost:3000/users/<firebaseUid>/follows/stocks/<stockId> \
  -H "Authorization: Bearer <firebase-id-token>"
curl -X POST http://localhost:3000/users/<firebaseUid>/follows/sectors/<sectorId> \
  -H "Authorization: Bearer <firebase-id-token>"
curl -X POST http://localhost:3000/users/<firebaseUid>/follows/users/<targetFirebaseUid> \
  -H "Authorization: Bearer <firebase-id-token>"

# List follows -> { "stocks": [...], "sectors": [...], "users": [...] }
curl http://localhost:3000/users/<firebaseUid>/follows

# Unfollow  (204 No Content)
curl -X DELETE http://localhost:3000/users/<firebaseUid>/follows/stocks/<stockId> \
  -H "Authorization: Bearer <firebase-id-token>"
```

Following the same target twice is idempotent (returns the existing follow).
Unknown user/stock/sector returns `404`; following yourself returns `400`.

### Posts

Posts carry denormalized `likeCount`, `dislikeCount`, and `commentCount` so
feeds and "how many likes" reads never need aggregate queries.

```bash
# Create a post (author is the Firebase user; sectorId optional)
curl -X POST http://localhost:3000/posts \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"NVDA earnings","body":"Strong quarter.",
       "imageUrl":"https://img.example.com/n.png",
       "links":["https://example.com/a"],"sectorId":"<sectorId>"}'

# Get one post
curl http://localhost:3000/posts/<postId>

# Edit a post — only the author may edit (others get 403)
curl -X PATCH http://localhost:3000/posts/<postId> \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"NVDA earnings (edited)"}'
```

#### Feed (paginated)

`GET /posts?feed=<mode>&userId=<id>&page=1&limit=10`

| `feed` mode          | Returns                                            |
| -------------------- | -------------------------------------------------- |
| `all` (default)      | All posts, newest first                            |
| `following_users`    | Posts by users that `userId` follows               |
| `following_sectors`  | Posts in sectors that `userId` follows             |

`userId` is required for the two `following_*` modes. Response shape:

```json
{ "items": [ ... ], "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
```

### Likes / Dislikes

One reaction per user per post; liking then disliking switches it.

```bash
curl -X POST   http://localhost:3000/posts/<postId>/like     -H "Authorization: Bearer <firebase-id-token>"
curl -X POST   http://localhost:3000/posts/<postId>/dislike  -H "Authorization: Bearer <firebase-id-token>"
curl -X DELETE http://localhost:3000/posts/<postId>/reaction -H "Authorization: Bearer <firebase-id-token>"
# each returns: { postId, userId, reaction, likeCount, dislikeCount }
```

### Comments & replies (one level deep)

```bash
# Top-level comment
curl -X POST http://localhost:3000/posts/<postId>/comments \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{"body":"Great call!"}'

# Reply to a top-level comment (pass parentCommentId)
curl -X POST http://localhost:3000/posts/<postId>/comments \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{"body":"Thanks!","parentCommentId":"<commentId>"}'
# Replying to a reply returns 400 (max depth = 1).

# List top-level comments (paginated), each with its replies
curl "http://localhost:3000/posts/<postId>/comments?page=1&limit=10"
```

### Create a user (minimal) with curl

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"username":"trader_joe","email":"joe@example.com","password":"secret123"}'
```

---

## Project structure

```
stocktalk-api/
├── .env                       # local environment variables (not committed)
├── .env.example               # template for .env
├── src/
│   ├── app.module.ts          # root module — config + TypeORM + feature modules
│   ├── main.ts                # bootstrap + global validation pipe
│   ├── users/
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts   # create payload + validation
│   │   │   └── update-user.dto.ts   # profile edit payload (partial)
│   │   ├── entities/
│   │   │   └── user.entity.ts       # "users" table + InvestingStyle enum
│   │   ├── users.controller.ts      # POST / GET :id / PATCH :id
│   │   ├── users.service.ts         # hashing, create, find, update
│   │   └── users.module.ts
│   ├── stocks/
│   │   ├── entities/
│   │   │   ├── sector.entity.ts     # "sectors" table
│   │   │   └── stock.entity.ts      # "stocks" table (-> sector)
│   │   ├── stocks.seed.ts           # predefined sectors + stocks
│   │   ├── stocks.controller.ts     # GET / sectors / search
│   │   ├── stocks.service.ts        # seeding + queries + search
│   │   └── stocks.module.ts
│   ├── follows/
│   │   ├── entities/
│   │   │   └── follow.entity.ts     # "follows" (user -> stock|sector|user)
│   │   ├── follows.controller.ts    # follow / unfollow / list
│   │   ├── follows.service.ts
│   │   └── follows.module.ts
│   └── posts/
│       ├── entities/
│       │   ├── post.entity.ts           # "posts" (+ denormalized counters)
│       │   ├── post-reaction.entity.ts  # "post_reactions" (like|dislike)
│       │   └── comment.entity.ts        # "comments" (self-ref, depth 1)
│       ├── dto/                         # create/update/feed/reaction/comment
│       ├── posts.controller.ts          # POST / feed / GET :id / PATCH :id
│       ├── posts.service.ts             # create, edit-by-owner, feed
│       ├── reactions.controller.ts      # like / dislike / remove
│       ├── reactions.service.ts         # reaction + counter maintenance
│       ├── comments.controller.ts       # comment / reply / list
│       ├── comments.service.ts          # depth-1 replies + counters
│       └── posts.module.ts
└── README.md
```

### Data model (tables)

```
users        — accounts + profile
sectors      — predefined market sectors
stocks       — predefined tickers (-> sector)
follows      — polymorphic: a user follows a stock | sector | user
posts        — author -> user, optional -> sector, like/dislike/comment counts
post_reactions — one (user, post) row, type = like | dislike
comments     — post -> comment, optional parent (one level of replies)
```

---

## Authentication (Firebase ID token)

Android signs in with **Firebase Google Sign-In** and sends the **Firebase ID token** on every protected request. The backend verifies it with the Firebase Admin SDK. There is **no custom backend JWT**.

```
[ Android App ] --(Google Sign-In)--> [ Firebase Auth ]
       |
       |  Authorization: Bearer <Firebase ID token>
       v
[ NestJS API ] -- verifyIdToken --> [ users.id = Firebase uid ]
```

`users.id` in PostgreSQL is the Firebase Auth UID.

### Environment

Firebase Admin uses **Application Default Credentials** (no JSON path in code).

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
```

Local:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-service-account.json
```

Cloud Run uses the runtime service account automatically. Grant it **Firebase Admin** (or a custom role that can verify ID tokens).

### Android flow

1. Google Sign-In via Firebase Auth
2. `FirebaseAuth.getInstance().currentUser.getIdToken(true)`
3. Call the API with:

```http
Authorization: Bearer <firebase-id-token>
```

On the first authenticated request, the API creates a `users` row with `id = uid` if it does not exist.

### `GET /auth/me` (protected)

Returns `{ uid, email, roles, user }` for the current Firebase user.

### Public vs protected

All routes require a Firebase ID token **except** those marked `@Public()`:

| Route | Purpose |
| ----- | ------- |
| `GET /` | Hello |
| `GET /health`, `GET /api/health` | Health checks |
| `GET /stocks`, `/stocks/favourites`, `/stocks/sectors`, `/stocks/search` | Stock metadata |
| `GET /posts`, `GET /posts/:id` | Public feed / post |
| `GET /posts/:postId/comments` | Read comments |
| `GET /users/check-username`, `GET /users/:id` | Username / public profile |
| `GET /users/:userId/follows` | Public follow list |

Protected routes use `@GetUser()` for `{ uid, email, roles, user }`. Actor IDs (posts, comments, reactions, follows, signed URLs) come from `auth.uid`, not from the request body.

Error shape:

```json
{ "error": { "code": "UNAUTHORIZED", "message": "Invalid or expired Firebase token" } }
```

---

## Image uploads (GCS signed URLs)

Authenticated clients request a **write-only V4 signed URL**, then upload directly to Google Cloud Storage with `PUT` (no file bytes through the API).

### Environment variables

```env
GCS_BUCKET_NAME=stocktalk-uploads
```

GCS also uses ADC. The Cloud Run service account needs **Storage Object Admin** (or object create) plus **Service Account Token Creator** so it can mint V4 signed URLs.

### `POST /storage/signed-url` (protected)

**Request**

```http
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "fileName": "photo.jpg",
  "contentType": "image/jpeg"
}
```

Allowed `contentType` values: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.

**Response**

```json
{
  "uploadUrl": "https://storage.googleapis.com/...",
  "objectName": "uploads/<userId>/<uuid>.jpg",
  "publicUrl": "https://storage.googleapis.com/<bucket>/uploads/<userId>/<uuid>.jpg",
  "contentType": "image/jpeg",
  "expiresInSeconds": 900
}
```

**Android upload**

```http
PUT <uploadUrl>
Content-Type: image/jpeg

<binary image data>
```

Then save `publicUrl` in your post/profile record via the normal API.

### GCS bucket CORS (required for Android direct PUT)

Apply the CORS config in `config/gcs-cors.json`:

```json
[
  {
    "origin": ["*"],
    "method": ["PUT", "OPTIONS"],
    "responseHeader": ["Content-Type", "x-goog-resumable"],
    "maxAgeSeconds": 3600
  }
]
```

For production, replace `"origin": ["*"]` with your app package / domain if applicable.

```bash
gcloud storage buckets update gs://YOUR_BUCKET_NAME \
  --cors-file=config/gcs-cors.json \
  --project=tradefeedapi
```

---

## GCP setup (Cloud Run)

### 1. Create a GCS bucket

```bash
gcloud storage buckets create gs://stocktalk-uploads \
  --location=asia-south1 \
  --uniform-bucket-level-access \
  --project=tradefeedapi
```

### 2. Apply CORS

```bash
gcloud storage buckets update gs://stocktalk-uploads \
  --cors-file=config/gcs-cors.json \
  --project=tradefeedapi
```

### 3. Grant the Cloud Run service account bucket + token-creator access

```bash
PROJECT_NUMBER=1081340460644
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud storage buckets add-iam-policy-binding gs://stocktalk-uploads \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/storage.objectAdmin" \
  --project=tradefeedapi

gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/iam.serviceAccountTokenCreator" \
  --project=tradefeedapi
```

### 4. Update Cloud Run env (ADC, no mounted JSON keys)

```bash
gcloud run services update stocktalk-api \
  --region=asia-south1 \
  --project=tradefeedapi \
  --update-env-vars="GCS_BUCKET_NAME=stocktalk-uploads,FIREBASE_PROJECT_ID=tradefeedapi,DB_SYNCHRONIZE=false" \
  --remove-env-vars="GCS_KEYFILE_PATH,FIREBASE_CREDENTIALS_PATH,JWT_SECRET,JWT_EXPIRATION"
```

### 5. Deploy

```bash
gcloud builds submit \
  --tag asia-south1-docker.pkg.dev/tradefeedapi/stocktalk/stocktalk-api:latest \
  --project=tradefeedapi

gcloud run deploy stocktalk-api \
  --image=asia-south1-docker.pkg.dev/tradefeedapi/stocktalk/stocktalk-api:latest \
  --region=asia-south1 \
  --project=tradefeedapi
```

---

## Database migrations

This release sets `users.id` to the Firebase UID and drops `firebase_uid`.

```bash
npm run migration:run
```

On live Cloud SQL (via proxy):

```bash
cloud-sql-proxy tradefeedapi:asia-south1:stocktalk-db
DB_HOST=127.0.0.1 DB_USERNAME=stocktalk DB_PASSWORD='...' DB_NAME=stocktalk npm run migration:run
```

Keep a backup before running. Revert is not supported; restore from backup if needed.

If `DB_SYNCHRONIZE=true` locally, TypeORM may apply schema changes automatically. Use `false` in production.

---

## Useful commands

| Command                          | What it does                          |
| -------------------------------- | ------------------------------------- |
| `npm run start:dev`              | Run with hot reload                   |
| `npm run build`                  | Compile TypeScript to `dist/`         |
| `npm run start:prod`             | Run the compiled app                  |
| `npm run lint`                   | Lint the code                         |
| `brew services start postgresql@16` | Start the database                 |
| `brew services stop postgresql@16`  | Stop the database                  |
| `npm run migration:run`          | Apply pending DB migrations           |
| `npm run migration:show`         | Show migration status                 |
| `psql stocktalk`                 | Open a SQL shell on the database      |

---

## Next steps (suggested roadmap)

1. Set up **Cloud Build trigger** on push to `main` for auto-deploy
2. Restrict GCS bucket CORS origins for production
3. Add read signed URLs for private objects if needed
