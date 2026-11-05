import { Controller, Get } from '@nestjs/common';
import { ToppingsService } from './toppings.service';

@Controller('toppings')
export class ToppingsController {
  constructor(private readonly toppingsService: ToppingsService) {}

  @Get()
  async getToppings() {
    return this.toppingsService.findAll();
  }
}
