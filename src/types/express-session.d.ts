import 'express-session';

declare module 'express-session' {
  interface SessionData {
    ticket?: string;
    authorizationRequest?: any;
    user?: string;
  }
}
