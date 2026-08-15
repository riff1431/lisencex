import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Settings,
  SettingsDocument,
} from '../../database/schemas/settings.schema';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
  ) {}

  async getAllSettings() {
    const records = await this.settingsModel.find().lean();
    const result: Record<string, any> = {
      systemName: 'LicenseNest Manager',
      envatoApiConfigured: Boolean(process.env.ENVATO_API_TOKEN),
      defaultGracePeriodDays: 7,
      defaultValidationIntervalHours: 24,
      allowRegistration: true,
      rateLimitMaxRequests: 100,
      rateLimitWindowSeconds: 60,
    };

    records.forEach((r) => {
      result[r.key] = r.value;
    });

    return result;
  }

  async updateSetting(key: string, value: any, description?: string) {
    return this.settingsModel.findOneAndUpdate(
      { key },
      { $set: { key, value, description } },
      { upsert: true, new: true },
    );
  }
}
