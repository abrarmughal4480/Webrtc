import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  house_name_number: {
    type: String,
    required: true,
    trim: true
  },
  street_road: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  post_code: {
    type: String,
    required: true,
    trim: true
  },
  adminEmail: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  userCount: {
    type: Number,
    default: 0
  },
  companyAdmins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  landlords: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update userCount when users are added/removed
companySchema.methods.updateUserCount = function() {
  this.userCount = (this.companyAdmins?.length || 0) + (this.landlords?.length || 0);
  return this.save();
};

const Company = mongoose.model('Company', companySchema);

export default Company;
