import { Module } from '@nestjs/common';
import { BoardsController } from './boards.controller.js';
import { BoardsService } from './boards.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [BoardsController],
  providers: [BoardsService],
})
export class BoardsModule {}
