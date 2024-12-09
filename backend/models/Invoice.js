const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  serialNumber: { type: String, required: true },
  date: { type: Date, required: true },
  companyName: { type: String },
  gstin: { type: String },
  companyAddress: { type: String },
  companyMobile: { type: String },
  companyEmail: { type: String },
  customerName: { type: String, required: true },
  customerAddress: { type: String },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  priceWithTax: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema); 