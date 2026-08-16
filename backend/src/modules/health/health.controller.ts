import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as os from 'os';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  getHealth() {
    const mongoStatus = this.connection.readyState === 1 ? 'connected' : 'disconnected';
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    return {
      success: true,
      data: {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime,
        database: {
          status: mongoStatus,
          host: this.connection.host,
          name: this.connection.name,
        },
        system: {
          freemem: os.freemem(),
          totalmem: os.totalmem(),
          loadavg: os.loadavg(),
          platform: os.platform(),
          release: os.release(),
        },
        memory: {
          rss: memory.rss,
          heapTotal: memory.heapTotal,
          heapUsed: memory.heapUsed,
        },
      },
    };
  }
}
