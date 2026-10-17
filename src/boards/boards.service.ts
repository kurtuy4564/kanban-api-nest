import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBoardDto } from './dto/create-board.dto.js';

export interface Board {
  id: number;
  title: string;
}

@Injectable()
export class BoardsService {
  private boards: Board[] = [];
  private nextId = 1;

  create(dto: CreateBoardDto): Board {
    const board: Board = {
      id: this.nextId++,
      title: dto.title,
    };

    this.boards.push(board);

    return board;
  }

  findAll(): Board[] {
    return this.boards;
  }

  findOne(id: number): Board {
    const board = this.boards.find((board) => board.id === id);

    if (!board) {
      throw new NotFoundException('Доска не найдена');
    }

    return board;
  }
}
