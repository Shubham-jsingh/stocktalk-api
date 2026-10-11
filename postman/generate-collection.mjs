#!/usr/bin/env node
/**
 * Writes postman/stocktalk-api.postman_collection.json
 * Run: node postman/generate-collection.mjs
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const dir = dirname(fileURLToPath(import.meta.url));

function url(path, query) {
  const raw = query?.length
    ? `{{baseUrl}}${path}?${query.map((q) => `${q.key}=${q.value}`).join('&')}`
    : `{{baseUrl}}${path}`;
  const segments = path.replace(/^\//, '').split('/').filter(Boolean);
  return {
    raw,
    host: ['{{baseUrl}}'],
    path: segments,
    ...(query ? { query } : {}),
  };
}

function jsonBody(obj) {
  return {
    mode: 'raw',
    raw: JSON.stringify(obj, null, 2),
    options: { raw: { language: 'json' } },
  };
}

function tests(script) {
  return [
    {
      listen: 'test',
      script: { type: 'text/javascript', exec: script.trim().split('\n') },
    },
  ];
}

function req(name, method, path, opts = {}) {
  const item = {
    name,
    request: {
      method,
      header: opts.body
        ? [{ key: 'Content-Type', value: 'application/json' }]
        : [],
      url: url(path, opts.query),
      description: opts.description || '',
    },
  };
  if (opts.auth === 'public') {
    item.request.auth = { type: 'noauth' };
  }
  if (opts.body) {
    item.request.body = jsonBody(opts.body);
  }
  if (opts.tests) {
    item.event = tests(opts.tests);
  }
  return item;
}

const statusOk = `
pm.test('status is 2xx', () => {
  pm.expect(pm.response.code).to.be.within(200, 299);
});
`;

const savePostId = `
pm.test('status is 2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));
if (pm.response.code === 200 || pm.response.code === 201) {
  const j = pm.response.json();
  if (j && j.id) pm.collectionVariables.set('postId', j.id);
}
`;

const collection = {
  info: {
    name: 'StockTalk API',
    description: [
      'Every HTTP route in stocktalk-api, plus query/body variants (GET filters, POST create shapes, PATCH fields).',
      '',
      '1. Import this file and **StockTalk Local** or **StockTalk Production**.',
      '2. Set `firebaseIdToken` (Firebase ID token JWT).',
      '3. Run Health → Auth → Stocks → Sectors first so ids are saved.',
      '4. Bearer auth is collection-level. Health is public (`noauth`).',
      '',
      'Listen port defaults to **8080**.',
    ].join('\n'),
    schema:
      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: {
    type: 'bearer',
    bearer: [{ key: 'token', value: '{{firebaseIdToken}}', type: 'string' }],
  },
  variable: [
    { key: 'myUserId', value: '' },
    { key: 'stockId', value: '' },
    { key: 'stockSymbol', value: 'AAPL' },
    { key: 'sectorId', value: '' },
    { key: 'sectorSlug', value: 'technology' },
    { key: 'postId', value: '' },
    { key: 'commentId', value: '' },
    { key: 'mentionUserId', value: '' },
    { key: 'targetUserId', value: '' },
    { key: 'nextCursor', value: '' },
  ],
  item: [
    {
      name: 'Health (public) — GET',
      item: [
        req('GET /', 'GET', '/', {
          auth: 'public',
          description: 'Root hello. No auth.',
          tests: statusOk,
        }),
        req('GET /health', 'GET', '/health', {
          auth: 'public',
          tests: `
pm.test('status ok', () => {
  pm.response.to.have.status(200);
  pm.expect(pm.response.json().status).to.eql('ok');
});
`,
        }),
        req('GET /api/health', 'GET', '/api/health', {
          auth: 'public',
          tests: `
pm.test('status ok', () => {
  pm.response.to.have.status(200);
  pm.expect(pm.response.json().status).to.eql('ok');
});
`,
        }),
      ],
    },
    {
      name: 'Auth — GET',
      item: [
        req('GET /auth/me', 'GET', '/auth/me', {
          description:
            'Only auth route. Verifies Firebase token and upserts Postgres user.',
          tests: `
pm.test('authenticated profile', () => {
  pm.response.to.have.status(200);
  const j = pm.response.json();
  pm.expect(j.uid).to.be.a('string');
  pm.collectionVariables.set('myUserId', j.user && j.user.id ? j.user.id : j.uid);
});
`,
        }),
      ],
    },
    {
      name: 'Users — GET POST PATCH',
      item: [
        req('GET /users/check-username', 'GET', '/users/check-username', {
          query: [{ key: 'username', value: 'trader_joe' }],
          tests: statusOk,
        }),
        req(
          'GET /users/check-username invalid (400)',
          'GET',
          '/users/check-username',
          {
            query: [{ key: 'username', value: 'ab' }],
            tests: `pm.test('invalid username', () => pm.response.to.have.status(400));`,
          },
        ),
        req('GET /users/search', 'GET', '/users/search', {
          query: [{ key: 'q', value: 'tra' }],
          description: 'Prefix, min 3 chars. Saves mentionUserId / targetUserId.',
          tests: `
pm.test('search users', () => {
  pm.response.to.have.status(200);
  const users = pm.response.json();
  pm.expect(users).to.be.an('array');
  const me = pm.collectionVariables.get('myUserId');
  const other = users.find((u) => u.id && u.id !== me) || users[0];
  if (other && other.id) {
    pm.collectionVariables.set('mentionUserId', other.id);
    pm.collectionVariables.set('targetUserId', other.id);
  }
});
`,
        }),
        req('GET /users/search too short (400)', 'GET', '/users/search', {
          query: [{ key: 'q', value: 'ab' }],
          tests: `pm.test('min 3 chars', () => pm.response.to.have.status(400));`,
        }),
        req('GET /users/:id', 'GET', '/users/{{myUserId}}', {
          tests: statusOk,
        }),
        req('PATCH /users/me (bio + style)', 'PATCH', '/users/me', {
          body: { bio: 'Value + dividends', investingStyle: 'dividend' },
          tests: statusOk,
        }),
        req('PATCH /users/me (profile links)', 'PATCH', '/users/me', {
          body: {
            fullName: 'Postman Trader',
            youtubeLink: 'https://youtube.com/@postman',
            twitterLink: 'https://twitter.com/postman',
            websiteLink: 'https://example.com',
            instagramLink: 'https://instagram.com/postman',
            profilePhotoUrl: 'https://example.com/photo.png',
          },
          tests: statusOk,
        }),
        req('POST /users (legacy)', 'POST', '/users', {
          description:
            'Legacy email/password create. Still requires Firebase Bearer. Not a Firebase UID.',
          body: {
            username: 'postman_user',
            email: 'postman@example.com',
            password: 'secret123',
            fullName: 'Postman User',
            investingStyle: 'value',
            bio: 'Created from Postman',
          },
        }),
      ],
    },
    {
      name: 'Stocks — GET PATCH',
      item: [
        req('GET /stocks (page + limit)', 'GET', '/stocks', {
          query: [
            { key: 'page', value: '1' },
            { key: 'limit', value: '10' },
          ],
          tests: `
pm.test('paginated stocks', () => {
  pm.response.to.have.status(200);
  const j = pm.response.json();
  pm.expect(j.items).to.be.an('array');
  const item = j.items[0];
  if (item) {
    pm.collectionVariables.set('stockId', item.id);
    if (item.symbol) pm.collectionVariables.set('stockSymbol', item.symbol);
    if (item.sectorId) pm.collectionVariables.set('sectorId', item.sectorId);
  }
});
`,
        }),
        req('GET /stocks?sector=slug', 'GET', '/stocks', {
          query: [
            { key: 'sector', value: 'technology' },
            { key: 'page', value: '1' },
            { key: 'limit', value: '10' },
          ],
          tests: statusOk,
        }),
        req('GET /stocks?sectorId=', 'GET', '/stocks', {
          query: [
            { key: 'sectorId', value: '{{sectorId}}' },
            { key: 'page', value: '1' },
            { key: 'limit', value: '10' },
          ],
          tests: statusOk,
        }),
        req('GET /stocks both sector filters (400)', 'GET', '/stocks', {
          description: 'sectorId and sector together are rejected.',
          query: [
            { key: 'sectorId', value: '{{sectorId}}' },
            { key: 'sector', value: 'technology' },
          ],
          tests: `pm.test('conflict', () => pm.response.to.have.status(400));`,
        }),
        req('GET /stocks/favourites', 'GET', '/stocks/favourites', {
          query: [
            { key: 'page', value: '1' },
            { key: 'limit', value: '10' },
          ],
          tests: statusOk,
        }),
        req('GET /stocks/sectors (legacy)', 'GET', '/stocks/sectors', {
          description: 'Deprecated. Prefer GET /sectors.',
          tests: statusOk,
        }),
        req('GET /stocks/search', 'GET', '/stocks/search', {
          query: [{ key: 'q', value: 'aap' }],
          tests: `
pm.test('search stocks', () => {
  pm.response.to.have.status(200);
  const rows = pm.response.json();
  pm.expect(rows).to.be.an('array');
  if (rows[0]) pm.collectionVariables.set('stockId', rows[0].id);
});
`,
        }),
        req('GET /stocks/search too short (400)', 'GET', '/stocks/search', {
          query: [{ key: 'q', value: 'aa' }],
          tests: `pm.test('min 3 chars', () => pm.response.to.have.status(400));`,
        }),
        req('GET /stocks/:id', 'GET', '/stocks/{{stockId}}', {
          tests: `
pm.test('one stock', () => {
  pm.response.to.have.status(200);
  const j = pm.response.json();
  pm.expect(j).to.have.property('about');
  pm.expect(j).to.have.property('marketCap');
});
`,
        }),
        req('PATCH /stocks/:id/favourite true', 'PATCH', '/stocks/{{stockId}}/favourite', {
          body: { isFavourite: true },
          tests: statusOk,
        }),
        req('PATCH /stocks/:id/favourite false', 'PATCH', '/stocks/{{stockId}}/favourite', {
          body: { isFavourite: false },
          tests: statusOk,
        }),
      ],
    },
    {
      name: 'Sectors — GET',
      item: [
        req('GET /sectors', 'GET', '/sectors', {
          query: [
            { key: 'page', value: '1' },
            { key: 'limit', value: '10' },
          ],
          tests: `
pm.test('paginated sectors', () => {
  pm.response.to.have.status(200);
  const j = pm.response.json();
  const item = j.items && j.items[0];
  if (item) {
    pm.collectionVariables.set('sectorId', item.id);
    if (item.slug) pm.collectionVariables.set('sectorSlug', item.slug);
  }
});
`,
        }),
        req('GET /sectors/:slug', 'GET', '/sectors/{{sectorSlug}}', {
          tests: statusOk,
        }),
        req('GET /sectors/:id', 'GET', '/sectors/{{sectorId}}', {
          description: 'Same route as slug; UUID lookup.',
          tests: statusOk,
        }),
        req('GET /sectors/:slug/stocks', 'GET', '/sectors/{{sectorSlug}}/stocks', {
          query: [
            { key: 'page', value: '1' },
            { key: 'limit', value: '10' },
          ],
          tests: statusOk,
        }),
        req('GET /sectors/:id/stocks', 'GET', '/sectors/{{sectorId}}/stocks', {
          query: [
            { key: 'page', value: '1' },
            { key: 'limit', value: '10' },
          ],
          tests: statusOk,
        }),
      ],
    },
    {
      name: 'Follows — GET POST DELETE',
      item: [
        req('POST /follows/stocks/:stockId', 'POST', '/follows/stocks/{{stockId}}', {
          tests: statusOk,
        }),
        req('POST /follows/sectors/:sectorId', 'POST', '/follows/sectors/{{sectorId}}', {
          tests: statusOk,
        }),
        req('POST /follows/users/:targetUserId', 'POST', '/follows/users/{{targetUserId}}', {
          description: 'Needs another user. 400 if you follow yourself.',
        }),
        req('GET /follows', 'GET', '/follows', {
          tests: `
pm.test('list follows', () => {
  pm.response.to.have.status(200);
  const j = pm.response.json();
  pm.expect(j).to.include.keys('stocks', 'sectors', 'users');
});
`,
        }),
        req('DELETE /follows/stocks/:stockId', 'DELETE', '/follows/stocks/{{stockId}}', {
          tests: `pm.test('204', () => pm.response.to.have.status(204));`,
        }),
        req('DELETE /follows/sectors/:sectorId', 'DELETE', '/follows/sectors/{{sectorId}}', {
          tests: `pm.test('204', () => pm.response.to.have.status(204));`,
        }),
        req('DELETE /follows/users/:targetUserId', 'DELETE', '/follows/users/{{targetUserId}}'),
      ],
    },
    {
      name: 'Posts — POST create variants',
      item: [
        req('POST /posts (title + body only)', 'POST', '/posts', {
          body: { title: 'Plain post', body: 'No tags or mentions.' },
          tests: savePostId,
        }),
        req('POST /posts with imageUrl + links', 'POST', '/posts', {
          body: {
            title: 'Post with media',
            body: 'Has image and links.',
            imageUrl: 'https://example.com/chart.png',
            links: ['https://example.com/a', 'https://example.com/b'],
          },
          tests: savePostId,
        }),
        req('POST /posts with sectorId', 'POST', '/posts', {
          body: {
            title: 'Sector tagged',
            body: 'Tagged with a sector.',
            sectorId: '{{sectorId}}',
          },
          tests: savePostId,
        }),
        req('POST /posts with stockId', 'POST', '/posts', {
          body: {
            title: 'Stock tagged',
            body: 'Tagged with a stock.',
            stockId: '{{stockId}}',
          },
          tests: savePostId,
        }),
        req('POST /posts with sectorId + stockId', 'POST', '/posts', {
          body: {
            title: 'Both tags',
            body: 'Sector and stock.',
            sectorId: '{{sectorId}}',
            stockId: '{{stockId}}',
          },
          tests: savePostId,
        }),
        req('POST /posts with mentionedUserIds', 'POST', '/posts', {
          description: 'Max 3 unique ids. Not yourself. Unknown id → 404.',
          body: {
            title: 'Mention post',
            body: 'Hello @user',
            mentionedUserIds: ['{{mentionUserId}}'],
          },
          tests: savePostId,
        }),
        req('POST /posts full payload', 'POST', '/posts', {
          body: {
            title: 'Full postman post',
            body: 'All optional fields.',
            imageUrl: 'https://example.com/n.png',
            links: ['https://example.com/a'],
            sectorId: '{{sectorId}}',
            stockId: '{{stockId}}',
            mentionedUserIds: ['{{mentionUserId}}'],
          },
          tests: savePostId,
        }),
        req('POST /posts mention self (400)', 'POST', '/posts', {
          body: {
            title: 'Self mention',
            body: 'Should fail.',
            mentionedUserIds: ['{{myUserId}}'],
          },
          tests: `pm.test('cannot mention self', () => pm.response.to.have.status(400));`,
        }),
      ],
    },
    {
      name: 'Posts — GET feed variants',
      item: [
        req('GET /posts feed=all order=desc', 'GET', '/posts', {
          query: [
            { key: 'feed', value: 'all' },
            { key: 'order', value: 'desc' },
            { key: 'limit', value: '10' },
          ],
          tests: `
pm.test('feed', () => {
  pm.response.to.have.status(200);
  const j = pm.response.json();
  pm.expect(j.items).to.be.an('array');
  if (j.items[0]) pm.collectionVariables.set('postId', j.items[0].id);
  if (j.nextCursor) pm.collectionVariables.set('nextCursor', j.nextCursor);
});
`,
        }),
        req('GET /posts feed=all order=asc', 'GET', '/posts', {
          query: [
            { key: 'feed', value: 'all' },
            { key: 'order', value: 'asc' },
            { key: 'limit', value: '10' },
          ],
          tests: statusOk,
        }),
        req('GET /posts?sectorIds=', 'GET', '/posts', {
          query: [
            { key: 'feed', value: 'all' },
            { key: 'sectorIds', value: '{{sectorId}}' },
            { key: 'limit', value: '10' },
          ],
          tests: statusOk,
        }),
        req('GET /posts?stockIds=', 'GET', '/posts', {
          query: [
            { key: 'feed', value: 'all' },
            { key: 'stockIds', value: '{{stockId}}' },
            { key: 'limit', value: '10' },
          ],
          tests: statusOk,
        }),
        req('GET /posts?sectorIds=&stockIds=', 'GET', '/posts', {
          query: [
            { key: 'feed', value: 'all' },
            { key: 'sectorIds', value: '{{sectorId}}' },
            { key: 'stockIds', value: '{{stockId}}' },
            { key: 'limit', value: '10' },
          ],
          tests: statusOk,
        }),
        req('GET /posts feed=following', 'GET', '/posts', {
          query: [
            { key: 'feed', value: 'following' },
            { key: 'limit', value: '10' },
          ],
          tests: statusOk,
        }),
        req('GET /posts feed=following_users', 'GET', '/posts', {
          query: [
            { key: 'feed', value: 'following_users' },
            { key: 'limit', value: '10' },
          ],
          tests: statusOk,
        }),
        req('GET /posts feed=following_sectors', 'GET', '/posts', {
          query: [
            { key: 'feed', value: 'following_sectors' },
            { key: 'limit', value: '10' },
          ],
          tests: statusOk,
        }),
        req('GET /posts feed=following + filters', 'GET', '/posts', {
          query: [
            { key: 'feed', value: 'following' },
            { key: 'sectorIds', value: '{{sectorId}}' },
            { key: 'stockIds', value: '{{stockId}}' },
            { key: 'limit', value: '10' },
          ],
          tests: statusOk,
        }),
        req('GET /posts with cursor', 'GET', '/posts', {
          query: [
            { key: 'feed', value: 'all' },
            { key: 'limit', value: '10' },
            { key: 'cursor', value: '{{nextCursor}}' },
          ],
        }),
      ],
    },
    {
      name: 'Posts — GET one + PATCH variants',
      item: [
        req('GET /posts/:id', 'GET', '/posts/{{postId}}', {
          tests: `
pm.test('one post', () => {
  pm.response.to.have.status(200);
  pm.expect(pm.response.json()).to.have.property('mentions');
});
`,
        }),
        req('PATCH /posts/:id title', 'PATCH', '/posts/{{postId}}', {
          body: { title: 'Edited title' },
          tests: statusOk,
        }),
        req('PATCH /posts/:id body', 'PATCH', '/posts/{{postId}}', {
          body: { body: 'Edited body from Postman.' },
          tests: statusOk,
        }),
        req('PATCH /posts/:id imageUrl + links', 'PATCH', '/posts/{{postId}}', {
          body: {
            imageUrl: 'https://example.com/edited.png',
            links: ['https://example.com/edited'],
          },
          tests: statusOk,
        }),
        req('PATCH /posts/:id sectorId + stockId', 'PATCH', '/posts/{{postId}}', {
          body: { sectorId: '{{sectorId}}', stockId: '{{stockId}}' },
          tests: statusOk,
        }),
        req('PATCH /posts/:id clear tags', 'PATCH', '/posts/{{postId}}', {
          description: 'null clears optional FKs.',
          body: { sectorId: null, stockId: null },
          tests: statusOk,
        }),
        req('PATCH /posts/:id mentionedUserIds', 'PATCH', '/posts/{{postId}}', {
          body: { mentionedUserIds: ['{{mentionUserId}}'] },
          tests: statusOk,
        }),
        req('PATCH /posts/:id clear mentions', 'PATCH', '/posts/{{postId}}', {
          body: { mentionedUserIds: [] },
          tests: statusOk,
        }),
      ],
    },
    {
      name: 'Reactions — POST DELETE',
      item: [
        req('POST /posts/:postId/like', 'POST', '/posts/{{postId}}/like', {
          tests: statusOk,
        }),
        req('POST /posts/:postId/dislike', 'POST', '/posts/{{postId}}/dislike', {
          tests: statusOk,
        }),
        req('DELETE /posts/:postId/like', 'DELETE', '/posts/{{postId}}/like', {
          tests: statusOk,
        }),
        req('DELETE /posts/:postId/reaction', 'DELETE', '/posts/{{postId}}/reaction', {
          tests: statusOk,
        }),
      ],
    },
    {
      name: 'Comments — GET POST',
      item: [
        req('POST comment (body only)', 'POST', '/posts/{{postId}}/comments', {
          body: { body: 'Comment without mention.' },
          tests: `
pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));
const j = pm.response.json();
if (j && j.id) pm.collectionVariables.set('commentId', j.id);
`,
        }),
        req('POST comment with mentionedUserIds', 'POST', '/posts/{{postId}}/comments', {
          body: {
            body: 'Comment with a mention.',
            mentionedUserIds: ['{{mentionUserId}}'],
          },
          tests: `
pm.test('2xx', () => pm.expect(pm.response.code).to.be.within(200, 299));
const j = pm.response.json();
if (j && j.id) pm.collectionVariables.set('commentId', j.id);
`,
        }),
        req('POST comment reply', 'POST', '/posts/{{postId}}/comments', {
          body: { body: 'Thanks!', parentCommentId: '{{commentId}}' },
          tests: statusOk,
        }),
        req('POST reply with mention', 'POST', '/posts/{{postId}}/comments', {
          body: {
            body: 'Reply with mention.',
            parentCommentId: '{{commentId}}',
            mentionedUserIds: ['{{mentionUserId}}'],
          },
          tests: statusOk,
        }),
        req('GET comments page 1', 'GET', '/posts/{{postId}}/comments', {
          query: [
            { key: 'page', value: '1' },
            { key: 'limit', value: '10' },
          ],
          tests: `
pm.test('thread', () => {
  pm.response.to.have.status(200);
  const j = pm.response.json();
  pm.expect(j.items).to.be.an('array');
});
`,
        }),
        req('GET comments page 2', 'GET', '/posts/{{postId}}/comments', {
          query: [
            { key: 'page', value: '2' },
            { key: 'limit', value: '5' },
          ],
          tests: statusOk,
        }),
      ],
    },
    {
      name: 'Storage — POST',
      item: [
        req('POST /storage/signed-url', 'POST', '/storage/signed-url', {
          description: 'Needs GCS credentials on the server.',
          body: {
            fileName: 'postman-test.png',
            contentType: 'image/png',
          },
        }),
      ],
    },
  ],
};

const out = join(dir, 'stocktalk-api.postman_collection.json');
writeFileSync(out, JSON.stringify(collection, null, 2) + '\n');
console.log('Wrote', out);
