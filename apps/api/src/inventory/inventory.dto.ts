import { BadRequestException } from '@nestjs/common';
import { IsInt, Min, Max, validateSync } from 'class-validator';
export class InventoryAdjustmentDto {
  @IsInt() @Min(0) @Max(2147483647) onHand: number;
  @IsInt() @Min(0) @Max(2147483647) expectedVersion: number;
}
export function inventoryAdjustment(value: unknown): InventoryAdjustmentDto {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Dữ liệu tồn kho không hợp lệ.');
  const dto = Object.assign(new InventoryAdjustmentDto(), value);
  if (validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).length)
    throw new BadRequestException(
      'Chỉ nhận onHand và expectedVersion là số nguyên không âm; reserved chỉ do hệ thống quản lý.',
    );
  return dto;
}
