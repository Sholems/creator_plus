import { Module } from '@nestjs/common';
import { MembershipModule } from '../membership/membership.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { CommunityController } from './community.controller';
import { CommunityCoursesService } from './community-courses.service';
import { CommunityFeedController } from './community-feed.controller';
import { CommunityFeedService } from './community-feed.service';
import { CommunityPointsService } from './community-points.service';

@Module({
  imports: [MembershipModule, NotificationsModule, EmailModule],
  controllers: [CommunityController, CommunityFeedController],
  providers: [CommunityCoursesService, CommunityFeedService, CommunityPointsService],
  exports: [CommunityCoursesService, CommunityFeedService],
})
export class CommunityModule {}
