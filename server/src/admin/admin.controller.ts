import { Body, Controller, Get, Patch, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RejectTripDto } from './dto/reject-trip.dto';
import { buildAuditContext } from '../common/audit/audit.utils';
import { SetTemporaryPasswordDto } from './dto/set-temporary-password.dto';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiTags('Admin')
@ApiBearerAuth('JwtAuth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('trips')
  @ApiOperation({ summary: 'List trips with optional status filter and pagination' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter trips by status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination', example: '1' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', example: '10' })
  @ApiResponse({ status: 200, description: 'List of trips retrieved successfully.' })
  listTrips(
    @Query('status') status?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.adminService.listTrips(status, parseInt(page), parseInt(limit));
  }

  @Get('users')
  @ApiOperation({ summary: 'List users with optional search and pagination' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or email' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination', example: '1' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', example: '20' })
  @ApiResponse({ status: 200, description: 'List of users retrieved successfully.' })
  listUsers(
    @Query('search') search?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.listUsers(search, parseInt(page), parseInt(limit));
  }

  @Patch('trips/:id/approve')
  @ApiOperation({ summary: 'Approve a trip by ID' })
  @ApiParam({ name: 'id', description: 'ID of the trip to approve' })
  @ApiResponse({ status: 200, description: 'Trip approved successfully.' })
  approveTrip(@Param('id') id: string, @Req() req) {
    return this.adminService.approveTrip(id, req.user.id, buildAuditContext(req));
  }

  @Patch('trips/:id/reject')
  @ApiOperation({ summary: 'Reject a trip by ID with a reason' })
  @ApiParam({ name: 'id', description: 'ID of the trip to reject' })
  @ApiResponse({ status: 200, description: 'Trip rejected successfully.' })
  rejectTrip(@Param('id') id: string, @Body() dto: RejectTripDto, @Req() req) {
    return this.adminService.rejectTrip(id, dto.reason, req.user.id, buildAuditContext(req));
  }

  @Patch('users/:id/temporary-password')
  @ApiOperation({ summary: 'Set a temporary password for a user by ID' })
  @ApiParam({ name: 'id', description: 'ID of the user to set the temporary password for' })
  @ApiResponse({ status: 200, description: 'Temporary password set successfully.' })
  setTemporaryPassword(@Param('id') userId: string, @Body() dto: SetTemporaryPasswordDto, @Req() req) {
    return this.adminService.setTemporaryPassword(userId, dto.temporaryPassword, req.user.id, buildAuditContext(req));
  }

  @Patch('users/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a user by ID' })
  @ApiParam({ name: 'id', description: 'ID of the user to deactivate' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully.' })
  deactivateUser(@Param('id') userId: string, @Req() req) {
    return this.adminService.deactivateUser(userId, req.user.id, buildAuditContext(req));
  }

  @Patch('users/:id/activate')
  @ApiOperation({ summary: 'Activate a user by ID' })
  @ApiParam({ name: 'id', description: 'ID of the user to activate' })
  @ApiResponse({ status: 200, description: 'User activated successfully.' })
  activateUser(@Param('id') userId: string, @Req() req) {
    return this.adminService.activateUser(userId, req.user.id, buildAuditContext(req));
  }
}
