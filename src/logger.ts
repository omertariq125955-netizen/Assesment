const DEBUG = process.env.AUTHLETE_DEBUG === "true" || process.env.AUTHLETE_DEBUG === "1";

function mask(value: string | undefined) {
  if (!value) return "";
  if (value.length <= 8) return "****";
  return value.slice(0, 4) + "..." + value.slice(-4);
}

export const logger = {
  info: (...args: any[]) => console.log(new Date().toISOString(), "INFO", ...args),
  warn: (...args: any[]) => console.warn(new Date().toISOString(), "WARN", ...args),
  error: (...args: any[]) => console.error(new Date().toISOString(), "ERROR", ...args),
  debug: (...args: any[]) => {
    if (DEBUG) console.debug(new Date().toISOString(), "DEBUG", ...args);
  },
  mask,
};

export default logger;
