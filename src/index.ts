import { app, PORT } from "./app";
import { Authlete } from "@authlete/typescript-sdk";
import dotenv from "dotenv";

dotenv.config();

async function validateAuthleteCredentials() {
  if (!process.env.AUTHLETE_BEARER) {
    throw new Error("AUTHLETE_BEARER is not set");
  }

  if (!process.env.AUTHLETE_SERVICE_ID) {
    throw new Error("AUTHLETE_SERVICE_ID is not set");
  }

  const authlete = new Authlete({
    bearer: process.env.AUTHLETE_BEARER,
    serverURL: process.env.AUTHLETE_SERVER_URL,
  });

  await authlete.service.get({
    serviceId: process.env.AUTHLETE_SERVICE_ID,
  });
}

async function startup() {
  try {
    await validateAuthleteCredentials();

    console.log("Authlete credentials validated successfully.");

    app.listen(PORT, () => {
      console.log(`Authorization server running at http://localhost:${PORT}`);
    });
  } catch (error: any) {
    console.error("Failed to validate Authlete credentials.");
    console.error(error?.message || error);
    process.exit(1);
  }
}

startup();
