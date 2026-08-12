import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, ReportReviewDto } from '../common';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get reviews for a product' })
  @ApiResponse({ status: 200, description: 'Reviews returned' })
  async findByProduct(
    @Param('productId') productId: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    return this.reviewsService.findByProduct(
      productId,
      page ? parseInt(page as any) : undefined,
      perPage ? parseInt(perPage as any) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get review by ID' })
  @ApiResponse({ status: 200, description: 'Review returned' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async findById(@Param('id') id: string) {
    return this.reviewsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review' })
  @ApiResponse({ status: 201, description: 'Review created' })
  @ApiResponse({ status: 403, description: 'Must purchase product first or already reviewed' })
  async create(@Request() req, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(req.user.sub, dto.productId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review' })
  @ApiResponse({ status: 200, description: 'Review updated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateReviewDto) {
    return this.reviewsService.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async delete(@Request() req, @Param('id') id: string) {
    return this.reviewsService.delete(id, req.user.sub);
  }

  @Post(':id/helpful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a review as helpful' })
  @ApiResponse({ status: 200, description: 'Review marked as helpful' })
  @ApiResponse({ status: 403, description: 'Already voted' })
  async markHelpful(@Request() req, @Param('id') id: string) {
    return this.reviewsService.markHelpful(id, req.user.sub);
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a review' })
  @ApiResponse({ status: 200, description: 'Review reported' })
  @ApiResponse({ status: 403, description: 'Cannot report own review' })
  async report(@Request() req, @Param('id') id: string, @Body() dto: ReportReviewDto) {
    return this.reviewsService.report(id, req.user.sub, dto.reason);
  }
}
