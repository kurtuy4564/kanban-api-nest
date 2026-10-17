import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    // bcrypt ограничивает пароль 72 байтами
    if (Buffer.byteLength(dto.password, 'utf8') > 72) {
      throw new BadRequestException('Пароль должен занимать не более 72 байт');
    }

    // 1. Проверяем, существует ли пользователь
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // 2. Хешируем пароль
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // 3. Сохраняем пользователя
    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      // Защита от двух одновременных регистраций
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Пользователь с таким email уже существует',
        );
      }

      throw error;
    }
  }
}
