import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangePasswordDto {
  @ApiProperty({
    description: "The current password of the user",
    example: "OldPass123!",
  })
  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @ApiProperty({
    description: "The new password to be set for the user",
    example: "NewPass456!",
  })
  @IsNotEmpty()
  @IsString()
  newPassword: string;
}
