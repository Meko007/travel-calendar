import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SetTemporaryPasswordDto {
  @ApiProperty({
    description: "The temporary password to be set for the user",
    example: "TempPass123!",
  })
  @IsNotEmpty()
  @IsString()
  temporaryPassword: string;
}
