import { Module } from '@nestjs/common';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { DbService } from '../common/db/db.service';

@Module({
  controllers: [TripsController],
  providers: [TripsService, DbService],
})
export class TripsModule {}
