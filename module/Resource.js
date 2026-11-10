const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  subject: { type: String, required: true, trim: true },
  url: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: value => /^https?:\/\//i.test(value),
      message: 'Resource URL must start with http:// or https://'
    }
  },
  branch: { type: String, required: true, trim: true },
  year: { type: String, required: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Resource', ResourceSchema);
