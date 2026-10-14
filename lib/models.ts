import mongoose, { Schema, models, model } from "mongoose";

const adminSchema = new Schema({ email: { type: String, required: true, unique: true, lowercase: true, index: true }, passwordHash: { type: String, required: true }, createdAt: { type: Date, default: Date.now } }, { versionKey: false });
const eventSchema = new Schema({
  visitedAt: { type: Date, required: true, default: Date.now },
  country: { type: String, default: "Unknown", index: true }, region: { type: String, default: "Unknown", index: true }, city: { type: String, default: "Unknown" }, isp: { type: String, default: "Unknown" }, asn: { type: String, default: "Unknown" },
  device: { type: String, enum: ["Mobile", "Desktop", "Tablet", "Unknown"], default: "Unknown", index: true }, os: { type: String, default: "Unknown" }, browser: { type: String, default: "Unknown" }, ipPrefix: { type: String, default: "" }, visitorId: { type: String, required: true, index: true },
}, { versionKey: false });
eventSchema.index({ visitedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
eventSchema.index({ country: 1, region: 1, device: 1, visitedAt: -1 });
const dailySchema = new Schema({ date: { type: String, required: true, unique: true }, visits: { type: Number, default: 0 }, mobile: { type: Number, default: 0 }, desktop: { type: Number, default: 0 }, tablet: { type: Number, default: 0 }, updatedAt: { type: Date, default: Date.now } }, { versionKey: false });
export const Admin = (models.Admin as mongoose.Model<{ email: string; passwordHash: string }> | undefined) || model<{ email: string; passwordHash: string }>("Admin", adminSchema);
export const AnalyticsEvent: mongoose.Model<any> = (models.AnalyticsEvent as mongoose.Model<any> | undefined) || model("AnalyticsEvent", eventSchema);
export const DailyStat: mongoose.Model<any> = (models.DailyStat as mongoose.Model<any> | undefined) || model("DailyStat", dailySchema);
export type AnalyticsEventDoc = mongoose.InferSchemaType<typeof eventSchema>;
