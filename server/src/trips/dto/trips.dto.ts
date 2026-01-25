import { PartialType } from '@nestjs/mapped-types';
import { ModeType } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTripDto {
    @IsNotEmpty()
    @IsString()
    destination: string;

    @IsNotEmpty()
    @IsDateString()
    tripDateTime: string;

    @IsNotEmpty()
    @IsDateString()
    returnTripDateTime: string;

    @IsNotEmpty()
    @IsEnum(ModeType)
    mode: ModeType;

    @IsOptional()
    @IsEnum(ModeType)
    returnMode?: ModeType;
}

export class UpdateTripDto extends PartialType(CreateTripDto) {}
