import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateColumnDto } from './dto/create-column.dto.js';
import { UpdateColumnDto } from './dto/update-column.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class ColumnsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createColumnDto: CreateColumnDto, userId: number) {
    return this.prisma.$transaction(async (transaction) => {
      const board = await transaction.board.findFirst({
        where: {
          id: createColumnDto.boardId,
          userId,
        },
        select: {
          id: true,
        },
      });

      if (!board) {
        throw new NotFoundException('Доска не найдена');
      }

      const position =
        (await transaction.column.count({
          where: {
            boardId: board.id,
          },
        })) + 1;

      return transaction.column.create({
        data: {
          title: createColumnDto.title,
          boardId: board.id,
          position,
        },
      });
    });
  }

  async update(id: number, updateColumnDto: UpdateColumnDto, userId: number) {
    try {
      return await this.prisma.column.update({
        where: {
          id,
          board: {
            userId,
          },
        },
        data: updateColumnDto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Колонка не найдена');
      }

      throw error;
    }
  }

  async remove(id: number, userId: number) {
    try {
      await this.prisma.column.delete({
        where: {
          id,
          board: {
            userId,
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Колонка не найдена');
      }

      throw error;
    }
  }
}
