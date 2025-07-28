import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  name: { type: String },
  label: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const videoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  name: { type: String },
  label: { type: String },
  duration: { type: Number },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const visitorAccessSchema = new mongoose.Schema({
  visitor_email: { type: String, trim: true },
  access_time: { type: Date, default: Date.now },
  creator: { type: Boolean, default: false }
}, { _id: false });

const uploadSchema = new mongoose.Schema({
  first_name: { type: String, trim: true },
  last_name: { type: String, trim: true },
  house_name_number: { type: String, trim: true },
  flat_apartment_room: { type: String, trim: true },
  street_road: { type: String, trim: true },
  city: { type: String, trim: true },
  country: { type: String, trim: true },
  postCode: { type: String, trim: true },
  actualPostCode: { type: String, trim: true },
  phoneNumber: { type: String, trim: true },
  email: { type: String, trim: true },
  images: [imageSchema],
  videos: [videoSchema],
  accessCode: { type: String, required: true, unique: true },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  notificationSent: { type: Boolean, default: false },
  firstAccessedAt: { type: Date },
  access_history: [visitorAccessSchema],
  total_access_count: { type: Number, default: 0 },
}, { timestamps: true });

const Upload = mongoose.model('Upload', uploadSchema);
export default Upload; 