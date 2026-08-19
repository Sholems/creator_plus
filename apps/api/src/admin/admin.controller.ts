import { Controller, Get, Post, Put, Patch, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { SearchService } from '../search/search.service';
import { SettingsService } from '../settings/settings.service';
import { PaymentProviderFactory } from '../payments/providers/payment-provider.factory';
import { UpdatePaystackDto } from './dto/settings.dto';
import { UpdatePlatformSettingsDto } from './dto/platform-settings.dto';
import { UpdateTrackingSettingsDto } from './dto/tracking-settings.dto';
import { BroadcastDto } from './dto/broadcast.dto';
import { CreateRoleDto, SetUserRolesDto } from './dto/role.dto';
import { CreateFeatureFlagDto, UpdateFeatureFlagDto } from '../feature-flags/dto/feature-flag.dto';
import { UpdateContactStatusDto } from '../contact/dto/contact.dto';
import {
  AssignTicketDto,
  ReplyTicketDto,
  UpdateTicketPriorityDto,
  UpdateTicketStatusDto,
} from '../support-tickets/dto/support-ticket.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin')
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private searchService: SearchService,
    private settingsService: SettingsService,
    private providerFactory: PaymentProviderFactory,
  ) {}

  @Post('search/reindex')
  @ApiOperation({ summary: 'Rebuild the product search index from the database' })
  reindexSearch() {
    return this.searchService.reindexAll();
  }

  @Get('settings/payments')
  @ApiOperation({ summary: 'Get payment provider settings (secret masked)' })
  async getPaymentSettings() {
    return { paystack: await this.settingsService.getMaskedPaystack() };
  }

  @Put('settings/payments/paystack')
  @ApiOperation({ summary: 'Configure Paystack (secret/public key, enabled)' })
  async updatePaystackSettings(@Body() dto: UpdatePaystackDto) {
    const paystack = await this.settingsService.updatePaystack(dto);
    // Apply immediately — no restart needed.
    await this.providerFactory.reload();
    return { paystack };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Platform dashboard statistics' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List users' })
  getUsers(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(Number(page) || 1, Number(perPage) || 20, search);
  }

  @Get('products')
  @ApiOperation({ summary: 'List products' })
  getProducts(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getProducts(status, Number(page) || 1, Number(perPage) || 20, search);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List orders' })
  getOrders(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getOrders(Number(page) || 1, Number(perPage) || 20, status, search);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get order detail' })
  getOrder(@Param('id') id: string) {
    return this.adminService.getOrderDetail(id);
  }

  @Post('orders/:id/reminder')
  @ApiOperation({ summary: 'Send a payment reminder email for an incomplete order' })
  sendOrderReminder(@Request() req, @Param('id') id: string) {
    return this.adminService.sendOrderReminder(id, req.user.sub);
  }

  @Get('payouts')
  @ApiOperation({ summary: 'List payout requests' })
  getPayouts(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getPayouts(Number(page) || 1, Number(perPage) || 20, status, search);
  }

  @Post('payouts/:id/approve')
  @ApiOperation({ summary: 'Approve a payout request' })
  approvePayout(@Request() req, @Param('id') id: string) {
    return this.adminService.approvePayout(id, req.user.sub);
  }

  @Post('payouts/:id/reject')
  @ApiOperation({ summary: 'Reject a payout request' })
  rejectPayout(@Request() req, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.adminService.rejectPayout(id, req.user.sub, reason);
  }

  @Post('payouts/:id/complete')
  @ApiOperation({ summary: 'Mark a payout as completed' })
  completePayout(@Request() req, @Param('id') id: string) {
    return this.adminService.completePayout(id, req.user.sub);
  }

  @Get('reviews')
  @ApiOperation({ summary: 'List reported reviews' })
  getReviews(@Query('page') page?: string, @Query('perPage') perPage?: string) {
    return this.adminService.getReviews(Number(page) || 1, Number(perPage) || 20);
  }

  @Get('refunds')
  @ApiOperation({ summary: 'List refund requests' })
  getRefunds(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.adminService.getRefunds(Number(page) || 1, Number(perPage) || 20, status);
  }

  @Post('refunds/:id/approve')
  @ApiOperation({ summary: 'Approve a refund request' })
  approveRefund(@Request() req, @Param('id') id: string) {
    return this.adminService.approveRefund(id, req.user.sub);
  }

  @Post('refunds/:id/reject')
  @ApiOperation({ summary: 'Reject a refund request' })
  rejectRefund(@Request() req, @Param('id') id: string) {
    return this.adminService.rejectRefund(id, req.user.sub);
  }

  @Post('products/:id/approve')
  @ApiOperation({ summary: 'Approve a pending product' })
  approveProduct(@Param('id') id: string) {
    return this.adminService.approveProduct(id);
  }

  @Post('products/:id/reject')
  @ApiOperation({ summary: 'Reject a product' })
  rejectProduct(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.adminService.rejectProduct(id, reason);
  }

  @Post('products/:id/status')
  @ApiOperation({ summary: 'Change a product status (unpublish, archive, republish, …)' })
  setProductStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminService.setProductStatus(id, status);
  }

  @Post('products/:id/feature')
  @ApiOperation({ summary: 'Feature/unfeature a product on the homepage' })
  setProductFeatured(@Param('id') id: string, @Body('featured') featured: boolean) {
    return this.adminService.setProductFeatured(id, featured);
  }

  @Post('products/:id/hero')
  @ApiOperation({ summary: 'Toggle product for the hero stall card on the homepage' })
  setProductHero(@Param('id') id: string, @Body('hero') hero: boolean) {
    return this.adminService.setProductHero(id, hero);
  }

  @Post('products/:id/affiliate-pick')
  @ApiOperation({ summary: 'Toggle product as an admin-curated affiliate pick for the homepage' })
  setProductAffiliatePick(@Param('id') id: string, @Body('affiliatePick') affiliatePick: boolean) {
    return this.adminService.setProductAffiliatePick(id, affiliatePick);
  }

  @Post('reviews/:id/hide')
  @ApiOperation({ summary: 'Hide a reported review' })
  hideReview(@Param('id') id: string) {
    return this.adminService.hideReview(id);
  }

  @Post('reviews/:id/restore')
  @ApiOperation({ summary: 'Restore a hidden review' })
  restoreReview(@Param('id') id: string) {
    return this.adminService.restoreReview(id);
  }

  @Post('creators/:id/verify')
  @ApiOperation({ summary: 'Approve a creator profile & grant verified badge' })
  verifyCreator(@Param('id') id: string, @Request() req: any) {
    return this.adminService.verifyCreator(id, req.user.sub);
  }

  @Post('creators/:id/reject')
  @ApiOperation({ summary: 'Reject a creator verification' })
  rejectCreator(
    @Param('id') id: string,
    @Request() req: any,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.rejectCreator(id, req.user.sub, reason);
  }

  // ------------------------------------------------------------------
  // Platform settings
  // ------------------------------------------------------------------

  @Get('settings')
  @ApiOperation({ summary: 'Get platform settings' })
  getSettings() {
    return this.adminService.getPlatformSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update platform settings' })
  updateSettings(@Request() req, @Body() dto: UpdatePlatformSettingsDto) {
    return this.adminService.updatePlatformSettings(req.user.sub, dto);
  }

  // ------------------------------------------------------------------
  // Tracking / Analytics settings
  // ------------------------------------------------------------------

  @Get('settings/tracking')
  @ApiOperation({ summary: 'Get tracking & analytics settings' })
  getTrackingSettings() {
    return this.settingsService.getTrackingSettings();
  }

  @Put('settings/tracking')
  @ApiOperation({ summary: 'Update tracking & analytics settings' })
  updateTrackingSettings(@Body() dto: UpdateTrackingSettingsDto) {
    return this.settingsService.updateTrackingSettings(dto);
  }

  // ------------------------------------------------------------------
  // Admin broadcasts
  // ------------------------------------------------------------------

  @Post('broadcasts/preview')
  @ApiOperation({ summary: 'Preview the number of recipients for a broadcast' })
  broadcastPreview(@Body() dto: BroadcastDto) {
    return this.adminService.broadcastPreview(dto);
  }

  @Post('broadcasts')
  @ApiOperation({ summary: 'Send a broadcast notification to users' })
  broadcast(@Request() req, @Body() dto: BroadcastDto) {
    return this.adminService.broadcast(req.user.sub, dto);
  }

  // ------------------------------------------------------------------
  // Contact inbox
  // ------------------------------------------------------------------

  @Get('contacts')
  @ApiOperation({ summary: 'List contact messages' })
  getContacts(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.adminService.getContacts(Number(page) || 1, Number(perPage) || 20, status);
  }

  @Get('contacts/:id')
  @ApiOperation({ summary: 'Get a single contact message' })
  getContact(@Param('id') id: string) {
    return this.adminService.getContact(id);
  }

  @Patch('contacts/:id/status')
  @ApiOperation({ summary: 'Update a contact message status' })
  setContactStatus(@Request() req, @Param('id') id: string, @Body() dto: UpdateContactStatusDto) {
    return this.adminService.setContactStatus(req.user.sub, id, dto.status);
  }

  @Get('support-tickets')
  @ApiOperation({ summary: 'List support tickets' })
  getAllTickets(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllTickets({
      page: Number(page) || 1,
      perPage: Number(perPage) || 20,
      status,
      priority,
      category,
      search,
    });
  }

  @Get('support-tickets/:id')
  @ApiOperation({ summary: 'Get a single support ticket with its messages' })
  getTicket(@Param('id') id: string) {
    return this.adminService.getTicket(id);
  }

  @Patch('support-tickets/:id/status')
  @ApiOperation({ summary: 'Update a support ticket status' })
  setTicketStatus(@Request() req, @Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.adminService.setTicketStatus(req.user.sub, id, dto.status);
  }

  @Patch('support-tickets/:id/priority')
  @ApiOperation({ summary: 'Update a support ticket priority' })
  setTicketPriority(@Request() req, @Param('id') id: string, @Body() dto: UpdateTicketPriorityDto) {
    return this.adminService.setTicketPriority(req.user.sub, id, dto.priority);
  }

  @Post('support-tickets/:id/assign')
  @ApiOperation({ summary: 'Assign a support ticket to a user' })
  assignTicket(@Request() req, @Param('id') id: string, @Body() dto: AssignTicketDto) {
    return this.adminService.assignTicket(req.user.sub, id, dto.assignedTo);
  }

  @Post('support-tickets/:id/replies')
  @ApiOperation({ summary: 'Reply to a support ticket as support staff' })
  replyToTicket(@Request() req, @Param('id') id: string, @Body() dto: ReplyTicketDto) {
    return this.adminService.replyToTicket(req.user.sub, id, dto.message);
  }

  // ------------------------------------------------------------------
  // Roles & permissions
  // ------------------------------------------------------------------

  @Get('roles')
  @ApiOperation({ summary: 'List roles with permissions and member counts' })
  getRoles() {
    return this.adminService.getRoles();
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List all permissions' })
  getPermissions() {
    return this.adminService.getPermissions();
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create a role' })
  createRole(@Request() req, @Body() dto: CreateRoleDto) {
    return this.adminService.createRole(req.user.sub, dto);
  }

  @Put('users/:id/roles')
  @ApiOperation({ summary: 'Set the roles for a user' })
  setUserRoles(@Request() req, @Param('id') id: string, @Body() dto: SetUserRolesDto) {
    return this.adminService.setUserRoles(req.user.sub, id, dto);
  }

  // ------------------------------------------------------------------
  // Feature flags
  // ------------------------------------------------------------------

  @Get('feature-flags')
  @ApiOperation({ summary: 'List feature flags' })
  getFeatureFlags() {
    return this.adminService.getFeatureFlags();
  }

  @Post('feature-flags')
  @ApiOperation({ summary: 'Create a feature flag' })
  createFeatureFlag(@Request() req, @Body() dto: CreateFeatureFlagDto) {
    return this.adminService.createFeatureFlag(req.user.sub, dto);
  }

  @Put('feature-flags/:id')
  @ApiOperation({ summary: 'Update a feature flag' })
  updateFeatureFlag(@Request() req, @Param('id') id: string, @Body() dto: UpdateFeatureFlagDto) {
    return this.adminService.updateFeatureFlag(req.user.sub, id, dto);
  }

  @Delete('feature-flags/:id')
  @ApiOperation({ summary: 'Delete a feature flag' })
  removeFeatureFlag(@Request() req, @Param('id') id: string) {
    return this.adminService.removeFeatureFlag(req.user.sub, id);
  }
}
