import { Module } from '@nestjs/common';
import { MembershipModule } from '../membership/membership.module';
import { CommunityController } from './community.controller';
import { CommunityCoursesService } from './community-courses.service';
import { CommunityFeedController } from './community-feed.controller';
import { CommunityFeedService } from './community-feed.service';

@Module({
  imports: [MembershipModule],
  controllers: [CommunityController, CommunityFeedController],
  providers: [CommunityCoursesService, CommunityFeedService],
  exports: [CommunityCoursesService, CommunityFeedService],
})
export class CommunityModule {}
