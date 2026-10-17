import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;
}
