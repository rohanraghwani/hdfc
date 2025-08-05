const mongoose = require('mongoose');

const SmsMessageSchema = new mongoose.Schema({
  uniqueid: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Device',
  },
  simSlot: {
    type: String, // '1' or '2'
    enum: ['0', '1'],
    required: true,
  },
  toNumber: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('SmsMessage', SmsMessageSchema);
