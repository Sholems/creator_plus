import { Module } from '@nestjs/common';
import { MembershipModule } from '../membership/membership.module';
import { CommunityController } from './community.controller';
import { CommunityCoursesService } from './community-courses.service';

@Module({
  imports: [MembershipModule],
  controllers: [CommunityController],
  providers: [CommunityCoursesService],
  exports: [CommunityCoursesService],
})
export class CommunityModule {}
