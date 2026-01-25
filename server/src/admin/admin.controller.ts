import { Body, Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RejectTripDto } from './dto/reject-trip.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('trips')
  listTrips(
    @Query('status') status?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.adminService.listTrips(status, parseInt(page), parseInt(limit));
  }

  @Patch('trips/:id/approve')
  approveTrip(@Param('id') id: string) {
    return this.adminService.approveTrip(id);
  }

  @Patch('trips/:id/reject')
  rejectTrip(@Param('id') id: string, @Body() dto: RejectTripDto) {
    return this.adminService.rejectTrip(id, dto.reason);
  }
}
