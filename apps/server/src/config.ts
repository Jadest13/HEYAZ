import { z } from 'zod';
export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const config = z
    .object({
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
      HOST: z.string().default('127.0.0.1'),
      PORT: z.coerce.number().int().min(1).max(65535).default(3000),
      CORS_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
      DATABASE_DRIVER: z.enum(['postgres', 'pglite']).default('pglite'),
      DATABASE_URL: z.string().optional(),
      PGLITE_DATA_DIR: z.string().default('.data/postgres'),
      AUTH_MODE: z.enum(['development', 'oidc']).default('development'),
      DEV_AUTH_TOKEN: z.string().min(32).default('heyaz-local-development-only-token'),
      OIDC_ISSUER: z.url().optional(),
      OIDC_AUDIENCE: z.string().min(1).optional(),
      OIDC_JWKS_URL: z.url().optional(),
      COACH_MODE: z
        .enum(['mock', 'disabled'])
        .default(env.NODE_ENV === 'production' ? 'disabled' : 'mock'),
    })
    .parse(env);
  if (
    config.NODE_ENV === 'production' &&
    (config.AUTH_MODE !== 'oidc' || config.DATABASE_DRIVER !== 'postgres')
  )
    throw new Error('Production requires OIDC authentication and PostgreSQL.');
  if (
    config.AUTH_MODE === 'development' &&
    !['127.0.0.1', '::1', 'localhost'].includes(config.HOST)
  )
    throw new Error('Development authentication requires a loopback HOST.');
  if (config.DATABASE_DRIVER === 'postgres' && !config.DATABASE_URL)
    throw new Error('DATABASE_URL is required.');
  if (
    config.AUTH_MODE === 'oidc' &&
    (!config.OIDC_ISSUER ||
      !config.OIDC_AUDIENCE ||
      !config.OIDC_JWKS_URL ||
      !config.OIDC_ISSUER.startsWith('https://') ||
      !config.OIDC_JWKS_URL.startsWith('https://'))
  )
    throw new Error('OIDC requires an HTTPS issuer/JWKS URL and an audience.');
  const origins = config.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (
    origins.some((origin) => {
      try {
        const url = new URL(origin);
        return !['http:', 'https:'].includes(url.protocol) || url.origin !== origin;
      } catch {
        return true;
      }
    })
  )
    throw new Error('CORS_ORIGINS must contain exact HTTP(S) origins.');
  return { ...config, origins };
}
export type Config = ReturnType<typeof readConfig>;
