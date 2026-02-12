import express, { Request, Response } from "express";
import session from "express-session";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { Authlete } from "@authlete/typescript-sdk";

dotenv.config();

/* -------------------------------------------------------------------------- */
/* App Initialization                                                         */
/* -------------------------------------------------------------------------- */

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 1000,
    },
  })
);

export const PORT = Number(process.env.PORT || 3000);

/* -------------------------------------------------------------------------- */
/* Environment Validation                                                     */
/* -------------------------------------------------------------------------- */

const { AUTHLETE_BEARER, AUTHLETE_SERVICE_ID, AUTHLETE_SERVER_URL } =
  process.env;

if (!AUTHLETE_BEARER || !AUTHLETE_SERVICE_ID) {
  throw new Error(
    "AUTHLETE_BEARER and AUTHLETE_SERVICE_ID must be defined in environment variables"
  );
}

export const SERVICE_ID = AUTHLETE_SERVICE_ID;

const authlete = new Authlete({
  bearer: AUTHLETE_BEARER,
  serverURL: AUTHLETE_SERVER_URL,
});

/* -------------------------------------------------------------------------- */
/* Demo User Store                                                            */
/* -------------------------------------------------------------------------- */

const users: Record<string, string> = {
  omer: "tariq",
  omertariq: "Test123",
};

/* -------------------------------------------------------------------------- */
/* Helper Functions                                                           */
/* -------------------------------------------------------------------------- */

function renderLoginPage(
  clientName: string = "Client",
  message: string = ""
): string {
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Login</title>
    </head>
    <body style="font-family: Arial; text-align:center; margin-top:100px;">
      <h2>Login to ${clientName}</h2>
      <form method="post" action="/login">
        <input name="username" placeholder="Username" required />
        <br/><br/>
        <input name="password" type="password" placeholder="Password" required />
        <br/><br/>
        <button type="submit">Login</button>
      </form>
      <p style="color:red;">${message}</p>
    </body>
  </html>
  `;
}

/* -------------------------------------------------------------------------- */
/* Health Endpoint                                                            */
/* -------------------------------------------------------------------------- */

app.get("/health", (_req: Request, res: Response): void => {
  res.json({ status: "ok" });
});

/* -------------------------------------------------------------------------- */
/* Authorization Endpoint                                                     */
/* -------------------------------------------------------------------------- */

app.get("/authorize", async (req: Request, res: Response): Promise<void> => {
  try {
    const parameters = req.query
      ? new URLSearchParams(req.query as Record<string, string>).toString()
      : "";

    if (!parameters) {
      res.status(400).json({
        error: "invalid_request",
        error_description: "Missing authorization parameters",
      });
      return;
    }

    const response = await authlete.authorization.processRequest({
      serviceId: SERVICE_ID,
      authorizationRequest: { parameters },
    });

    switch (response.action) {
      case "INTERACTION":
        (req.session as any).ticket = response.ticket;
        (req.session as any).clientName = response.client?.clientName;
        res.send(renderLoginPage(response.client?.clientName));
        return;

      case "LOCATION":
        res.redirect(response.responseContent);
        return;

      case "FORM":
        res.type("html").send(response.responseContent);
        return;

      case "BAD_REQUEST":
        res.status(400).send(response.responseContent);
        return;

      case "INTERNAL_SERVER_ERROR":
        res.status(500).send(response.responseContent);
        return;

      default:
        res.status(400).json({
          error: "unsupported_action",
          action: response.action,
        });
        return;
    }
  } catch (error) {
    console.error("Authorization error:", error);
    res.status(500).send("Authorization error");
  }
});

/* -------------------------------------------------------------------------- */
/* Login Endpoint                                                             */
/* -------------------------------------------------------------------------- */

app.post("/login", (req: Request, res: Response): void => {
  const { username, password } = req.body;

  const sessionData = req.session as any;

  if (!users[username] || users[username] !== password) {
    res.send(renderLoginPage(sessionData.clientName, "Invalid credentials"));
    return;
  }

  sessionData.user = username;

  res.send(`
    <!doctype html>
    <html>
      <body style="font-family: Arial; text-align:center; margin-top:100px;">
        <h3>Welcome ${username}</h3>
        <form method="post" action="/auth/decision">
          <button name="decision" value="allow">Allow</button>
          <button name="decision" value="deny">Deny</button>
        </form>
      </body>
    </html>
  `);
});

/* -------------------------------------------------------------------------- */
/* Authorization Decision                                                     */
/* -------------------------------------------------------------------------- */

app.post(
  "/auth/decision",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionData = req.session as any;
      const ticket = sessionData.ticket;

      if (!ticket) {
        res.status(400).send("No authorization ticket in session");
        return;
      }

      if (req.body.decision === "deny") {
        const failRes = await authlete.authorization.fail({
          serviceId: SERVICE_ID,
          authorizationFailRequest: {
            ticket,
            reason: "DENIED",
          },
        });

        res.redirect(failRes.responseContent);
        return;
      }

      const issueRes = await authlete.authorization.issue({
        serviceId: SERVICE_ID,
        authorizationIssueRequest: {
          ticket,
          subject: sessionData.user,
        },
      });

      res.redirect(issueRes.responseContent);
    } catch (error) {
      console.error("Authorization decision error:", error);
      res.status(500).send("Authorization decision failed");
    }
  }
);

/* -------------------------------------------------------------------------- */
/* Callback Endpoint                                                          */
/* -------------------------------------------------------------------------- */

app.get("/callback", (req: Request, res: Response): void => {
  const { code, state } = req.query;

  res.send(`
    <!doctype html>
    <html>
      <body style="font-family: Arial; text-align:center; margin-top:100px;">
        <h2>Authorization Successful</h2>
        <p><strong>Authorization Code:</strong></p>
        <div style="padding:10px; background:#f4f4f4; display:inline-block;">
          ${code ?? ""}
        </div>
        <br/><br/>
        <p>State: ${state ?? "N/A"}</p>
      </body>
    </html>
  `);
});

/* -------------------------------------------------------------------------- */
/* Token Endpoint                                                             */
/* -------------------------------------------------------------------------- */

app.post("/token", async (req: Request, res: Response): Promise<void> => {
  try {
    const parameters = new URLSearchParams(
      req.body as Record<string, string>
    ).toString();

    const response = await authlete.token.process({
      serviceId: SERVICE_ID,
      tokenRequest: { parameters },
    });

    if (response.action === "OK") {
      res.json(JSON.parse(response.responseContent));
      return;
    }

    res.status(400).send(response.responseContent);
  } catch (error) {
    console.error("Token processing error:", error);
    res.status(500).send("Token processing failed");
  }
});

/* -------------------------------------------------------------------------- */

export { app };
