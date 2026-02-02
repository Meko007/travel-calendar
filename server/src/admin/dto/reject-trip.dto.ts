import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RejectTripDto {
  @ApiProperty({
    description: "Reason for rejecting the trip",
    example: "The trip dates conflict with company events.",
  })
  @IsNotEmpty()
  @IsString()
  reason: string;
}
