import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const startTime = Date.now();

    res.on("finish", () => {
      const durationMs = Date.now() - startTime;
      const statusCode = res.statusCode;
      const contentLength = res.getHeader("content-length");
      const userAgent = req.get("user-agent") ?? "";
      const ip = req.ip;

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${durationMs}ms - ${contentLength ?? 0}b - ${ip} - ${userAgent}`,
      );
    });

    res.on("close", () => {
      if (!res.writableEnded) {
        const durationMs = Date.now() - startTime;
        this.logger.warn(
          `${method} ${originalUrl} aborted after ${durationMs}ms - ${req.ip}`,
        );
      }
    });

    next();
  }
}
