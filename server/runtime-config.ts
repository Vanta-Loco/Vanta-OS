const isProduction = process.env.NODE_ENV === "production";

export function validateRuntimeConfig(): void {
  const required = isProduction
    ? ["DATABASE_URL", "SESSION_SECRET", "VAULT_CODE"]
    : ["DATABASE_URL"];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing required ${isProduction ? "production " : ""}environment variables: ${missing.join(", ")}`);
  }
}

export function getSessionSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (isProduction) throw new Error("SESSION_SECRET is required in production");
  return "vanta-development-only-secret";
}
