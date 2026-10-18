import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBoardDto } from './dto/create-board.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateBoardDto } from './dto/update-board.dto.js';
import { Prisma } from '../generated/prisma/client.js';

export interface Board {
  id: number;
  title: string;
}

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateBoardDto, userId: number) {
    return this.prisma.board.create({
      data: {
        title: dto.title,
        user: {
          connect: {
            id: userId,
          },
        },
      },
      select: {
        id: true,
        title: true,
        userId: true,
      },
    });
  }

  findAll(userId: number) {
    return this.prisma.board.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        title: true,
      },
    });
  }

  async findOne(id: number, userId: number) {
    const board = await this.prisma.board.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        columns: {
          orderBy: {
            position: 'asc',
          },
          include: {
            tasks: {
              orderBy: {
                position: 'asc',
              },
            },
          },
        },
      },
    });

    if (!board) {
      throw new NotFoundException('Доска не найдена');
    }

    return board;
  }

  async update(id: number, dto: UpdateBoardDto, userId: number) {
    try {
      return await this.prisma.board.update({
        where: {
          id,
          userId,
        },
        data: {
          title: dto.title,
        },
        select: {
          id: true,
          title: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Доска не найдена');
      }

      throw error;
    }
  }

  async remove(id: number, userId: number) {
    try {
      await this.prisma.board.delete({
        where: {
          id,
          userId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Доска не найдена');
      }

      throw error;
    }
  }
}
