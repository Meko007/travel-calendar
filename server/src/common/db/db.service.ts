import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

@Injectable()
export class DbService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        const url = process.env.DATABASE_URL
        const adapter = new PrismaBetterSqlite3({ url });

        super({ adapter})
    }
    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}