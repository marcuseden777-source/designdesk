const REQUIRED = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_JWT_SECRET",
  "ANTHROPIC_API_KEY",
] as const;

const OPTIONAL = [
  "NVIDIA_API_KEY",
  "REPLICATE_API_TOKEN",
  "SENTRY_DSN",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "S3_BUCKET_NAME",
] as const;

export function validateEnv(): void {
  const missing = REQUIRED.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}\n\nSet these in your .env file or deployment environment.`
    );
  }

  const missingOptional = OPTIONAL.filter((key) => !process.env[key]);
  if (missingOptional.length > 0) {
    console.warn(
      `⚠ Missing optional environment variables (some features will be unavailable):\n${missingOptional.map((k) => `  - ${k}`).join("\n")}`
    );
  }
}
