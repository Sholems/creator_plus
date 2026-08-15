import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const CATEGORIES = [
  'TECHNICAL',
  'BILLING',
  'DOWNLOADS',
  'REFUNDS',
  'ACCOUNT',
  'CREATOR_VERIFICATION',
  'ABUSE_REPORT',
] as const;

export class CreateSupportTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  description: string;

  @IsOptional()
  @IsIn(CATEGORIES)
  category?: (typeof CATEGORIES)[number];
}

export class ReplyTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  message: string;
}

export class UpdateTicketStatusDto {
  @IsIn(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
}

export class UpdateTicketPriorityDto {
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export class AssignTicketDto {
  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}
