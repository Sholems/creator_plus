import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService, SearchFilters } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search products' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'creator', required: false })
  @ApiQuery({ name: 'tags', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'rating', required: false })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  async search(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('creator') creator?: string,
    @Query('tags') tags?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('rating') rating?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const filters: SearchFilters = {
      q,
      category,
      creator,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      rating: rating ? parseInt(rating) : undefined,
      sort,
      page: page ? parseInt(page) : 1,
      perPage: perPage ? parseInt(perPage) : 20,
    };

    return this.searchService.search(filters);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiQuery({ name: 'q', required: true })
  @ApiResponse({ status: 200, description: 'Suggestions returned' })
  async getSuggestions(@Query('q') q: string) {
    return this.searchService.getSuggestions(q);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending products' })
  @ApiResponse({ status: 200, description: 'Trending products returned' })
  async getTrending() {
    return this.searchService.getTrending();
  }
}
