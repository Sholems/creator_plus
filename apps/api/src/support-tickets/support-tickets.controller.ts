import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SupportTicketsService } from './support-tickets.service';
import { CreateSupportTicketDto, ReplyTicketDto } from './dto/support-ticket.dto';

@ApiTags('support-tickets')
@Controller('support-tickets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SupportTicketsController {
  constructor(private readonly ticketsService: SupportTicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a support ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created' })
  async create(@Request() req, @Body() dto: CreateSupportTicketDto) {
    return this.ticketsService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my support tickets' })
  @ApiResponse({ status: 200, description: 'Tickets returned' })
  async myTickets(
    @Request() req,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('status') status?: string,
  ) {
    return this.ticketsService.myTickets(req.user.sub, Number(page) || 1, Number(perPage) || 20, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of my support tickets with its messages' })
  @ApiResponse({ status: 200, description: 'Ticket returned' })
  async getMyTicket(@Request() req, @Param('id') id: string) {
    return this.ticketsService.getMyTicket(req.user.sub, id);
  }

  @Post(':id/replies')
  @ApiOperation({ summary: 'Reply to my support ticket' })
  @ApiResponse({ status: 201, description: 'Reply added' })
  async reply(@Request() req, @Param('id') id: string, @Body() dto: ReplyTicketDto) {
    return this.ticketsService.replyFromUser(req.user.sub, id, dto.message);
  }
}
