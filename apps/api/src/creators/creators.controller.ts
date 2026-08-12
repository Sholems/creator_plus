import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatorsService } from './creators.service';
import {
  ApplyCreatorDto,
  UpdateCreatorProfileDto,
  CreateBankAccountDto,
  SubmitVerificationDto,
} from '../common';

@ApiTags('creators')
@Controller('creators')
export class CreatorsController {
  constructor(private creatorsService: CreatorsService) {}

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply to become a creator' })
  @ApiResponse({ status: 201, description: 'Creator application submitted' })
  @ApiResponse({ status: 409, description: 'Already a creator or slug taken' })
  async apply(@Request() req, @Body() dto: ApplyCreatorDto) {
    return this.creatorsService.apply(req.user.sub, dto.storeName, dto.slug);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get creator profile' })
  @ApiResponse({ status: 200, description: 'Creator profile returned' })
  @ApiResponse({ status: 404, description: 'Creator profile not found' })
  async getProfile(@Request() req) {
    return this.creatorsService.findByUserId(req.user.sub);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update creator profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 409, description: 'Slug already taken' })
  async updateProfile(@Request() req, @Body() dto: UpdateCreatorProfileDto) {
    return this.creatorsService.updateProfile(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Public directory of active creators with published products' })
  @ApiResponse({ status: 200, description: 'Creators directory returned' })
  async listActive() {
    return this.creatorsService.listActive();
  }

  @Get('storefront/:slug')
  @ApiOperation({ summary: 'Get creator storefront' })
  @ApiResponse({ status: 200, description: 'Storefront returned' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async getStorefront(@Param('slug') slug: string) {
    return this.creatorsService.getStorefront(slug);
  }

  @Get('earnings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get creator earnings summary' })
  @ApiResponse({ status: 200, description: 'Earnings summary returned' })
  async getEarnings(@Request() req) {
    return this.creatorsService.getCreatorEarnings(req.user.sub);
  }

  @Get('sales')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get creator sales orders' })
  @ApiResponse({ status: 200, description: 'Sales orders returned' })
  @ApiResponse({ status: 404, description: 'Creator profile not found' })
  async getSales(
    @Request() req,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.creatorsService.getCreatorSales(req.user.sub, Number(page) || 1, Number(perPage) || 20);
  }

  @Get('payouts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get creator payout requests' })
  @ApiResponse({ status: 200, description: 'Payout requests returned' })
  async getPayouts(@Request() req, @Query('page') page?: string, @Query('perPage') perPage?: string) {
    return this.creatorsService.getMyPayouts(req.user.sub, Number(page) || 1, Number(perPage) || 20);
  }

  @Post('payouts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a payout' })
  @ApiResponse({ status: 201, description: 'Payout requested' })
  @ApiResponse({ status: 400, description: 'Below minimum payout amount' })
  async requestPayout(@Request() req, @Body() body: { method?: string; notes?: string }) {
    return this.creatorsService.requestPayout(req.user.sub, body.method, body.notes);
  }

  @Get('bank-accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get creator bank accounts' })
  @ApiResponse({ status: 200, description: 'Bank accounts returned' })
  async getBankAccounts(@Request() req) {
    return this.creatorsService.getMyBankAccounts(req.user.sub);
  }

  @Post('bank-accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a payout bank account' })
  @ApiResponse({ status: 201, description: 'Bank account added' })
  async addBankAccount(@Request() req, @Body() dto: CreateBankAccountDto) {
    return this.creatorsService.addBankAccount(req.user.sub, dto);
  }

  @Delete('bank-accounts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a payout bank account' })
  @ApiResponse({ status: 200, description: 'Bank account deleted' })
  async deleteBankAccount(@Request() req, @Param('id') id: string) {
    return this.creatorsService.deleteBankAccount(req.user.sub, id);
  }

  @Get('verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get creator verification status' })
  @ApiResponse({ status: 200, description: 'Verification status returned' })
  async getVerification(@Request() req) {
    return this.creatorsService.getCreatorVerification(req.user.sub);
  }

  @Post('verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a creator identity verification application' })
  @ApiResponse({ status: 201, description: 'Verification submitted' })
  async submitVerification(@Request() req, @Body() dto: SubmitVerificationDto) {
    return this.creatorsService.submitVerification(req.user.sub, dto);
  }
}
