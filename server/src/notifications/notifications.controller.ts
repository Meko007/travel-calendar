import { Controller, Delete, Get, Patch, Param, Query, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { buildAuditContext } from '../common/audit/audit.utils';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiTags('Notifications')
@ApiBearerAuth('JwtAuth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List Notifications' })
  @ApiQuery({ name: 'unread', required: false, description: 'Filter for unread notifications', type: String })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination', type: String })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of notifications per page', type: String })
  @ApiResponse({ status: 200, description: 'List of notifications retrieved successfully.' })
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
  @ApiOperation({ summary: 'Mark Notification as Read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read successfully.' })
  markRead(@Param('id') id: string, @Req() req) {
    return this.notificationsService.markRead(id, req.user.id, buildAuditContext(req));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete Notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully.' })
  delete(@Param('id') id: string, @Req() req) {
    return this.notificationsService.delete(id, req.user.id, buildAuditContext(req));
  }
}
