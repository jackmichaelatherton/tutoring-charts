const mongoose = require('mongoose');

const PaymentOrderSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  amount: String,
  charges: [{
    adhoc_charge: mongoose.Schema.Types.Mixed,
    amount: String,
    appointment: {
      id: Number,
      start: Date,
      finish: Date,
      topic: String,
      status: String,
      service: {
        id: Number,
        name: String,
        dft_charge_type: String,
        created: Date,
        dft_charge_rate: String,
        dft_contractor_rate: String,
        last_updated: Date,
        status: String,
        url: String
      },
      url: String
    },
    date: Date,
    payee: {
      id: Number,
      first_name: String,
      last_name: String,
      email: String,
      url: String
    },
    payer: String,
    rate: String,
    sales_code: String,
    tax_amount: String,
    units: String
  }],
  date_sent: Date,
  date_void: Date,
  date_paid: Date,
  display_id: String,
  status: String,
  payee: {
    id: Number,
    first_name: String,
    last_name: String,
    email: String,
    url: String
  },
  still_to_pay: Number
}, { timestamps: true });

module.exports = mongoose.model('PaymentOrder', PaymentOrderSchema);
