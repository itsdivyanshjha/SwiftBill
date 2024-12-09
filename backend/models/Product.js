const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  tax: { type: Number, required: true },
  priceWithTax: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  // Additional fields
  description: String,
  category: String,
  sku: String,
  minimumStock: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema); 