import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTaskDto, userId: number) {
    return this.prisma.$transaction(async (transaction) => {
      const column = await transaction.column.findFirst({
        where: {
          id: dto.columnId,
          board: {
            userId,
          },
        },
        select: {
          id: true,
        },
      });

      if (!column) {
        throw new NotFoundException('Колонка не найдена');
      }

      const position =
        (await transaction.task.count({
          where: {
            columnId: column.id,
          },
        })) + 1;

      return transaction.task.create({
        data: {
          title: dto.title,
          description: dto.description,
          columnId: column.id,
          position,
        },
      });
    });
  }

  async update(id: number, dto: UpdateTaskDto, userId: number) {
    if (
      dto.title === undefined &&
      dto.description === undefined &&
      dto.columnId === undefined &&
      dto.position === undefined
    ) {
      throw new BadRequestException('Необходимо передать хотя бы одно поле');
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const task = await transaction.task.findFirst({
          where: {
            id,
            column: {
              board: {
                userId,
              },
            },
          },
          select: {
            id: true,
            columnId: true,
            position: true,
          },
        });

        if (!task) {
          throw new NotFoundException('Задача не найдена');
        }

        const targetColumnId = dto.columnId ?? task.columnId;
        const movingToAnotherColumn = targetColumnId !== task.columnId;
        const reordering = movingToAnotherColumn || dto.position !== undefined;
        const data: Prisma.TaskUpdateInput = {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
        };

        if (reordering) {
          if (movingToAnotherColumn) {
            const targetColumn = await transaction.column.findFirst({
              where: {
                id: targetColumnId,
                board: {
                  userId,
                },
              },
              select: {
                id: true,
              },
            });

            if (!targetColumn) {
              throw new NotFoundException('Колонка не найдена');
            }
          }

          const sourceTasks = await transaction.task.findMany({
            where: {
              columnId: task.columnId,
            },
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            select: {
              id: true,
            },
          });
          const targetTasks =
            targetColumnId === task.columnId
              ? sourceTasks
              : await transaction.task.findMany({
                  where: {
                    columnId: targetColumnId,
                  },
                  orderBy: [{ position: 'asc' }, { id: 'asc' }],
                  select: {
                    id: true,
                  },
                });

          const sourceRemaining = sourceTasks.filter(
            (sourceTask) => sourceTask.id !== task.id,
          );
          const targetReordered =
            targetColumnId === task.columnId
              ? sourceRemaining
              : [...targetTasks];
          const insertionIndex =
            dto.position === undefined && movingToAnotherColumn
              ? targetReordered.length
              : Math.min(
                  Math.max((dto.position ?? task.position) - 1, 0),
                  targetReordered.length,
                );
          targetReordered.splice(insertionIndex, 0, { id: task.id });

          if (movingToAnotherColumn) {
            await Promise.all(
              sourceRemaining.map((sourceTask, index) =>
                transaction.task.update({
                  where: { id: sourceTask.id },
                  data: { position: index + 1 },
                }),
              ),
            );
          }

          await Promise.all(
            targetReordered.flatMap((targetTask, index) =>
              targetTask.id === task.id
                ? []
                : [
                    transaction.task.update({
                      where: { id: targetTask.id },
                      data: { position: index + 1 },
                    }),
                  ],
            ),
          );

          data.column = { connect: { id: targetColumnId } };
          data.position = insertionIndex + 1;
        }

        return transaction.task.update({
          where: {
            id,
            column: {
              board: {
                userId,
              },
            },
          },
          data,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Задача не найдена');
      }

      throw error;
    }
  }

  async remove(id: number, userId: number) {
    try {
      await this.prisma.task.delete({
        where: {
          id,
          column: {
            board: {
              userId,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Задача не найдена');
      }

      throw error;
    }
  }
}
