import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { verify, type JwtPayload } from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from './public.decorator';

interface RequestWithUser {
  headers: Record<string, string | string[] | undefined>;
  user?: JwtPayload;
}

/**
 * Verifica o JWT emitido pelo Supabase Auth (HS256, assinado com o "JWT
 * Secret" do projeto) — ver ADR 0014. Sem SUPABASE_JWT_SECRET configurado,
 * a API roda aberta (modo dev) com um aviso único no log; produção define o
 * secret e toda rota não-@Public() passa a exigir Bearer token válido.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private hasWarnedOpenMode = false;

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const secret = this.config.get<string>('SUPABASE_JWT_SECRET');
    if (!secret) {
      if (!this.hasWarnedOpenMode) {
        this.logger.warn(
          'SUPABASE_JWT_SECRET não configurado — API rodando SEM autenticação (modo dev, ver ADR 0014)',
        );
        this.hasWarnedOpenMode = true;
      }
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: JwtPayload;
    try {
      payload = verify(authHeader.slice('Bearer '.length), secret, {
        algorithms: ['HS256'],
      }) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // A anon key do Supabase também é um JWT assinado com o mesmo secret,
    // mas com role "anon" — só sessões de usuário logado passam.
    if (payload.role !== 'authenticated') {
      throw new UnauthorizedException('Token is not an authenticated user session');
    }

    request.user = payload;
    return true;
  }
}
