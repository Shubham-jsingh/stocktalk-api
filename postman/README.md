# Postman — StockTalk API

## Import

1. Postman → **Import**
2. Add:
   - `postman/StockTalk-API.postman_collection.json`
   - `postman/local.postman_environment.json`
   - `postman/production.postman_environment.json`
3. Select environment **StockTalk Local** (or Production).
4. Set **`firebaseIdToken`** to a Firebase **ID token** (JWT), not the Web API key and not a password.

Local API default port is **8080** (`PORT` in `.env`). If you run on 3000, change `baseUrl`.

## Token

From the Android app: `FirebaseAuth.getInstance().currentUser.getIdToken(true)`.

Or Firebase Auth REST (email/password enabled):

```bash
curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=YOUR_WEB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-password","returnSecureToken":true}'
```

Copy `idToken` into the environment. Tokens expire in about **1 hour**.

## Run order (Collection Runner)

Only **GET /**, **GET /health**, and **GET /api/health** are public. Everything else needs Bearer auth.

Suggested order (folders are already in this sequence):

1. Health (GET)
2. **Auth → GET /auth/me**
3. Users (GET / POST / PATCH)
4. Stocks (GET filters + PATCH favourite)
5. Sectors (slug and UUID)
6. Follows (GET / POST / DELETE)
7. Posts create (POST variants) → feed (GET query variants) → GET one / PATCH variants
8. Reactions (POST / DELETE)
9. Comments (POST variants + GET pages)
10. Storage (POST)

Every unique controller route is included. Extra requests are **query/body variants** of the same path (`GET /posts?feed=…`, `POST /posts` with/without tags, `PATCH` field groups).

Collection scripts save `postId`, `commentId`, `nextCursor` from responses.

**Follow another user** and **mention** need a second user in the database. If `targetUserId` is empty or is you, follow-user returns `400`.

**POST /users** is a legacy create path; it still requires a Firebase Bearer token.

## Regenerate the collection

```bash
node postman/generate-collection.mjs
```
