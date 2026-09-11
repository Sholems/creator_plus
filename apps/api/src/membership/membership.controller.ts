import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MembershipService } from './membership.service';
import { StartMembershipCheckoutDto } from './dto/membership.dto';

@ApiTags('membership')
@Controller('membership')
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List active membership plans and their per-provider prices' })
  listPlans() {
    return this.membership.listPublicPlans();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'My membership status' })
  me(@Request() req: any) {
    return this.membership.getMySubscription(req.user.sub);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Start a membership subscription checkout' })
  checkout(@Request() req: any, @Body() dto: StartMembershipCheckoutDto) {
    return this.membership.startCheckout(req.user.sub, dto);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel my membership at period end' })
  cancel(@Request() req: any) {
    return this.membership.cancel(req.user.sub);
  }
}
