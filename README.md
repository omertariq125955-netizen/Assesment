# Authlete Simple Authorization Server (TypeScript)

This repository contains a minimal example Authorization Server using the Authlete TypeScript SDK.

Quick start

1. Copy `.env.example` to `.env` and set `AUTHLETE_BEARER` and `AUTHLETE_SERVICE_ID` (and optional `AUTHLETE_SERVER_URL`).
2. Install dependencies:

```bash
npm install
```

3. Run in dev mode:

```bash
npm run dev
```

Endpoints

- `GET /authorize` - authorization endpoint delegating to Authlete
- `POST /token` - token endpoint delegating to Authlete
- `POST /login` - simple in-memory login flow for demo

Notes

- This is a demo scaffold for the Authlete assessment. It uses an in-memory user store and a simple HTML form UI — not for production.
- Follow the Authlete TypeScript SDK docs for configuration and to obtain bearer tokens: https://github.com/authlete/authlete-typescript-sdk

Mock mode (no Authlete token)
 
 - For the assessment you can run the server in a mock mode without a real Authlete token. If `AUTHLETE_BEARER` is missing or set to a placeholder (e.g. `your_authlete_token_here`), the server will start in MOCK mode and return simulated responses for `/authorize` and `/token` flows.
 - Start in mock mode (no setup required):

```bash
npm run dev
```

Docker (quick run in mock mode)

1. Build and run with Docker Compose (this runs the server with `AUTHLETE_BEARER=mock`):

```bash
docker-compose up --build
```

2. Verify health:

```bash
curl http://localhost:3000/health
```

3. Visit the authorization endpoint in your browser:

```
http://localhost:3000/authorize?response_type=code&client_id=test-client&redirect_uri=http://localhost:9000/cb&scope=openid
```

If you later obtain a real `AUTHLETE_BEARER` and `AUTHLETE_SERVICE_ID`, put them into `.env` and restart the server to use real Authlete APIs.
