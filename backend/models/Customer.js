const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  totalPurchaseAmount: { type: Number, required: true },
  // Additional fields
  email: String,
  address: String,
  notes: String,
  lastPurchaseDate: Date,
  purchaseHistory: [{
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    amount: Number,
    date: Date
  }]
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema); 