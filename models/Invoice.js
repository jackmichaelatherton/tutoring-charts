const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  charges: [{
    adhoc_charge: {
      id: Number,
      description: String,
      date_occurred: Date,
      category_id: Number,
      category_name: String,
      client_cost: String,
      pay_contractor: mongoose.Schema.Types.Mixed,
      agent_percentage: mongoose.Schema.Types.Mixed,
      url: String
    },
    appointment: {
      id: Number,
      start: Date,
      finish: Date,
      topic: String,
      status: Number,
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
    amount: String,
    date: Date,
    payee: String,
    payer: {
      id: Number,
      first_name: String,
      last_name: String,
      email: String,
      url: String
    },
    rate: String,
    sales_code: String,
    tax_amount: String,
    units: String
  }],
  client: {
    id: Number,
    first_name: String,
    last_name: String,
    email: String,
    url: String
  },
  date_sent: Date,
  date_void: Date,
  date_paid: Date,
  display_id: String,
  gross: String,
  net: Number,
  status: String,
  still_to_pay: Number,
  tax: String
}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
