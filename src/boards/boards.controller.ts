import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { CreateBoardDto } from './dto/create-board.dto.js';
import { BoardsService } from './boards.service.js';

@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  // @Post()
  // create(@Body() dto: CreateBoardDto) {
  //   return this.boardsService.create(dto);
  // }

  @Get()
  findAll() {
    return this.boardsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.boardsService.findOne(id);
  }
}
