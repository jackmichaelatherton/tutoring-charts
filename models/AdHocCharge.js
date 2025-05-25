const mongoose = require('mongoose');

const AdHocChargeSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  agent: mongoose.Schema.Types.Mixed,
  appointment: mongoose.Schema.Types.Mixed,
  category: {
    branch_tax_setup: String,
    contractor_tax_setup: String,
    contractor_usable: Boolean,
    default_charge_amount: String,
    default_description: String,
    default_pay_amount: String,
    dft_net_gross: String,
    id: Number,
    name: String
  },
  category_id: Number,
  category_name: String,
  charge_client_forex: mongoose.Schema.Types.Mixed,
  client_cost: String,
  client: {
    id: Number,
    first_name: String,
    last_name: String,
    email: String,
    url: String
  },
  contractor: mongoose.Schema.Types.Mixed,
  creator: mongoose.Schema.Types.Mixed,
  currency: String,
  currency_conversion: mongoose.Schema.Types.Mixed,
  date_occurred: Date,
  invoices: [{
    id: Number,
    display_id: String,
    date_sent: Date,
    gross: String,
    net: Number,
    tax: String,
    client: {
      id: Number,
      first_name: String,
      last_name: String,
      email: String,
      url: String
    },
    status: String,
    url: String
  }],
  payment_orders: [mongoose.Schema.Types.Mixed],
  net_gross: String,
  pay_contractor: mongoose.Schema.Types.Mixed,
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
  tax_amount: Number
}, { timestamps: true });

module.exports = mongoose.model('AdHocCharge', AdHocChargeSchema);
