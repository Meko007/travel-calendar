import { IsNotEmpty, IsString } from 'class-validator';

export class RejectTripDto {
  @IsNotEmpty()
  @IsString()
  reason: string;
}
