# Authlete Simple Authorization Server (TypeScript)

This repository contains a minimal OAuth 2.0 Authorization Server implemented in Node.js and TypeScript using the Authlete TypeScript SDK (beta).

It is intended as an educational / assessment example, demonstrating how OAuth 2.0 and OpenID Connect protocol logic can be delegated to Authlete while user authentication and orchestration are handled locally.

What this project demonstrates

- OAuth 2.0 Authorization Code Flow
- Delegation of OAuth/OIDC protocol logic to Authlete APIs
- Action-driven flow control based on Authlete responses
- A simple in-memory user authentication flow
- Secure configuration via environment variables
- Optional mock mode for local evaluation without Authlete credentials

This project is not production-ready. It intentionally avoids persistent storage, advanced session handling, and infrastructure hardening.

Architecture overview

Client Application
|
v
GET /authorize  --> Authlete (authorization.processRequest)
|                     |
|<-- INTERACTION / LOCATION
|
v
/login (in-memory user authentication)
|
v
Authlete (authorization.issue)
|
v
Client receives authorization code
|
v
POST /token  --> Authlete (token processing)

Implemented endpoints

- GET /authorize  
  Authorization endpoint delegating request validation and flow control to Authlete.

- POST /login  
  Demo login endpoint using an in-memory user store. On success, completes authorization via Authlete.

- POST /token  
  Token endpoint delegating token issuance and validation to Authlete.

- GET /health  
  Basic health check endpoint.

Quick start

1. Environment configuration

Copy the example environment file:

cp .env.example .env

Set the following variables in .env:

- AUTHLETE_BEARER
- AUTHLETE_SERVICE_ID
- (optional) AUTHLETE_SERVER_URL

Security note:  
.env must never be committed to Git. Secrets are managed via environment variables only.

2. Install dependencies

npm install

3. Run in development mode

npm run dev

The server will start on:

http://localhost:3000

Mock mode (no Authlete credentials required)

For assessment and local evaluation, the server supports a mock mode.

If AUTHLETE_BEARER is missing or set to a placeholder value (for example your_authlete_token_here), the server starts in mock mode and returns simulated responses for:

- /authorize
- /token

This allows reviewers to run and explore the OAuth flow without provisioning Authlete credentials.

Start mock mode:

npm run dev

Example authorization request

Open the following URL in your browser:

http://localhost:3000/authorize?response_type=code&client_id=test-client&redirect_uri=http://localhost:9000/cb&scope=openid

Docker (optional, mock mode)

Build and run using Docker Compose (configured to start in mock mode):

docker-compose up --build

Verify health:

curl http://localhost:3000/health

Notes and limitations

- User authentication is in-memory only (demo purpose).
- Session handling uses in-process memory storage.
- No database or persistent storage is used.
- Rate limiting, advanced session stores, and production hardening are intentionally out of scope.
- OAuth/OIDC protocol decisions are delegated entirely to Authlete APIs.

For real deployments, additional security controls and infrastructure would be required.

References

Authlete TypeScript SDK  
https://github.com/authlete/authlete-typescript-sdk

Assessment context

This project was created as part of a technical assessment to demonstrate:

- Understanding of OAuth 2.0 and OpenID Connect flows
- Correct usage of the Authlete TypeScript SDK
- Secure handling of secrets and configuration
- Practical engineering judgment and scope control
