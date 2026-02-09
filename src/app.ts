import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import csurf from "csurf";
import dotenv from "dotenv";
import { Authlete } from "@authlete/typescript-sdk";
import { logger } from "./logger";

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// Session hardening for demo (adjust for production)
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  })
);

// CSRF protection for browser flows (login/decision)
const csrfProtection = csurf({ cookie: false });

const PORT = Number(process.env.PORT ?? 3000);
export const SERVICE_ID = process.env.AUTHLETE_SERVICE_ID ?? "";

const authlete = new Authlete({
  bearer: process.env.AUTHLETE_BEARER ?? "",
  serverURL: process.env.AUTHLETE_SERVER_URL,
});

const rawBearer = process.env.AUTHLETE_BEARER ?? "";
const bearerLooksPlaceholder =
  rawBearer === "" ||
  rawBearer === "your_authlete_token_here" ||
  rawBearer.toLowerCase().includes("your_") ||
  rawBearer.includes("<") ||
  rawBearer.toLowerCase().includes("token");

export const useMock = bearerLooksPlaceholder || rawBearer === "mock";

if (bearerLooksPlaceholder) {
  logger.warn("AUTHLETE_BEARER appears to be a placeholder; starting in MOCK mode. Set AUTHLETE_BEARER to use real Authlete.");
}
if (!process.env.AUTHLETE_SERVICE_ID) {
  logger.warn("AUTHLETE_SERVICE_ID is not set. Some behaviors will use defaults in MOCK mode.");
}

const mockAuthlete = {
  authorization: {
    async processRequest(_req: any) {
      return {
        action: "INTERACTION",
        ticket: "mock-ticket",
        client: { clientName: "Mock Client" },
      };
    },
    async issue(_req: any) {
      return {
        action: "LOCATION",
        responseContent: "http://localhost:9000/cb?code=mock-code",
      };
    },
    async fail(_req: any) {
      return {
        action: "LOCATION",
        responseContent: "http://localhost:9000/cb?error=access_denied",
      };
    },
  },
  token: {
    async processRequest(_req: any) {
      return {
        action: "OK",
        responseContent: JSON.stringify({ access_token: "mock-access-token", token_type: "Bearer", expires_in: 3600 }),
      };
    },
    async process(req: any) {
      return mockAuthlete.token.processRequest(req);
    },
    async issue(_req: any) {
      return {
        action: "OK",
        responseContent: JSON.stringify({ access_token: "mock-access-token", token_type: "Bearer", expires_in: 3600 }),
      };
    },
    async fail(_req: any) {
      return {
        action: "BAD_REQUEST",
        responseContent: JSON.stringify({ error: "invalid_grant" }),
      };
    },
  },
  service: {
    async get(_req: any) {
      return { serviceId: process.env.AUTHLETE_SERVICE_ID ?? "mock-service", serviceName: "Mock Service" };
    },
  },
};

export const authleteClient: any = useMock ? mockAuthlete : authlete;

// In-memory user store for demo purposes
export const users: Record<string, { password: string; sub?: string }> = {
  alice: { password: "wonderland", sub: "alice" },
  bob: { password: "builder", sub: "bob" },
};

