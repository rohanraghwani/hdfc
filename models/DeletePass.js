const mongoose = require('mongoose');

const deletePassSchema = new mongoose.Schema({
  password: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('DeletePass', deletePassSchema);
