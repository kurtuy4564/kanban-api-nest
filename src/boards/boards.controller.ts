import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CreateBoardDto } from './dto/create-board.dto.js';
import { BoardsService } from './boards.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UpdateBoardDto } from './dto/update-board.dto.js';

type JwtPayload = {
  sub: number;
  email: string;
};

@Controller('boards')
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post()
  create(@Body() dto: CreateBoardDto, @CurrentUser() user: JwtPayload) {
    return this.boardsService.create(dto, user.sub);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.boardsService.findAll(user.sub);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.boardsService.findOne(id, user.sub);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBoardDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.boardsService.update(id, dto, user.sub);
  }

  
}
