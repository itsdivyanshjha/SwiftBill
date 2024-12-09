const { DocumentProcessingService } = require('../services/documentProcessing');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

const documentProcessor = new DocumentProcessingService();

exports.processDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Process the document using Gemini API
    const extractedData = await documentProcessor.processDocument(req.file);

    // Create new invoice
    const invoice = new Invoice({
      serialNumber: extractedData.serialNumber,
      customerName: extractedData.customerName,
      productName: extractedData.productName,
      quantity: extractedData.quantity,
      tax: extractedData.tax,
      totalAmount: extractedData.totalAmount
    });
    await invoice.save();

    // Update or create product
    await Product.findOneAndUpdate(
      { name: extractedData.productName },
      {
        $inc: { quantity: extractedData.quantity }
      },
      { upsert: true }
    );

    // Update or create customer
    await Customer.findOneAndUpdate(
      { name: extractedData.customerName },
      {
        $inc: { totalPurchaseAmount: extractedData.totalAmount }
      },
      { upsert: true }
    );

    res.status(200).json({
      message: 'Document processed successfully',
      data: extractedData
    });
  } catch (error) {
    res.status(500).json({
      error: 'Document processing failed',
      details: error.message
    });
  }
}; 