const mongoose = require('mongoose');

const ImportantTopicSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  subject: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  branch: { type: String, required: true, trim: true },
  year: { type: String, required: true, trim: true },
  priority: { type: String, enum: ['Normal', 'Medium', 'High'], default: 'Normal' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true }
}, { timestamps: true });

module.exports = mongoose.model('ImportantTopic', ImportantTopicSchema);
