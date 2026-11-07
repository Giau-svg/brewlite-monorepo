import { validPassword } from './password-policy';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateBy,
} from 'class-validator';

export class EmailDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;
}
export class RegisterDto extends EmailDto {
  @IsString()
  @Length(1, 100)
  fullName: string;

  @IsString()
  @ValidateBy({
    name: 'bcryptPasswordLength',
    validator: {
      validate: (value: unknown) => validPassword(value),
      defaultMessage: () =>
        'Mật khẩu tối thiểu 15 ký tự Unicode và tối đa 72 byte UTF-8.',
    },
  })
  password: string;
}
export class LoginDto extends EmailDto {
  @IsString()
  @Length(1, 72)
  password: string;
}
export class VerifyEmailDto extends EmailDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code: string;
}
