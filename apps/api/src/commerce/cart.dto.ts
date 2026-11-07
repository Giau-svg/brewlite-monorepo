import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
export class ConfiguredCartItemDto {
  @IsUUID() productId: string;
  @IsUUID() sizeId: string;
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(30)
  @IsUUID('all', { each: true })
  toppingIds: string[] = [];
  @IsInt() @Min(1) @Max(20) quantity: number;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
  @IsOptional() @IsInt() @Min(0) expectedVersion?: number;
}
export class MergeConfiguredCartDto {
  @IsOptional() @IsInt() @Min(0) expectedVersion?: number;
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ConfiguredCartItemDto)
  items: ConfiguredCartItemDto[];
}
export class ConfiguredQuoteDto extends MergeConfiguredCartDto {
  @IsOptional() @IsString() @MaxLength(80) couponCode?: string;
  @IsOptional() @IsInt() @Min(0) pointsUsed?: number;
}
