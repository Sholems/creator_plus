import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/contact.dto';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a contact message (public)' })
  @ApiResponse({ status: 201, description: 'Message received' })
  async create(@Body() dto: CreateContactDto) {
    return this.contactService.create(dto);
  }
}
