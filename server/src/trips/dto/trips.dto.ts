import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateTripDto {
    @IsNotEmpty()
    @IsString()
    destination: string;

    @IsNotEmpty()
    @IsDateString()
    tripDateTime: string;
}

export class UpdateTripDto extends PartialType(CreateTripDto) {}
