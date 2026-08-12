import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'Categories returned' })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get category by slug' })
  @ApiResponse({ status: 200, description: 'Category returned' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }
}
