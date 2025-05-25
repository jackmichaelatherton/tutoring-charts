const mongoose = require('mongoose');

const XeroBankTransactionSchema = new mongoose.Schema({}, { strict: false });

module.exports = mongoose.model('XeroBankTransaction', XeroBankTransactionSchema);