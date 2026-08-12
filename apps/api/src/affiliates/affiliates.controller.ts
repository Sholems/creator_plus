import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AffiliatesService } from './affiliates.service';
import {
  ApplyAffiliateDto,
  UpdateAffiliateDto,
  CreateAffiliateLinkDto,
  UpdateAffiliateLinkDto,
  TrackClickDto,
  RequestAffiliatePayoutDto,
  CreatePromotionalAssetDto,
  AdminAffiliateRejectDto,
  AdminAffiliateSuspendDto,
  AdminProductAffiliateRejectDto,
  UpdateCommissionSettingsDto,
} from './dto/affiliate.dto';

const ipOf = (req: any) => {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? null;
};

@ApiTags('affiliates')
@Controller('affiliates')
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  // ------------------------------------------------------------------
  // Public routes
  // ------------------------------------------------------------------

  @Get('marketplace')
  @ApiOperation({ summary: 'List products open for affiliate promotion' })
  async marketplace(
    @Query('sort') sort?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.affiliatesService.marketplace({
      sort,
      category,
      search,
      perPage: perPage ? Number(perPage) : undefined,
    });
  }

  @Post('go/:code')
  @ApiOperation({
    summary: 'Track an affiliate click and return the redirect target + cookie metadata',
  })
  @ApiResponse({ status: 200, description: 'Click recorded' })
  @ApiResponse({ status: 404, description: 'Invalid or disabled affiliate link' })
  async trackClick(
    @Param('code') code: string,
    @Body() dto: TrackClickDto,
    @Req() req: any,
  ) {
    return this.affiliatesService.trackClick(code, {
      visitorId: dto.visitorId,
      sessionId: dto.sessionId,
      referer: dto.referer,
      ipAddress: ipOf(req),
      userAgent: req.headers?.['user-agent'] ?? null,
    });
  }

  @Get('promotional-assets/:productId')
  @ApiOperation({ summary: 'Public promotional assets for a product' })
  async promotionalAssets(@Param('productId') productId: string) {
    return this.affiliatesService.getPromotionalAssets(productId);
  }

  // ------------------------------------------------------------------
  // Authenticated — affiliate application & self-service
  // ------------------------------------------------------------------

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply to become an affiliate' })
  @ApiResponse({ status: 201, description: 'Application submitted' })
  async apply(@Request() req, @Body() dto: ApplyAffiliateDto) {
    return this.affiliatesService.apply(req.user.sub, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my affiliate account (with links and settings)' })
  async me(@Request() req) {
    return this.affiliatesService.getMyAffiliate(req.user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my affiliate application details (preserves account status)' })
  async updateMe(@Request() req, @Body() dto: UpdateAffiliateDto) {
    return this.affiliatesService.updateProfile(req.user.sub, dto);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Affiliate dashboard summary (clicks, conversions, payouts)' })
  async dashboard(@Request() req) {
    return this.affiliatesService.dashboard(req.user.sub);
  }

  @Get('links')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my affiliate links' })
  async getLinks(@Request() req) {
    return this.affiliatesService.getLinks(req.user.sub);
  }

  @Post('links')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an affiliate link for an approved product' })
  async createLink(@Request() req, @Body() dto: CreateAffiliateLinkDto) {
    return this.affiliatesService.createLink(req.user.sub, dto);
  }

  @Patch('links/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an affiliate link (code or status)' })
  async updateLink(@Request() req, @Param('id') id: string, @Body() dto: UpdateAffiliateLinkDto) {
    return this.affiliatesService.updateLink(req.user.sub, id, dto);
  }

  @Get('conversions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My commission conversions (paginated)' })
  async conversions(
    @Request() req,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.affiliatesService.getConversions(
      req.user.sub,
      page ? Number(page) : undefined,
      perPage ? Number(perPage) : undefined,
    );
  }

  @Post('payouts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a payout of released commissions' })
  async requestPayout(@Request() req, @Body() dto: RequestAffiliatePayoutDto) {
    return this.affiliatesService.requestPayout(req.user.sub, dto);
  }

  @Get('payouts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My payout requests' })
  async payouts(@Request() req) {
    return this.affiliatesService.getPayouts(req.user.sub);
  }

  @Post('promotional-assets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a promotional asset for an approved product' })
  async addPromotionalAsset(@Request() req, @Body() dto: CreatePromotionalAssetDto) {
    return this.affiliatesService.addPromotionalAsset(req.user.sub, dto);
  }
}

