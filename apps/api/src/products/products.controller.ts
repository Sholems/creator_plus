import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from '../common';

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all products' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'creatorId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiResponse({ status: 200, description: 'Products returned' })
  async findAll(
    @Request() req,
    @Query('categoryId') categoryId?: string,
    @Query('creatorId') creatorId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    return this.productsService.findAll({
      categoryId,
      creatorId,
      status: status as any,
      page: page ? parseInt(page as any) : undefined,
      perPage: perPage ? parseInt(perPage as any) : undefined,
      viewerUserId: req.user?.sub,
    });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product by slug' })
  @ApiResponse({ status: 200, description: 'Product returned' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findBySlug(@Param('slug') slug: string, @Query('track') track?: string) {
    return this.productsService.findBySlug(slug, track !== 'false');
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async create(@Request() req, @Body() dto: CreateProductDto) {
    return this.productsService.create(req.user.sub, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, req.user.sub, dto);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit product for review' })
  @ApiResponse({ status: 200, description: 'Product submitted for review' })
  async publish(@Request() req, @Param('id') id: string) {
    return this.productsService.publish(id, req.user.sub);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a product' })
  @ApiResponse({ status: 200, description: 'Product archived' })
  async archive(@Request() req, @Param('id') id: string) {
    return this.productsService.archive(id, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  async delete(@Request() req, @Param('id') id: string) {
    return this.productsService.archive(id, req.user.sub);
  }

  @Post(':id/files')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file to a product' })
  @ApiResponse({ status: 201, description: 'File uploaded' })
  async uploadFile(
    @Request() req,
    @Param('id') id: string,
    @UploadedFile() file: MulterFile,
  ) {
    return this.productsService.addFile(id, req.user.sub, file);
  }

  @Get(':id/files')
  @ApiOperation({ summary: 'Get product files' })
  @ApiResponse({ status: 200, description: 'Product files returned' })
  async getFiles(@Param('id') id: string) {
    return this.productsService.getFiles(id);
  }
}
