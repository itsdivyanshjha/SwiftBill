const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  serialNumber: { type: String, required: true },
  date: { type: Date, required: true, default: Date.now },
  customerName: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  priceWithTax: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  // Additional fields
  customerEmail: String,
  customerPhone: String,
  customerAddress: String,
  notes: String,
  status: { type: String, default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema); 