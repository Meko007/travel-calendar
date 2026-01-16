import { Injectable } from '@nestjs/common';
import { CreateTripDto, UpdateTripDto } from './dto/trips.dto';
import { DbService } from '../common/db/db.service';

@Injectable()
export class TripsService {
  constructor(
      private readonly prisma: DbService,
  ) {}

  async create(dto: CreateTripDto, userId: string) {
    return await this.prisma.trip.create({
      data: {
        ...dto,
        tripDateTime: new Date(dto.tripDateTime),
        userId,
      }
    });
  }

  async findAll(page: number = 1, limit: number = 10, userId: string) {
    return await this.prisma.trip.findMany({
      where: {
        userId,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        tripDateTime: 'asc',
      },
    });
  }

  async findById(id: string, userId: string) {
    return await this.prisma.trip.findUnique({
      where: {
        id,
        userId,
      },
    });
  }

  async findByDestination(destination: string, userId: string) {
    return await this.prisma.trip.findMany({
      where: {
        destination: {
          contains: destination,
        },
        userId,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateTripDto) {
    return await this.prisma.trip.update({
      where: {
        id,
        userId,
      },
      data: dto,
    });
  }

  async delete(id: string, userId: string) {
    await this.prisma.trip.delete({
      where: {
        id,
        userId,
      },
    });

    return { message: 'Trip deleted successfully' };
  }
}
