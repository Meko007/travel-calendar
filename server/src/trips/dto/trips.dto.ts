import { PartialType } from '@nestjs/mapped-types';
import { ModeType } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateTripDto {
    @IsNotEmpty()
    @IsString()
    destination: string;

    @IsNotEmpty()
    @IsDateString()
    tripDateTime: string;

    @IsNotEmpty()
    @IsEnum(ModeType)
    mode: ModeType;
}

export class UpdateTripDto extends PartialType(CreateTripDto) {}
