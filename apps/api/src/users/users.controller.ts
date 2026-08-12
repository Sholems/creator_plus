import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.update(req.user.sub, dto);
  }
}
