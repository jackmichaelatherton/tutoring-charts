const mongoose = require('mongoose');

const MetaSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('Meta', MetaSchema);