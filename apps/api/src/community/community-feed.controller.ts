import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CommunityFeedService } from './community-feed.service';
import { CreatePostDto, UpdatePostDto, CreateCommentDto, CategoryDto } from './dto/feed.dto';

@ApiTags('community-feed')
@Controller('community')
export class CommunityFeedController {
  constructor(private readonly feed: CommunityFeedService) {}

  // --- Member ---
  @Get('categories')
  @UseGuards(JwtAuthGuard)
  categories() {
    return this.feed.listCategories();
  }

  @Get('posts')
  @UseGuards(JwtAuthGuard)
  listPosts(@Request() req: any, @Query('categoryId') categoryId?: string, @Query('page') page?: string) {
    return this.feed.listPosts(req.user.sub, { categoryId, page: page ? Number(page) : 0 });
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  createPost(@Request() req: any, @Body() dto: CreatePostDto) {
    return this.feed.createPost(req.user.sub, dto);
  }

  @Get('posts/:id')
  @UseGuards(JwtAuthGuard)
  getPost(@Request() req: any, @Param('id') id: string) {
    return this.feed.getPost(req.user.sub, id);
  }

  @Patch('posts/:id')
  @UseGuards(JwtAuthGuard)
  updatePost(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.feed.updatePost(req.user.sub, id, dto);
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  deletePost(@Request() req: any, @Param('id') id: string) {
    return this.feed.deletePost(req.user.sub, id);
  }

  @Post('posts/:id/like')
  @UseGuards(JwtAuthGuard)
  toggleLike(@Request() req: any, @Param('id') id: string) {
    return this.feed.toggleLike(req.user.sub, id);
  }

  @Post('posts/:id/comments')
  @UseGuards(JwtAuthGuard)
  addComment(@Request() req: any, @Param('id') id: string, @Body() dto: CreateCommentDto) {
    return this.feed.addComment(req.user.sub, id, dto);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  deleteComment(@Request() req: any, @Param('id') id: string) {
    return this.feed.deleteComment(req.user.sub, id);
  }

  // --- Admin moderation ---
  @Post('admin/posts/:id/pin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  pin(@Param('id') id: string, @Body() body: { pinned?: boolean }) {
    return this.feed.pinPost(id, body?.pinned ?? true);
  }

  @Post('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  createCategory(@Body() dto: CategoryDto) {
    return this.feed.createCategory(dto);
  }

  @Patch('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  updateCategory(@Param('id') id: string, @Body() dto: CategoryDto) {
    return this.feed.updateCategory(id, dto);
  }

  @Delete('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  deleteCategory(@Param('id') id: string) {
    return this.feed.deleteCategory(id);
  }
}
