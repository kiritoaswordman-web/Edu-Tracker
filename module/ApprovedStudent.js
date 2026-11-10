const mongoose = require('mongoose');
const ApprovedStudentSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  branch: { type: String, required: true, trim: true },
  year: { type: String, required: true, trim: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  registered: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('ApprovedStudent', ApprovedStudentSchema);
