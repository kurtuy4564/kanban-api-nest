import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CreateBoardDto } from './dto/create-board.dto.js';
import { BoardsService } from './boards.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

type JwtPayload = {
  sub: string | number;
  email: string;
};

@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  // @Post()
  // create(@Body() dto: CreateBoardDto) {
  //   return this.boardsService.create(dto);
  // }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.boardsService.findAll(user.sub);
  }

  // @Get(':id')
  // findOne(@Param('id', ParseIntPipe) id: number) {
  //   return this.boardsService.findOne(id);
  // }
}
