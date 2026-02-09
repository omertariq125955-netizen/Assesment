import { app, PORT, useMock, authleteClient } from "./app";
import { logger } from "./logger";

async function startup() {
  try {
    if (!useMock) {
      if (!process.env.AUTHLETE_BEARER || !process.env.AUTHLETE_SERVICE_ID) {
        logger.error("AUTHLETE_BEARER or AUTHLETE_SERVICE_ID missing. Please set them in .env");
        process.exit(1);
      }
      await authleteClient.service.get({ serviceId: process.env.AUTHLETE_SERVICE_ID as string });
      logger.info(`Authlete credentials valid. Starting server on http://localhost:${PORT}`);
    } else {
      logger.info(`Starting in MOCK mode on http://localhost:${PORT}`);
    }

    app.listen(PORT, () => {
      logger.info(`Authlete sample server running on http://localhost:${PORT}`);
    });
  } catch (e: any) {
    logger.error("Authlete credential validation failed:", e?.message ?? e);
    process.exit(1);
  }
}

startup();
