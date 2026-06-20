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
| `POST   /users`                                | Create a user (with profile fields)      |
| `GET    /users/:id`                            | Get a user's details                     |
| `PATCH  /users/:id`                            | Edit a user's profile                    |
| `GET    /stocks`                               | List all predefined stocks               |
| `GET    /stocks/sectors`                       | List all sectors                         |
| `GET    /stocks/search?q=`                     | Search stocks (prefix, min 3 chars)      |
| `GET    /users/:userId/follows`                | List a user's followed stocks + sectors  |
| `POST   /users/:userId/follows/stocks/:stockId`| Follow a stock                           |
| `DELETE /users/:userId/follows/stocks/:stockId`| Unfollow a stock                         |
| `POST   /users/:userId/follows/sectors/:sectorId`| Follow a sector                        |
| `DELETE /users/:userId/follows/sectors/:sectorId`| Unfollow a sector                      |

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
```

`GET /stocks/search?q=` returns `400` if `q` is shorter than 3 characters.

### Follows

```bash
# Follow a stock / sector  (201)
curl -X POST http://localhost:3000/users/<userId>/follows/stocks/<stockId>
curl -X POST http://localhost:3000/users/<userId>/follows/sectors/<sectorId>

# List follows -> { "stocks": [...], "sectors": [...] }
curl http://localhost:3000/users/<userId>/follows

# Unfollow  (204 No Content)
curl -X DELETE http://localhost:3000/users/<userId>/follows/stocks/<stockId>
curl -X DELETE http://localhost:3000/users/<userId>/follows/sectors/<sectorId>
```

Following the same target twice is idempotent (returns the existing follow).
Unknown user/stock/sector returns `404`.

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
│   └── follows/
│       ├── entities/
│       │   └── follow.entity.ts     # "follows" table (user -> stock|sector)
│       ├── follows.controller.ts    # follow / unfollow / list
│       ├── follows.service.ts
│       └── follows.module.ts
└── README.md
```

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
| `psql stocktalk`                 | Open a SQL shell on the database      |

---

## Next steps (suggested roadmap)

1. `POST /auth/login` + JWT auth (`@nestjs/jwt`, `passport`)
2. `Sector` and `Stock` entities + follow/unfollow endpoints
3. `Post` and `Comment` entities (threaded comments) tied to a stock/sector
4. Upvote/downvote with Redis counters
5. Feed endpoint (posts from followed sectors/stocks)
6. Switch `DB_SYNCHRONIZE=false` and adopt TypeORM **migrations** for production
```
