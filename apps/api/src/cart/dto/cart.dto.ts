import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  quantity: number = 1;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsOptional()
  userId?: string;
}

export class QuoteItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsOptional()
  sizeId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  toppingIds?: string[];

  @IsInt()
  @Min(1)
  quantity: number = 1;

  @IsString()
  @IsOptional()
  note?: string;
}

export class CalculateQuoteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[] = [];

  @IsString()
  @IsOptional()
  couponCode?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  pointsUsed?: number;

  @IsString()
  @IsOptional()
  userId?: string;
}
