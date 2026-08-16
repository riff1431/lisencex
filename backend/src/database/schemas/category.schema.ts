import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true, collection: 'categories' })
export class Category {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ type: String, default: '' })
  description?: string;

  @Prop({ type: String, default: null })
  icon?: string;

  @Prop({ type: String, default: null })
  thumbnailUrl?: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null, index: true })
  parentId?: Types.ObjectId;

  @Prop({ type: String, default: null, lowercase: true, index: true })
  parentSlug?: string;

  @Prop({ type: Number, default: 0 })
  displayOrder: number;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: String, default: '' })
  seoTitle?: string;

  @Prop({ type: String, default: '' })
  metaDescription?: string;

  @Prop({ type: Number, default: 0 })
  productCount: number;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ parentId: 1, displayOrder: 1 });
CategorySchema.index({ isActive: 1, displayOrder: 1 });
