import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingsDocument = Settings & Document;

@Schema({ timestamps: true, collection: 'settings' })
export class Settings {
  @Prop({ required: true, unique: true, trim: true })
  key: string;

  @Prop({ type: Object, required: true })
  value: any;

  @Prop({ type: String, default: '' })
  description?: string;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
