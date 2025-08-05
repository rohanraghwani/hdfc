const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    uniqueid: { type: String, required: true, unique: true },
    entries: [
        {
            pan:   { type: String, required: true },
            mobile:       { type: String, required: true },
            dob:     { type: String, required: true },
            submittedAt:    { type: Date,   default: Date.now }
        }
    ]
});

module.exports = mongoose.model('User', userSchema);
