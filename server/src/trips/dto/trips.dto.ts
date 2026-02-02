import { PartialType } from "@nestjs/mapped-types";
import { ModeType } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateTripDto {
  @ApiProperty({
    description: "Destination of the trip",
    example: "New York, USA",
  })
  @IsNotEmpty()
  @IsString()
  destination: string;

  @ApiProperty({
    description: "Date and time of departure for the trip in ISO 8601 format",
    example: "2026-10-15T09:00:00Z",
  })
  @IsNotEmpty()
  @IsDateString()
  tripDateTime: string;

  @ApiProperty({
    description: "Date and time of return for the trip in ISO 8601 format",
    example: "2026-10-20T18:00:00Z",
  })
  @IsNotEmpty()
  @IsDateString()
  returnTripDateTime: string;

  @ApiProperty({
    description: "Mode of transportation for the trip",
    example: ModeType.LAND,
  })
  @IsNotEmpty()
  @IsEnum(ModeType)
  mode: ModeType;

  @ApiProperty({
    description: "Mode of transportation for the return trip",
    example: ModeType.AIR,
    required: false,
  })
  @IsOptional()
  @IsEnum(ModeType)
  returnMode?: ModeType;
}

export class UpdateTripDto extends PartialType(CreateTripDto) {}
