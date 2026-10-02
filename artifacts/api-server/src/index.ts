import app from "./app";
import { logger } from "./lib/logger";
import { startProcessingPoller } from "./lib/processing-poller";

// Default to 3000 if PORT is not set (Phusion Passenger / Plesk compatibility)
const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  if (process.env["DISABLE_PROCESSING_POLLER"] === "true") {
    logger.info("Processing poller disabled for this API instance");
  } else {
    startProcessingPoller();
  }
});
