const genai = require('@google/generative-ai');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
require('dotenv').config();
const Papa = require('papaparse');

// Configure Gemini API
const genaiInstance = new genai.GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

class DocumentProcessingService {
  async processDocument(file) {
    try {
      logger.info('Starting document processing for file:', {
        filename: file.originalname,
        mimetype: file.mimetype
      });

      const model = genaiInstance.getGenerativeModel({ model: "gemini-1.5-pro" });
      const fileContent = await fs.readFile(file.path);
      
      let extractedData;
      if (file.mimetype === 'application/pdf') {
        extractedData = await this.processPDF(model, fileContent);
      } else if (file.mimetype.includes('image')) {
        extractedData = await this.processImage(model, fileContent);
      } else if (file.mimetype.includes('csv') || file.mimetype.includes('excel')) {
        extractedData = await this.processSpreadsheet(fileContent);
      }

      if (!extractedData) {
        logger.error('No data extracted from file');
        throw new Error('No data could be extracted from the file');
      }

      // Add default values for missing fields
      extractedData = {
        serialNumber: extractedData.serialNumber || `INV-${Date.now()}`,
        date: extractedData.date || new Date().toISOString(),
        customerName: extractedData.customerName || 'Unknown Customer',
        productName: extractedData.productName || 'Unknown Product',
        quantity: extractedData.quantity || 1,
        unitPrice: extractedData.unitPrice || 0,
        taxAmount: extractedData.taxAmount || 0,
        discount: extractedData.discount || 0,
        priceWithTax: extractedData.priceWithTax || 0,
        totalAmount: extractedData.totalAmount || 0,
        customerEmail: extractedData.customerEmail || '',
        customerPhone: extractedData.phoneNumber || '',
        customerAddress: extractedData.address || ''
      };

      logger.info('Data extracted successfully:', extractedData);

      // Validate the data
      if (!this.validateExtractedData(extractedData)) {
        logger.error('Validation failed for extracted data:', extractedData);
        throw new Error('Invalid or incomplete data extracted');
      }

      return extractedData;
    } catch (error) {
      logger.error('Document Processing Error:', error);
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }

  async processPDF(model, fileContent) {
    try {
      const prompt = `Extract the following information from this tax invoice:

1. Invoice Number (INV-54CZS format)
2. Invoice Date (DD MMM YYYY format)
3. Company Details:
   - Name
   - GSTIN
   - Address
   - Mobile
   - Email
4. Customer Details:
   - Name (from Consignee or Buyer section)
   - Address
5. Items (extract first item's details):
   - Description
   - Tax Rate (%)
   - Quantity
   - Rate/Item
   - Amount

Format the response exactly as:
Invoice Number: [value]
Date: [value]
Company Name: [value]
GSTIN: [value]
Company Address: [value]
Company Mobile: [value]
Company Email: [value]
Customer Name: [value]
Customer Address: [value]
Product Description: [value]
Tax Rate: [value]
Quantity: [value]
Unit Price: [value]
Amount: [value]`;

      const response = await model.generateContent([
        { text: prompt },
        { inlineData: { data: fileContent.toString('base64'), mimeType: 'application/pdf' } }
      ]);

      const result = await response.response.text();
      logger.info('PDF processing response:', result);

      return this.parseExtractedData(result);
    } catch (error) {
      logger.error('PDF Processing Error:', error);
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  async processImage(model, fileContent) {
    try {
      logger.info('Processing image file');
      // Use the same prompt as PDF processing for consistency
      const prompt = `Extract the following information from this invoice image and format it exactly as shown:
      [Same prompt as PDF processing]`;

      const response = await model.generateContent([
        { text: prompt },
        { inlineData: { data: fileContent.toString('base64'), mimeType: 'image/jpeg' } }
      ]);

      return this.parseExtractedData(response.response.text());
    } catch (error) {
      logger.error('Image Processing Error:', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  async processSpreadsheet(fileContent) {
    try {
      logger.info('Processing spreadsheet file');
      // Use PapaParse for CSV/Excel processing
      const csvData = fileContent.toString();
      return new Promise((resolve, reject) => {
        Papa.parse(csvData, {
          header: true,
          complete: (results) => {
            const row = results.data[0]; // Process first row
            const extractedData = {
              serialNumber: row['Invoice #'] || row['Serial Number'] || row['Reference #'],
              date: row['Date'] || new Date().toISOString(),
              customerName: row['Customer Name'] || row['Bill To'],
              phoneNumber: row['Phone'] || row['Phone Number'] || row['Contact'],
              email: row['Email'] || '',
              address: row['Address'] || '',
              productName: row['Product'] || row['Item'] || row['Description'],
              quantity: parseInt(row['Quantity'] || '0'),
              unitPrice: parseFloat(row['Unit Price'] || '0'),
              taxAmount: parseFloat(row['Tax'] || '0'),
              discount: parseFloat(row['Discount'] || '0'),
              priceWithTax: parseFloat(row['Price with Tax'] || '0'),
              totalAmount: parseFloat(row['Total'] || row['Total Amount'] || '0')
            };
            resolve(extractedData);
          },
          error: (error) => reject(error)
        });
      });
    } catch (error) {
      logger.error('Spreadsheet Processing Error:', error);
      throw new Error(`Spreadsheet processing failed: ${error.message}`);
    }
  }

  parseExtractedData(text) {
    logger.debug('Parsing extracted text:', text);

    try {
      const patterns = {
        serialNumber: /Invoice Number:\s*([^\n]*)/i,
        date: /Date:\s*([^\n]*)/i,
        companyName: /Company Name:\s*([^\n]*)/i,
        gstin: /GSTIN:\s*([^\n]*)/i,
        companyAddress: /Company Address:\s*([^\n]*)/i,
        companyMobile: /Company Mobile:\s*([^\n]*)/i,
        companyEmail: /Company Email:\s*([^\n]*)/i,
        customerName: /Customer Name:\s*([^\n]*)/i,
        customerAddress: /Customer Address:\s*([^\n]*)/i,
        productName: /Product Description:\s*([^\n]*)/i,
        taxRate: /Tax Rate:\s*(\d+(?:\.\d+)?)/i,
        quantity: /Quantity:\s*(\d+(?:\.\d+)?)/i,
        unitPrice: /Unit Price:\s*(\d+(?:\.\d+)?)/i,
        amount: /Amount:\s*(\d+(?:\.\d+)?)/i
      };

      const data = {
        serialNumber: text.match(patterns.serialNumber)?.[1]?.trim() || '',
        date: text.match(patterns.date)?.[1]?.trim() || new Date().toISOString(),
        companyName: text.match(patterns.companyName)?.[1]?.trim() || '',
        gstin: text.match(patterns.gstin)?.[1]?.trim() || '',
        companyAddress: text.match(patterns.companyAddress)?.[1]?.trim() || '',
        companyMobile: text.match(patterns.companyMobile)?.[1]?.trim() || '',
        companyEmail: text.match(patterns.companyEmail)?.[1]?.trim() || '',
        customerName: text.match(patterns.customerName)?.[1]?.trim() || '',
        customerAddress: text.match(patterns.customerAddress)?.[1]?.trim() || '',
        productName: text.match(patterns.productName)?.[1]?.trim() || '',
        taxAmount: parseFloat(text.match(patterns.taxRate)?.[1] || '0'),
        quantity: parseInt(text.match(patterns.quantity)?.[1] || '0'),
        unitPrice: parseFloat(text.match(patterns.unitPrice)?.[1] || '0'),
        totalAmount: parseFloat(text.match(patterns.amount)?.[1] || '0')
      };

      // Calculate missing fields if necessary
      data.priceWithTax = data.totalAmount;
      data.discount = 0;

      logger.info('Extracted data:', data);

      if (!this.validateExtractedData(data)) {
        throw new Error('Invalid or incomplete data extracted');
      }

      return data;
    } catch (error) {
      logger.error('Parsing Error:', error);
      throw new Error(`Data parsing failed: ${error.message}`);
    }
  }

  validateExtractedData(data) {
    // Relaxed validation - check only critical fields
    const criticalFields = [
      'serialNumber',
      'customerName',
      'productName',
      'quantity',
      'totalAmount'
    ];

    const isValid = criticalFields.every(field => {
      const value = data[field];
      if (typeof value === 'number') {
        return !isNaN(value) && value >= 0;
      }
      return !!value && value.trim() !== '';
    });

    logger.info('Data validation result:', { isValid, data });
    return isValid;
  }
}

module.exports = {
  DocumentProcessingService,
  upload
}; 