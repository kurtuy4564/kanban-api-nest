import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBoardDto } from './dto/create-board.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface Board {
  id: number;
  title: string;
}

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  // create(dto: CreateBoardDto) {
  //   return this.prisma.board.create({
  //     data: {
  //       title: dto.title,
  //       user: {
  //         connect: { id: currentUserId }
  //       }
  //     },
  //   });
  // }

  findAll() {
    return this.prisma.board.findMany();
  }

  async findOne(id: number) {
    const board = await this.prisma.board.findUnique({
      where: { id },
    });

    if (!board) {
      throw new NotFoundException('Доска не найдена');
    }

    return board;
  }
}
