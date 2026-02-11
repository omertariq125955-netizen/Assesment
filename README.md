# Authlete Simple Authorization Server (TypeScript)

This repository contains a minimal OAuth 2.0 Authorization Server implemented in Node.js and TypeScript using the Authlete TypeScript SDK.

The project is designed as an assessment-focused implementation that demonstrates the OAuth 2.0 Authorization Code flow while keeping the system self-contained and easy to evaluate locally.

By default, the server runs in Mock Mode, allowing the full flow to operate without requiring real Authlete credentials.

---

## Project Purpose

This project demonstrates:

- Understanding of OAuth 2.0 Authorization Code Flow
- Delegation of protocol logic to Authlete APIs (or mock equivalent)
- Clear separation between authentication and authorization
- Session-based login orchestration
- Secure environment configuration using `.env`
- Practical engineering judgment in scoping demo functionality

This implementation is intentionally minimal and is not intended for production use.

---

## What This Project Demonstrates

- OAuth 2.0 Authorization Code Flow
- Action-driven flow control based on Authlete-style responses
- In-memory user authentication
- Session management using `express-session`
- Internal redirect handling for local evaluation
- Mock implementation of authorization and token endpoints
- Secure configuration via environment variables

---

## Architecture Overview

The flow implemented in this project:

Browser  
↓  
GET /authorize  
↓  
Login Page (if interaction required)  
↓  
User Authentication (in-memory store)  
↓  
Authorization Decision (Allow / Deny)  
↓  
Authorization Code Issued  
↓  
Success Page (Displays Code)

This keeps the entire OAuth flow self-contained within the same application for easier assessment and demonstration.

---

## Implemented Endpoints

### GET /authorize

Authorization endpoint that begins the OAuth Authorization Code flow.

In Mock Mode:
- Always triggers interaction
- Generates a mock authorization ticket
- Displays login page

---

### POST /login

Handles user authentication using an in-memory user store.

If credentials are valid:
- Session is established
- User proceeds to authorization decision page

---

### POST /auth/decision

Handles user decision:

- **Allow** → Issues authorization code
- **Deny** → Returns access denied

On success, redirects internally to `/success`.

---

### GET /success

Displays:

- Logged-in user
- Generated authorization code
- Confirmation message

This replaces the need for an external client application during testing.

---

### POST /token

Mock token endpoint that returns:

```json
{
  "access_token": "mock-access-token",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

### GET /health

Simple health check endpoint.

---

## Demo Users

This project includes an in-memory user store for demonstration purposes.

| Username     | Password  |
|-------------|-----------|
| omer        | tariq     |
| omertariq   | Test123   |

Users are reset when the server restarts.

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

---

### 2. Configure Environment Variables

Copy example file:

```bash
cp .env.example .env
```

Required variables:

```
AUTHLETE_BEARER
AUTHLETE_SERVICE_ID
AUTHLETE_SERVER_URL (optional)
SESSION_SECRET
PORT
```

If `AUTHLETE_BEARER` is missing or contains placeholder text, the server automatically runs in Mock Mode.

No real Authlete credentials are required for evaluation.

---

### 3. Run Development Server

```bash
npm run dev
```

Server runs on:

```
http://localhost:3000
```

---

## Testing the Authorization Flow

Open:

```
http://localhost:3000/authorize
```

Steps:

1. Login using demo credentials
2. Click **Allow**
3. You will be redirected to `/success`
4. Authorization code will be displayed

This demonstrates a complete OAuth Authorization Code flow.

---

## Mock Mode

Mock Mode is automatically activated when:

- `AUTHLETE_BEARER` is empty
- `AUTHLETE_BEARER` contains placeholder values
- `AUTHLETE_BEARER=mock`

Mock Mode simulates:

- Authorization request validation
- Authorization code issuance
- Token response generation

This enables full local execution without provisioning Authlete services.

---

## Security Notes

This project intentionally simplifies security mechanisms for demonstration purposes.

Limitations include:

- In-memory session store
- Plain-text demo passwords
- No CSRF protection
- No persistent storage
- No rate limiting
- No production hardening

For real-world deployment, additional security controls would be required.

---

## Design Decisions

The following engineering decisions were made intentionally:

- Mock mode enabled for easy evaluation
- Internal success route replaces external client redirect
- In-memory users to avoid database complexity
- Minimal UI to focus on protocol flow
- Clear separation of flow orchestration and authentication logic

The goal is clarity of OAuth flow implementation rather than production completeness.

---

## Assessment Context

This project was developed to demonstrate:

- Practical understanding of OAuth 2.0 flows
- Correct orchestration of Authorization Code process
- Usage of Authlete SDK (or equivalent delegation logic)
- Secure handling of environment-based configuration
- Ability to simplify distributed OAuth flow into a self-contained demo
- Clean and structured backend implementation in TypeScript

---

## Potential Future Improvements

- Replace in-memory users with persistent database
- Add password hashing (bcrypt)
- Restore proper CSRF protection
- Add refresh token support
- Add OpenID Connect ID token support
- Implement client registration endpoint
- Add logout and session invalidation
- Use Redis for production session storage
- Improve UI styling

---

## Summary

This repository provides a clean, minimal, and self-contained demonstration of an OAuth 2.0 Authorization Server implemented in TypeScript.

It demonstrates correct flow orchestration, secure configuration practices, and practical engineering trade-offs suitable for assessment review.
