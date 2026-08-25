import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EventsService } from './events.service';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get('mine/tickets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the current user's event tickets" })
  myTickets(@Request() req: any) {
    return this.events.findTicketsForBuyer(req.user.sub);
  }

  @Get(':productId/availability')
  @ApiOperation({ summary: 'Seat availability for an event product' })
  @ApiResponse({ status: 200, description: 'Availability returned (null if not an event)' })
  availability(@Param('productId') productId: string) {
    return this.events.availabilityForProduct(productId);
  }
}
