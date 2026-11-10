const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
    college: {
        type: String,
        required: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    teacherId: {
        type: Number,
        required: true,
        unique: true,
        min: 1
    },
    subject: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Teacher', TeacherSchema);
