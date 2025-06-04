const mongoose = require('mongoose');

const RecipientAppointmentSchema = new mongoose.Schema({
  id: { type: String, required: true }, // ✅ Add this line
  appointment: Number, // TutorCruncher appointment ID
  recipient: Number,
  recipient_name: String,
  paying_client: Number,
  paying_client_name: String,
  charge_rate: String,
  status: String
}, { timestamps: true });

module.exports = mongoose.model('RecipientAppointment', RecipientAppointmentSchema);
