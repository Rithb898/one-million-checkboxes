# One Million Checkboxes

## Project Overview
A real-time web application inspired by the "1 Million Checkboxes" concept. Users see a very large checkbox grid, authenticate using OIDC/OAuth 2.0, and toggle checkboxes with updates synchronized live to all connected clients.

The project demonstrates practical system design around real-time communication, Redis-backed coordination, custom rate limiting, and session-based auth.

## Live Links
- GitHub Repository: `https://github.com/Rithb898/one-million-checkboxes`
- Live App: `https://one-million-checkboxes.rithbanerjee.site/`
- Demo Video (YouTube Unlisted): `<add-your-youtube-unlisted-link>`

## Tech Stack
- Frontend: HTML, CSS (Tailwind CDN), Vanilla JavaScript
- Backend: Node.js, Express
- Real-time: Socket.IO (WebSockets)
- Data/Coordination: Redis (state + Pub/Sub)
- Authentication: OIDC / OAuth 2.0 + express-session

## Features Implemented
- Large checkbox grid (1,000,000 target) with incremental/lazy rendering in batches
- Real-time checkbox updates across connected clients
- Redis state persistence for checkbox array
- Redis Pub/Sub fan-out across server instances
- OIDC login/logout flow
- Session-based user auth and protected interactions
- Anonymous users can view but cannot toggle checkboxes
- Custom WebSocket rate limiting (socket ID + fixed time window)
- Custom HTTP rate limiting (IP/user + fixed time window)
- Socket/session integration so authenticated state applies to socket events

## How to Run Locally
1. Clone repository
```bash
git clone https://github.com/Rithb898/one-million-checkboxes.git
cd one-million-checkboxes
```
2. Install dependencies
```bash
pnpm install
```
3. Configure environment
```bash
cp .env.example .env
# then edit .env values
```
4. Run Redis locally (example)
```bash
docker run --name omc-redis -p 6379:6379 -d redis:7
```
5. Start development server
```bash
pnpm dev
```
6. Open app
- `http://localhost:3000`

## Environment Variables
Required variables (see `.env.example`):
- `PORT`
- `NODE_ENV`
- `REDIS_URL`
- `OIDC_ISSUER`
- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET`
- `OIDC_REDIRECT_URI`
- `SESSION_SECRET`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_AUTHENTICATED`
- `RATE_LIMIT_MAX_HTTP`

## Redis Setup Instructions
- App expects a reachable Redis instance via `REDIS_URL`.
- Redis is used for:
  - Persisting checkbox state under key `one-million-checkboxes:checkboxes`
  - Session storage (`connect-redis`, `sess:*`)
  - Pub/Sub channel `one-million-checkboxes:server:checkbox:change` for multi-instance propagation

## Authentication Flow (OIDC/OAuth 2.0)
1. User clicks Login (`/auth/login`)
2. Server creates `state`, stores it in session (+ fallback cookie), redirects to OIDC authorize endpoint
3. OIDC provider redirects to `/auth/callback` with `code` and `state`
4. Server validates `state`, exchanges `code` at token endpoint, fetches userinfo
5. User/session stored in server session
6. Frontend checks `/auth/me` to render logged-in UI

## WebSocket Flow
1. Client connects via Socket.IO
2. Express session middleware is applied to socket handshake
3. Server reads authenticated user from `socket.request.session`
4. Client emits `client:checkbox:change` with checkbox ID + value
5. Server validates auth + rate limit, updates Redis state
6. Server publishes change to Redis Pub/Sub
7. All instances receive Pub/Sub message and emit `server:checkbox:change` to clients

## Rate Limiting Logic Explanation
### HTTP Rate Limiting
- Implemented in `src/middleware/rate-limit.ts`
- No external rate-limit package used
- Key: authenticated user ID when available, otherwise client IP
- Window: `RATE_LIMIT_WINDOW_MS`
- Limit: `RATE_LIMIT_MAX_HTTP`
- On violation: HTTP `429` with `retryAfterMs`

### WebSocket Rate Limiting
- Implemented in `src/index.ts`
- Keyed by `socket.id`
- Fixed window (currently 1 second)
- Max events per window: 10 (`client:checkbox:change`)
- On violation: emits `rate-limited` event to client

## Project Structure
```text
src/
  config/         # env parsing and config validation
  lib/            # redis and session setup
  middleware/     # auth + HTTP rate limit
  public/         # frontend assets (HTML/CSS/JS)
  routes/         # auth routes
  services/       # OIDC discovery/token/userinfo logic
  types/          # shared TypeScript types
  index.ts        # app bootstrap + sockets + redis pubsub wiring
```

## Demo Checklist
Include this in your video:
- Login flow through OIDC
- Grid load and scroll
- Checkbox toggle action
- Real-time sync between two windows/users
- Rate-limit behavior (optional but recommended)

## Notes / Known Constraints
- Current checkbox state storage uses JSON array in Redis for simplicity; this is easy to reason about but not the most memory-efficient representation for very large scale.
- In-memory fallback for sessions exists for resilience if Redis session writes fail; production should keep Redis healthy to avoid MemoryStore usage.

## API/Route Summary
- `GET /health`
- `GET /checkboxes`
- `GET /auth/login`
- `GET /auth/callback`
- `GET /auth/me`
- `GET /auth/status`
- `POST /auth/logout`
- `GET /api/protected` (requires auth)

## Submission Notes
Before submission, ensure:
- Public GitHub link added
- Deployed link added
- YouTube unlisted demo link added
- README sections complete and accurate
