const mongoose = require('mongoose');

const TenderSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  description: String,
  contractor: {
    id: Number,
    first_name: String,
    last_name: String,
    email: String,
    url: String
  },
  created: Date,
  proposed_rate: mongoose.Schema.Types.Mixed,
  service: {
    id: Number,
    name: String,
    dft_charge_type: String,
    created: Date,
    dft_charge_rate: String,
    dft_contractor_rate: String,
    status: String,
    url: String
  },
  status: String
}, { timestamps: true });

module.exports = mongoose.model('Tender', TenderSchema);
