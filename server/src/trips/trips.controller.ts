import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Query, UseGuards } from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto, UpdateTripDto } from './dto/trips.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { buildAuditContext } from '../common/audit/audit.utils';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  create(@Body() createTripDto: CreateTripDto, @Req() req) {
    return this.tripsService.create(createTripDto, req.user.id, buildAuditContext(req));
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Req() req,
    @Query('status') status?: string,
  ) {
    return this.tripsService.findAll(parseInt(page), parseInt(limit), req.user.id, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    return this.tripsService.findById(id, req.user.id);
  }

  // @UseGuards(JwtAuthGuard)
  // @Get('search/:destination')
  // async findByDestination(@Param('destination') destination: string, @Req() req) {
  //   return this.tripsService.findByDestination(destination, req.user.id);
  // }

  @Get('date/:date')
  async findByDate(@Param('date') date: string, @Req() req) {
    return this.tripsService.findByDate(date, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTripDto, @Req() req) {
    return this.tripsService.update(id, req.user.id, dto, buildAuditContext(req));
  }

  @Patch(':id/resubmit')
  resubmit(@Param('id') id: string, @Body() dto: UpdateTripDto, @Req() req) {
    return this.tripsService.resubmit(id, req.user.id, dto, buildAuditContext(req));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.tripsService.delete(id, req.user.id, buildAuditContext(req));
  }
}