function renderLoginPage(clientName = "Client", prompt = "", csrfToken?: string) {
  const csrfInput = csrfToken ? `<input type="hidden" name="_csrf" value="${csrfToken}"/>` : "";
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Login</title></head>
  <body>
    <h2>Login to ${clientName}</h2>
    <form method="post" action="/login">
      ${csrfInput}
      <label>Username: <input name="username" /></label><br/>
      <label>Password: <input name="password" type="password"/></label><br/>
      <button type="submit">Login</button>
    </form>
    <form method="post" action="/auth/decision">
      ${csrfInput}
      <input type="hidden" name="decision" value="deny" />
      <button type="submit">Deny</button>
    </form>
    <p>${prompt}</p>
  </body>
</html>`;
}

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Authorization endpoint
app.get("/authorize", async (req, res) => {
  try {
    const parameters = (req.originalUrl.split("?")[1] || "").toString();

    if (!parameters) {
      logger.warn('/authorize called without query parameters');
      res.status(400).json({ error: 'invalid_request', error_description: 'Missing authorization request parameters.' });
      return;
    }

    const result: any = await authleteClient.authorization.processRequest({
      serviceId: SERVICE_ID,
      authorizationRequest: { parameters },
    });

    const action = result.action;

    if (action === "LOCATION") {
      res.redirect(result.responseContent);
      return;
    }

    if (action === "FORM") {
      res.type("html").send(result.responseContent);
      return;
    }

    if (action === "NO_INTERACTION") {
      const issueRes: any = await authleteClient.authorization.issue({
        serviceId: SERVICE_ID,
        authorizationIssueRequest: {
          ticket: result.ticket,
          subject: result.subject ?? "anonymous",
        },
      });

      if (issueRes.action === "LOCATION") {
        res.redirect(issueRes.responseContent);
        return;
      }

      res.status(500).json({ error: "unexpected-issue-action", detail: issueRes });
      return;
    }

    if (action === "INTERACTION") {
      req.session.ticket = result.ticket;
      req.session.authorizationRequest = result;

      // Use CSRF token on login form
      const csrfToken = (req as any).csrfToken ? (req as any).csrfToken() : undefined;
      res.type("html").send(renderLoginPage(result.client?.clientName ?? "Client", "", csrfToken));
      return;
    }

    if (action === "INTERNAL_SERVER_ERROR") {
      res.status(500).json(JSON.parse(result.responseContent));
      return;
    }

    if (action === "BAD_REQUEST") {
      res.status(400).json(JSON.parse(result.responseContent));
      return;
    }

    res.status(400).json({ error: "unsupported_action", action, result });
  } catch (err) {
    logger.error('/authorize error:', err);
    res.status(500).json({ error: "server_error", message: `${err}` });
  }
});

// Login handler (simple credential check)
app.post("/login", csrfProtection, (req: any, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    logger.warn('/login called with missing credentials');
    res.type("html").send(renderLoginPage("Client", "Missing credentials."));
    return;
  }

  if (username && users[username] && users[username].password === password) {
    req.session.user = username;
    res.type("html").send(`<!doctype html>
<html><body>
  <h3>Welcome ${username}</h3>
  <form method="post" action="/auth/decision">
    <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
    <button name="decision" value="allow">Allow</button>
    <button name="decision" value="deny">Deny</button>
  </form>
</body></html>`);
    return;
  }

  res.type("html").send(renderLoginPage("Client", "Invalid credentials, try again."));
});

// Decision handler (grant/deny)
app.post("/auth/decision", csrfProtection, async (req: any, res) => {
  const decisionRaw = req.body.decision ?? req.body?.decision ?? req.body;
  const decision = typeof decisionRaw === "string" ? decisionRaw : (req.body && req.body.decision) || "allow";
  const ticket = req.session.ticket;

  if (!ticket) {
    logger.warn('/auth/decision called with no ticket in session');
    res.status(400).send("no ticket in session");
    return;
  }

  if (decision === "deny") {
    const failRes: any = await authleteClient.authorization.fail({
      serviceId: SERVICE_ID,
      authorizationFailRequest: { ticket, reason: "DENIED" },
    });

    if (failRes.action === "LOCATION") {
      res.redirect(failRes.responseContent);
      return;
    }

    if (failRes.action === "FORM") {
      res.type("html").send(failRes.responseContent);
      return;
    }

    res.status(400).json({ error: "deny_failed", detail: failRes });
    return;
  }

  const subject = req.session.user ?? req.session.authorizationRequest?.subject ?? "anonymous";

  const issueRes: any = await authleteClient.authorization.issue({
    serviceId: SERVICE_ID,
    authorizationIssueRequest: {
      ticket,
      subject,
    },
  });

  if (issueRes.action === "LOCATION") {
    res.redirect(issueRes.responseContent);
    return;
  }

  if (issueRes.action === "FORM") {
    res.type("html").send(issueRes.responseContent);
    return;
  }

  res.status(500).json({ error: "issue_failed", detail: issueRes });
});

// Token endpoint
app.post("/token", async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      logger.warn('/token called with empty body');
      res.status(400).json({ error: 'invalid_request', error_description: 'Missing token request parameters.' });
      return;
    }

    const params = new URLSearchParams(req.body as Record<string, string>).toString();

    const auth = (req.headers.authorization || "") as string;
    let clientId: string | undefined;
    let clientSecret: string | undefined;
    if (auth.startsWith("Basic ")) {
      const decoded = Buffer.from(auth.slice(6), "base64").toString();
      const [id, secret] = decoded.split(":");
      clientId = id;
      clientSecret = secret;
    }

    logger.debug('/token request', { params, clientId: logger.mask(clientId), hasClientSecret: !!clientSecret });

    const tokenRes: any = await authleteClient.token.process({
      serviceId: SERVICE_ID,
      tokenRequest: { parameters: params, clientId, clientSecret },
    });

    if (tokenRes.action === "OK") {
      try {
        const parsed = typeof tokenRes.responseContent === 'string' ? JSON.parse(tokenRes.responseContent) : tokenRes.responseContent;
        res.type('json').send(parsed);
      } catch (e) {
        res.type('json').send(tokenRes.responseContent);
      }
      return;
    }

    if (tokenRes.action === "PASSWORD") {
      const username = req.body.username;
      const password = req.body.password;
      if (username && users[username] && users[username].password === password) {
        const issueRes: any = await authleteClient.token.issue({
          serviceId: SERVICE_ID,
          tokenIssueRequest: { ticket: tokenRes.ticket, subject: username },
        });
        if (issueRes.action === "OK") {
          try {
            const parsed = typeof issueRes.responseContent === 'string' ? JSON.parse(issueRes.responseContent) : issueRes.responseContent;
            res.type('json').send(parsed);
          } catch (e) {
            res.type('json').send(issueRes.responseContent);
          }
          return;
        }
        res.status(500).json({ error: "token_issue_failed", detail: issueRes });
        return;
      }

      const failRes: any = await authleteClient.token.fail({
        serviceId: SERVICE_ID,
        tokenFailRequest: { ticket: tokenRes.ticket, reason: "INVALID_RESOURCE_OWNER_CREDENTIALS" },
      });
      res.status(400).json(JSON.parse(failRes.responseContent));
      return;
    }

    if (tokenRes.responseContent) {
      try {
        const parsed = JSON.parse(tokenRes.responseContent);
        res.status(400).json(parsed);
      } catch (e) {
        res.status(400).send(tokenRes.responseContent);
      }
      return;
    }

    res.status(400).json({ error: "unsupported_token_action", tokenRes });
  } catch (err) {
    logger.error('/token error:', err);
    res.status(500).json({ error: "server_error", message: `${err}` });
  }
});

export { app, PORT };
