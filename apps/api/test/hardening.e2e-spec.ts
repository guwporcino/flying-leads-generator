import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { sign } from 'jsonwebtoken';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { HealthModule } from '../src/health/health.module';
import { LeadsModule } from '../src/leads/leads.module';
import { DashboardModule } from '../src/dashboard/dashboard.module';
import { AuthGuard } from '../src/auth/auth.guard';

const SECRET = 'e2e-test-secret';

const prismaMock = {
  lead: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  company: { count: jest.fn().mockResolvedValue(0) },
  opportunityScore: { count: jest.fn().mockResolvedValue(0) },
  leadStatusEvent: { groupBy: jest.fn().mockResolvedValue([]) },
  contactAttempt: { create: jest.fn() },
};

// Monta um subconjunto do app real (sem os módulos que exigem Redis/BullMQ),
// com o mesmo ValidationPipe e AuthGuard globais do main.ts/app.module.ts.
async function buildApp(secret: string | undefined): Promise<INestApplication<App>> {
  const moduleFixture = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => (secret ? { SUPABASE_JWT_SECRET: secret } : {})],
      }),
      PrismaModule,
      HealthModule,
      LeadsModule,
      DashboardModule,
    ],
    providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
  })
    .overrideProvider(PrismaService)
    .useValue(prismaMock)
    .compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();
  return app;
}

describe('Hardening (e2e) — auth + validation (ver ADR 0014)', () => {
  describe('com SUPABASE_JWT_SECRET configurado', () => {
    let app: INestApplication<App>;
    const validToken = sign({ role: 'authenticated', sub: 'user-1' }, SECRET, {
      algorithm: 'HS256',
    });

    beforeAll(async () => {
      app = await buildApp(SECRET);
    });

    afterAll(async () => {
      await app.close();
    });

    it('GET /health continua público', () => {
      return request(app.getHttpServer()).get('/health').expect(200);
    });

    it('GET /leads sem token → 401', () => {
      return request(app.getHttpServer()).get('/leads').expect(401);
    });

    it('GET /leads com token de role anon (anon key) → 401', () => {
      const anonToken = sign({ role: 'anon' }, SECRET, { algorithm: 'HS256' });
      return request(app.getHttpServer())
        .get('/leads')
        .set('Authorization', `Bearer ${anonToken}`)
        .expect(401);
    });

    it('GET /leads com token válido → 200', () => {
      return request(app.getHttpServer())
        .get('/leads')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200)
        .expect([]);
    });

    it('GET /dashboard/metrics com token válido → 200 com o shape esperado', () => {
      return request(app.getHttpServer())
        .get('/dashboard/metrics')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200)
        .expect(({ body }: { body: { funnel: Record<string, number> } }) => {
          expect(body.funnel.not_sent).toBe(0);
        });
    });

    it('GET /leads/:id inexistente → 404', () => {
      return request(app.getHttpServer())
        .get('/leads/missing-id')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
    });

    it('PATCH /leads/:id/status com status inválido → 400 (ValidationPipe)', () => {
      return request(app.getHttpServer())
        .patch('/leads/lead-1/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'not_a_status', changedBy: 'ana' })
        .expect(400);
    });

    it('PATCH /leads/:id/status sem re-setar estados geridos pelo sistema → 400', () => {
      return request(app.getHttpServer())
        .patch('/leads/lead-1/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'sent', changedBy: 'ana' })
        .expect(400);
    });

    it('POST /leads/:id/send com campo desconhecido → 400 (forbidNonWhitelisted)', () => {
      return request(app.getHttpServer())
        .post('/leads/lead-1/send')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ approvedBy: 'ana', extraField: 'nope' })
        .expect(400);
    });
  });

  describe('sem SUPABASE_JWT_SECRET (modo dev)', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await buildApp(undefined);
    });

    afterAll(async () => {
      await app.close();
    });

    it('GET /leads sem token → 200 (API aberta com aviso no log)', () => {
      return request(app.getHttpServer()).get('/leads').expect(200);
    });
  });
});
