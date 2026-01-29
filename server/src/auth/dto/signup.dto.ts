import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
    @ApiProperty({
        description: 'The first name of the user',
        example: 'John',
    })
    @IsNotEmpty()
    @IsString()
    firstName: string;

    @ApiProperty({
        description: 'The last name of the user',
        example: 'Doe',
    })
    @IsNotEmpty()
    @IsString()
    lastName: string;

    @ApiProperty({
        description: 'The email address of the user',
        example: 'user@email.com',
    })
    @IsNotEmpty()
    @IsString()
    email: string;

    @ApiProperty({
        description: 'The password of the user',
        example: 'UserPass123!',
    })
    @IsNotEmpty()
    @IsString()
    password: string;
}
