import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Query, UseGuards } from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto, UpdateTripDto } from './dto/trips.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createTripDto: CreateTripDto, @Req() req) {
    return this.tripsService.create(createTripDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Req() req,
  ) {
    return this.tripsService.findAll(parseInt(page), parseInt(limit), req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    return this.tripsService.findById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search/:destination')
  async findByDestination(@Param('destination') destination: string, @Req() req) {
    return this.tripsService.findByDestination(destination, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTripDto, @Req() req) {
    return this.tripsService.update(id, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.tripsService.delete(id, req.user.id);
  }
}
