import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
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

  @Get('creator')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the creator's events with sold/checked-in counts" })
  creatorEvents(@Request() req: any) {
    return this.events.findForCreator(req.user.sub);
  }

  @Get('creator/:productId/attendees')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attendee list for one of the creator events' })
  attendees(@Request() req: any, @Param('productId') productId: string) {
    return this.events.attendeesForProduct(req.user.sub, productId);
  }

  @Post('creator/:productId/checkin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check a ticket in at the door' })
  checkIn(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body('ticketCode') ticketCode: string,
  ) {
    return this.events.checkIn(req.user.sub, productId, ticketCode);
  }

  @Get(':productId/availability')
  @ApiOperation({ summary: 'Seat availability for an event product' })
  @ApiResponse({ status: 200, description: 'Availability returned (null if not an event)' })
  availability(@Param('productId') productId: string) {
    return this.events.availabilityForProduct(productId);
  }
}
