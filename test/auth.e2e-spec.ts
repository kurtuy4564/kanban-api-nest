import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdUserIds = new Set<number>();

  async function registerUser(email: string, password = 'myPassword123') {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
    });
    createdUserIds.add(user.id);
    return user;
  }

  async function loginUser(email: string, password = 'myPassword123') {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    expect(response.body.access_token).toEqual(expect.any(String));
    return response.body.access_token as string;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    try {
      if (createdUserIds.size > 0) {
        const userIds = [...createdUserIds];
        await prisma.board.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }
    } finally {
      try {
        await prisma?.$disconnect();
      } finally {
        await app?.close();
      }
    }
  });

  it('registers, hashes the password, logs in, and accepts the JWT', async () => {
    const email = `auth-${randomUUID()}@example.com`;
    const password = 'myPassword123';
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
    });
    createdUserIds.add(user.id);

    expect(response.body).toMatchObject({ id: user.id, email });
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(user.passwordHash).not.toBe(password);
    expect(await bcrypt.compare(password, user.passwordHash)).toBe(true);

    const accessToken = await loginUser(email, password);
    const boardsResponse = await request(app.getHttpServer())
      .get('/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(boardsResponse.body).toEqual([]);
  });

  it('rejects invalid registration data', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'myPassword123' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `short-${randomUUID()}@example.com`, password: 'short' })
      .expect(400);
  });

  it('rejects duplicate email registration', async () => {
    const email = `duplicate-${randomUUID()}@example.com`;
    await registerUser(email);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'myPassword123' })
      .expect(409);
  });

  it('rejects unknown users and incorrect passwords', async () => {
    const email = `login-${randomUUID()}@example.com`;
    await registerUser(email);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrongPassword123' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `missing-${randomUUID()}@example.com`,
        password: 'myPassword123',
      })
      .expect(401);
  });

  it('rejects missing and invalid bearer tokens', async () => {
    await request(app.getHttpServer()).get('/boards').expect(401);

    await request(app.getHttpServer())
      .get('/boards')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    const malformedClaimsToken = await app
      .get(JwtService)
      .signAsync({ sub: '1', email: 'user@example.com' });
    await request(app.getHttpServer())
      .get('/boards')
      .set('Authorization', `Bearer ${malformedClaimsToken}`)
      .expect(401);
  });

  it('returns only boards owned by the authenticated user', async () => {
    const ownerEmail = `owner-${randomUUID()}@example.com`;
    const otherEmail = `other-${randomUUID()}@example.com`;
    const owner = await registerUser(ownerEmail);
    await registerUser(otherEmail);
    const board = await prisma.board.create({
      data: {
        title: `e2e-board-${randomUUID()}`,
        userId: owner.id,
      },
      select: { id: true, title: true },
    });

    const ownerToken = await loginUser(ownerEmail);
    const otherToken = await loginUser(otherEmail);

    const ownerResponse = await request(app.getHttpServer())
      .get('/boards')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(ownerResponse.body).toEqual([board]);

    const otherResponse = await request(app.getHttpServer())
      .get('/boards')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);
    expect(otherResponse.body).toEqual([]);
  });
});
