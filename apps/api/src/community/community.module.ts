import { Module } from '@nestjs/common';
import { MembershipModule } from '../membership/membership.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { CommunityController } from './community.controller';
import { CommunityCoursesService } from './community-courses.service';
import { CommunityFeedController } from './community-feed.controller';
import { CommunityFeedService } from './community-feed.service';
import { CommunityPointsService } from './community-points.service';
import { CommunityAccessService } from './community-access.service';
import { CommunityHomeController } from './community-home.controller';
import { CommunityHomeService } from './community-home.service';
import { CommunityProfilesController } from './community-profiles.controller';
import { CommunityProfilesService } from './community-profiles.service';
import { CommunityEventsController } from './community-events.controller';
import { CommunityEventsService } from './community-events.service';
import { CommunityChallengesController } from './community-challenges.controller';
import { CommunityChallengesService } from './community-challenges.service';

@Module({
  imports: [MembershipModule, NotificationsModule, EmailModule, FeatureFlagsModule],
  controllers: [
    CommunityController,
    CommunityFeedController,
    CommunityHomeController,
    CommunityProfilesController,
    CommunityEventsController,
    CommunityChallengesController,
  ],
  providers: [
    CommunityAccessService,
    CommunityHomeService,
    CommunityProfilesService,
    CommunityCoursesService,
    CommunityFeedService,
    CommunityPointsService,
    CommunityEventsService,
    CommunityChallengesService,
  ],
  exports: [CommunityAccessService, CommunityCoursesService, CommunityFeedService],
})
export class CommunityModule {}
