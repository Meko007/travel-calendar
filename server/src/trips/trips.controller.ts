import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  UseGuards,
} from "@nestjs/common";
import { TripsService } from "./trips.service";
import { CreateTripDto, UpdateTripDto } from "./dto/trips.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth/jwt-auth.guard";
import { buildAuditContext } from "../common/audit/audit.utils";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

@Controller("trips")
@UseGuards(JwtAuthGuard)
@ApiTags("Trips")
@ApiBearerAuth("JwtAuth")
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new trip" })
  @ApiBody({ type: CreateTripDto })
  @ApiResponse({
    status: 201,
    description: "The trip has been successfully created.",
  })
  create(@Body() createTripDto: CreateTripDto, @Req() req) {
    return this.tripsService.create(
      createTripDto,
      req.user.id,
      buildAuditContext(req),
    );
  }

  @Get()
  @ApiOperation({ summary: "Get all trips with pagination" })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number for pagination",
    example: "1",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Number of items per page",
    example: "10",
  })
  @ApiQuery({
    name: "status",
    required: false,
    description: "Filter trips by status",
  })
  @ApiResponse({
    status: 200,
    description: "List of trips retrieved successfully.",
  })
  async findAll(
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
    @Req() req,
    @Query("status") status?: string,
  ) {
    return this.tripsService.findAll(
      parseInt(page),
      parseInt(limit),
      req.user.id,
      status,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get trip by ID" })
  @ApiParam({ name: "id", description: "ID of the trip to retrieve" })
  @ApiResponse({ status: 200, description: "Trip retrieved successfully." })
  async findOne(@Param("id") id: string, @Req() req) {
    return this.tripsService.findById(id, req.user.id);
  }

  // @UseGuards(JwtAuthGuard)
  // @Get('search/:destination')
  // async findByDestination(@Param('destination') destination: string, @Req() req) {
  //   return this.tripsService.findByDestination(destination, req.user.id);
  // }

  @Get("date/:date")
  @ApiOperation({ summary: "Get trips by date" })
  @ApiParam({ name: "date", description: "Date to filter trips (YYYY-MM-DD)" })
  @ApiResponse({
    status: 200,
    description: "Trips for the specified date retrieved successfully.",
  })
  async findByDate(@Param("date") date: string, @Req() req) {
    return this.tripsService.findByDate(date, req.user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a trip" })
  @ApiParam({ name: "id", description: "ID of the trip to update" })
  @ApiBody({ type: UpdateTripDto })
  @ApiResponse({
    status: 200,
    description: "The trip has been successfully updated.",
  })
  update(@Param("id") id: string, @Body() dto: UpdateTripDto, @Req() req) {
    return this.tripsService.update(
      id,
      req.user.id,
      dto,
      buildAuditContext(req),
    );
  }

  @Patch(":id/resubmit")
  @ApiOperation({ summary: "Resubmit a trip" })
  @ApiParam({ name: "id", description: "ID of the trip to resubmit" })
  @ApiBody({ type: UpdateTripDto })
  @ApiResponse({
    status: 200,
    description: "The trip has been successfully resubmitted.",
  })
  resubmit(@Param("id") id: string, @Body() dto: UpdateTripDto, @Req() req) {
    return this.tripsService.resubmit(
      id,
      req.user.id,
      dto,
      buildAuditContext(req),
    );
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a trip" })
  @ApiParam({ name: "id", description: "ID of the trip to delete" })
  @ApiResponse({
    status: 200,
    description: "The trip has been successfully deleted.",
  })
  remove(@Param("id") id: string, @Req() req) {
    return this.tripsService.delete(id, req.user.id, buildAuditContext(req));
  }
}
