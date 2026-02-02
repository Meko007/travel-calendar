import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({
    description: "The email address of the user",
    example: "user@email.com",
  })
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty({
    description: "The password of the user",
    example: "UserPass123!",
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}
