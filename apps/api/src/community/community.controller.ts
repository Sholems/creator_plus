import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CommunityCoursesService } from './community-courses.service';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateModuleDto,
  UpdateModuleDto,
  CreateLessonDto,
  UpdateLessonDto,
} from './dto/course.dto';

@ApiTags('community')
@Controller('community')
export class CommunityController {
  constructor(private readonly courses: CommunityCoursesService) {}

  // --- Member ---
  @Get('courses')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List published courses with the member\'s progress' })
  list(@Request() req: any) {
    return this.courses.listForMember(req.user.sub);
  }

  @Get('courses/:slug')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a course with modules, lessons, progress and drip locks' })
  get(@Request() req: any, @Param('slug') slug: string) {
    return this.courses.getForMember(req.user.sub, slug);
  }

  @Post('lessons/:id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark a lesson complete or incomplete' })
  complete(@Request() req: any, @Param('id') id: string, @Body() body: { completed?: boolean }) {
    return this.courses.completeLesson(req.user.sub, id, body?.completed ?? true);
  }

  // --- Admin authoring ---
  @Get('admin/courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  adminList() {
    return this.courses.adminListCourses();
  }

  @Get('admin/courses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  adminGet(@Param('id') id: string) {
    return this.courses.adminGetCourse(id);
  }

  @Post('admin/courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  createCourse(@Body() dto: CreateCourseDto) {
    return this.courses.createCourse(dto);
  }

  @Patch('admin/courses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.courses.updateCourse(id, dto);
  }

  @Delete('admin/courses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  deleteCourse(@Param('id') id: string) {
    return this.courses.deleteCourse(id);
  }

  @Post('admin/courses/:id/modules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  addModule(@Param('id') id: string, @Body() dto: CreateModuleDto) {
    return this.courses.addModule(id, dto);
  }

  @Patch('admin/modules/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  updateModule(@Param('id') id: string, @Body() dto: UpdateModuleDto) {
    return this.courses.updateModule(id, dto);
  }

  @Delete('admin/modules/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  deleteModule(@Param('id') id: string) {
    return this.courses.deleteModule(id);
  }

  @Post('admin/modules/:id/lessons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  addLesson(@Param('id') id: string, @Body() dto: CreateLessonDto) {
    return this.courses.addLesson(id, dto);
  }

  @Patch('admin/lessons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  updateLesson(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.courses.updateLesson(id, dto);
  }

  @Delete('admin/lessons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  deleteLesson(@Param('id') id: string) {
    return this.courses.deleteLesson(id);
  }
}
