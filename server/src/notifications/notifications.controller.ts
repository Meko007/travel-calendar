import { Controller, Get, Patch, Param, Query, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @Query('unread') unread: string = 'false',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Req() req,
  ) {
    return this.notificationsService.list(
      req.user.id,
      unread === 'true',
      parseInt(page),
      parseInt(limit),
    );
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req) {
    return this.notificationsService.markRead(id, req.user.id);
  }
}
