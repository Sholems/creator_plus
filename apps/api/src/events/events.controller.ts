import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EventsService } from './events.service';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get(':productId/availability')
  @ApiOperation({ summary: 'Seat availability for an event product' })
  @ApiResponse({ status: 200, description: 'Availability returned (null if not an event)' })
  availability(@Param('productId') productId: string) {
    return this.events.availabilityForProduct(productId);
  }
}
