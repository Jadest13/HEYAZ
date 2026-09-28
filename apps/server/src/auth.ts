import { createHash, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Config } from './config.js';
import { ApiError } from './errors.js';
export type Authenticate = (request: Request) => Promise<string>;
const digest = (value: string) => createHash('sha256').update(value).digest();
export function createAuthenticator(config: Config): Authenticate {
  const keys =
    config.AUTH_MODE === 'oidc'
      ? createRemoteJWKSet(new URL(config.OIDC_JWKS_URL!), { timeoutDuration: 5000 })
      : undefined;
  return async (request) => {
    const authorization = request.headers.get('authorization');
    if (!authorization || !/^Bearer \S+$/i.test(authorization))
      throw new ApiError(401, 'UNAUTHORIZED', 'Bearer 인증이 필요합니다.');
    const token = authorization.slice(7);
    if (config.AUTH_MODE === 'development') {
      if (!timingSafeEqual(digest(token), digest(config.DEV_AUTH_TOKEN)))
        throw new ApiError(401, 'UNAUTHORIZED', '유효하지 않은 개발용 인증 토큰입니다.');
      return 'development-user';
    }
    try {
      const { payload } = await jwtVerify(token, keys!, {
        issuer: config.OIDC_ISSUER,
        audience: config.OIDC_AUDIENCE,
        algorithms: ['RS256', 'ES256'],
        requiredClaims: ['sub', 'exp', 'iat'],
        clockTolerance: 5,
      });
      if (!payload.sub || payload.sub.length > 512) throw new Error('Invalid subject');
      return createHash('sha256').update(`${payload.iss}\n${payload.sub}`).digest('hex');
    } catch {
      throw new ApiError(401, 'UNAUTHORIZED', '인증 토큰이 유효하지 않거나 만료되었습니다.');
    }
  };
}
