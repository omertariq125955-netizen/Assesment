import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { Authlete } from "@authlete/typescript-sdk";
import { logger } from "./logger";

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60,
    },
  })
);

const PORT = Number(process.env.PORT ?? 3000);
export const SERVICE_ID = process.env.AUTHLETE_SERVICE_ID ?? "";

const authlete = new Authlete({
  bearer: process.env.AUTHLETE_BEARER ?? "",
  serverURL: process.env.AUTHLETE_SERVER_URL,
});

const rawBearer = process.env.AUTHLETE_BEARER ?? "";
const bearerLooksPlaceholder =
  rawBearer === "" ||
  rawBearer === "your_authlete_access_token_here" ||
  rawBearer.toLowerCase().includes("your_") ||
  rawBearer.includes("<") ||
  rawBearer.toLowerCase().includes("token");

export const useMock = bearerLooksPlaceholder || rawBearer === "mock";

if (bearerLooksPlaceholder) {
  logger.warn("Starting in MOCK mode.");
}

const mockAuthlete = {
  authorization: {
    async processRequest() {
      return {
        action: "INTERACTION",
        ticket: "mock-ticket",
        client: { clientName: "Mock Client" },
      };
    },
    async issue() {
      return {
        action: "LOCATION",
        responseContent: "http://localhost:3000/cb?code=mock-code",
      };
    },
    async fail() {
      return {
        action: "LOCATION",
        responseContent:
          "http://localhost:3000/cb?error=access_denied",
      };
    },
  },
  token: {
    async process() {
      return {
        action: "OK",
        responseContent: JSON.stringify({
          access_token: "mock-access-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      };
    },
  },
};

export const authleteClient: any = useMock ? mockAuthlete : authlete;

export const users: Record<string, { password: string }> = {
  omer: { password: "tariq" },
  omertariq: { password: "Test123" },
};

function renderLoginPage(clientName = "Client", prompt = "") {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Login</title></head>
  <body style="font-family: Arial; text-align:center; margin-top:100px;">
    <h2>Login to ${clientName}</h2>
    <form method="post" action="/login">
      <input name="username" placeholder="Username"/><br/><br/>
      <input name="password" type="password" placeholder="Password"/><br/><br/>
      <button type="submit">Login</button>
    </form>
    <p style="color:red;">${prompt}</p>
  </body>
</html>`;
}

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/authorize", async (req: any, res) => {
  try {
    const result =
      await authleteClient.authorization.processRequest();

    if (result.action === "INTERACTION") {
      req.session.ticket = result.ticket;
      res.send(renderLoginPage(result.client?.clientName));
      return;
    }

    res.status(400).json({ error: "unsupported_action" });
  } catch {
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/login", (req: any, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.send(renderLoginPage("Client", "Missing credentials."));
    return;
  }

  if (users[username] && users[username].password === password) {
    req.session.user = username;

    res.send(`<!doctype html>
<html>
  <body style="font-family: Arial; text-align:center; margin-top:100px;">
    <h3>Welcome ${username}</h3>
    <form method="post" action="/auth/decision">
      <button name="decision" value="allow">Allow</button>
      <button name="decision" value="deny">Deny</button>
    </form>
  </body>
</html>`);
    return;
  }

  res.send(renderLoginPage("Client", "Invalid credentials."));
});

app.post("/auth/decision", async (req: any, res) => {
  const decision = req.body.decision;
  const ticket = req.session.ticket;

  if (!ticket) {
    res.status(400).send("No ticket in session");
    return;
  }

  if (decision === "deny") {
    res.redirect("/cb?error=access_denied");
    return;
  }

  const issueRes =
    await authleteClient.authorization.issue();

  const redirectUrl = new URL(issueRes.responseContent);
  const code = redirectUrl.searchParams.get("code");

  res.redirect(`/success?code=${code}`);
});

app.get("/success", (req: any, res) => {
  const code = req.query.code;

  res.send(`
    <!doctype html>
    <html>
      <body style="font-family: Arial; text-align:center; margin-top:100px;">
        <h2>✅ Authorization Successful</h2>
        <p>User: <strong>${req.session.user}</strong></p>
        <p>Authorization Code:</p>
        <div style="padding:10px; background:#f4f4f4; display:inline-block;">
          ${code}
        </div>
        <br/><br/>
        <p>OAuth flow completed successfully 🎉</p>
      </body>
    </html>
  `);
});

app.post("/token", async (_req, res) => {
  res.json({
    access_token: "mock-access-token",
    token_type: "Bearer",
    expires_in: 3600,
  });
});

export { app, PORT };
