import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { sign } from 'jsonwebtoken';
import { AuthGuard } from './auth.guard';

const SECRET = 'test-jwt-secret';

function buildContext(options: { isPublic?: boolean; authorization?: string }): {
  context: ExecutionContext;
  request: { headers: Record<string, string>; user?: unknown };
} {
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers: options.authorization ? { authorization: options.authorization } : {},
  };
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function buildGuard(secret: string | undefined, isPublic = false): AuthGuard {
  const config = {
    get: jest.fn((key: string) => (key === 'SUPABASE_JWT_SECRET' ? secret : undefined)),
  } as unknown as ConfigService;
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  } as unknown as Reflector;
  return new AuthGuard(config, reflector);
}

describe('AuthGuard', () => {
  it('allows @Public() routes without any token', () => {
    const guard = buildGuard(SECRET, true);
    const { context } = buildContext({});

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows everything when SUPABASE_JWT_SECRET is not configured (dev mode)', () => {
    const guard = buildGuard(undefined);
    const { context } = buildContext({});

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects requests without a bearer token when the secret is configured', () => {
    const guard = buildGuard(SECRET);
    const { context } = buildContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects invalid tokens', () => {
    const guard = buildGuard(SECRET);
    const { context } = buildContext({ authorization: 'Bearer not-a-jwt' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects tokens signed with a different secret', () => {
    const guard = buildGuard(SECRET);
    const token = sign({ role: 'authenticated' }, 'other-secret', { algorithm: 'HS256' });
    const { context } = buildContext({ authorization: `Bearer ${token}` });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects anon-role tokens (the Supabase anon key is not a user session)', () => {
    const guard = buildGuard(SECRET);
    const token = sign({ role: 'anon' }, SECRET, { algorithm: 'HS256' });
    const { context } = buildContext({ authorization: `Bearer ${token}` });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('accepts a valid authenticated-user token and exposes the payload', () => {
    const guard = buildGuard(SECRET);
    const token = sign({ role: 'authenticated', sub: 'user-1', email: 'op@example.com' }, SECRET, {
      algorithm: 'HS256',
    });
    const { context, request } = buildContext({ authorization: `Bearer ${token}` });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toMatchObject({ role: 'authenticated', sub: 'user-1' });
  });
});
