const mongoose = require('mongoose');

const RecipientSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  title: String,
  first_name: String,
  last_name: String,
  email: String,
  mobile: String,
  phone: String,
  street: String,
  state: String,
  town: String,
  country: String,
  postcode: String,
  latitude: String,
  longitude: String,
  date_created: Date,
  timezone: String,
  default_rate: String,
  paying_client: {
    id: Number,
    first_name: String,
    last_name: String,
    email: String,
    url: String
  },
  associated_clients: [mongoose.Schema.Types.Mixed],
  academic_year: String,
  last_updated: Date,
  calendar_colour: String,
  labels: [String],
  extra_attrs: [{
    id: Number,
    value: String,
    type: String,
    machine_name: String,
    name: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Recipient', RecipientSchema);