@ApiTags('admin-affiliates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin')
@Controller('admin/affiliates')
export class AdminAffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @Get()
  @ApiOperation({ summary: 'List affiliate applications' })
  async list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.affiliatesService.listAffiliates(
      status,
      page ? Number(page) : undefined,
      perPage ? Number(perPage) : undefined,
    );
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve an affiliate application' })
  async approve(@Request() req, @Param('id') id: string) {
    return this.affiliatesService.approveAffiliate(id, req.user.sub);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject an affiliate application' })
  async reject(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AdminAffiliateRejectDto,
  ) {
    return this.affiliatesService.rejectAffiliate(id, req.user.sub, dto.reason);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend an affiliate account (disables links)' })
  async suspend(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AdminAffiliateSuspendDto,
  ) {
    return this.affiliatesService.suspendAffiliate(id, req.user.sub, dto.reason);
  }

  @Post(':id/unsuspend')
  @ApiOperation({ summary: 'Reactivate a suspended affiliate account' })
  async unsuspend(@Request() req, @Param('id') id: string) {
    return this.affiliatesService.unsuspendAffiliate(id, req.user.sub);
  }

  @Get('products')
  @ApiOperation({ summary: 'List products in the affiliate program (pending/approved)' })
  async products(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.affiliatesService.listAffiliateProducts(
      status,
      page ? Number(page) : undefined,
      perPage ? Number(perPage) : undefined,
    );
  }

  @Post('products/:id/approve')
  @ApiOperation({ summary: 'Approve a product for the affiliate program' })
  async approveProduct(@Request() req, @Param('id') id: string) {
    return this.affiliatesService.approveProductAffiliate(id, req.user.sub);
  }

  @Post('products/:id/reject')
  @ApiOperation({ summary: 'Reject a product for the affiliate program' })
  async rejectProduct(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AdminProductAffiliateRejectDto,
  ) {
    return this.affiliatesService.rejectProductAffiliate(id, req.user.sub, dto.reason);
  }

  @Get('conversions')
  @ApiOperation({ summary: 'List all commission conversions' })
  async conversions(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.affiliatesService.listConversions(
      status,
      page ? Number(page) : undefined,
      perPage ? Number(perPage) : undefined,
    );
  }

  @Get('payouts')
  @ApiOperation({ summary: 'List affiliate payouts' })
  async payouts(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.affiliatesService.listAffiliatePayouts(
      status,
      page ? Number(page) : undefined,
      perPage ? Number(perPage) : undefined,
    );
  }

  @Post('payouts/:id/approve')
  @ApiOperation({ summary: 'Approve an affiliate payout' })
  async approvePayout(@Request() req, @Param('id') id: string) {
    return this.affiliatesService.approveAffiliatePayout(id, req.user.sub);
  }

  @Post('payouts/:id/reject')
  @ApiOperation({ summary: 'Reject an affiliate payout (releases the reserved commissions)' })
  async rejectPayout(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AdminAffiliateRejectDto,
  ) {
    return this.affiliatesService.rejectAffiliatePayout(id, req.user.sub, dto.reason);
  }

  @Post('payouts/:id/complete')
  @ApiOperation({ summary: 'Mark an affiliate payout as completed (paid out)' })
  async completePayout(@Request() req, @Param('id') id: string) {
    return this.affiliatesService.completeAffiliatePayout(id, req.user.sub);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get commission settings' })
  async settings() {
    return this.affiliatesService.getCommissionSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update commission settings' })
  async updateSettings(@Request() req, @Body() dto: UpdateCommissionSettingsDto) {
    return this.affiliatesService.updateCommissionSettings(req.user.sub, dto);
  }

  @Get('fraud')
  @ApiOperation({ summary: 'List affiliate fraud flags' })
  async fraud(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.affiliatesService.listFraudFlags(
      status,
      page ? Number(page) : undefined,
      perPage ? Number(perPage) : undefined,
    );
  }

  @Post('fraud/:id/resolve')
  @ApiOperation({ summary: 'Resolve a fraud flag' })
  async resolveFraud(@Request() req, @Param('id') id: string) {
    return this.affiliatesService.resolveFraudFlag(id, req.user.sub);
  }
}
