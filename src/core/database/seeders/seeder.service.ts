import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeederService implements OnModuleInit {
  private username: string;
  private password: string;
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.username = this.configService.get<string>('SUPER_ADMIN_USERNAME') ?? '';
    this.password = this.configService.get<string>('SUPER_ADMIN_PASSWORD') ?? '';
  }

  onModuleInit(): void {
    this.initSeeder();
  }

  private async initSeeder(): Promise<void> {
    if (!this.username || !this.password) {
      this.logger.warn(
        'SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD must be set in .env',
      );
      return;
    }

    try {
      const shouldCreate = await this.checkExistingAdmin();
      if (shouldCreate) {
        await this.createAdmin();
        this.logger.log('Super admin successfully created.');
      } else {
        this.logger.log('Super admin already exists. No action taken.');
      }
    } catch (error) {
      this.logger.error(
        error?.message || error?.toString() || 'Unknown error during seeding',
      );
    }
  }

  private async checkExistingAdmin(): Promise<boolean> {
    const existingAdmin = await this.db.prisma.user.findFirst({
      where: { username: this.username },
    });

    return !existingAdmin;
  }

  private async createAdmin(): Promise<void> {
    const hashedPassword = await bcrypt.hash(this.password, 12);
    await this.db.prisma.user.create({
      data: {
        username: this.username,
        password: hashedPassword,
      },
    });
  }
}
