const genai = require('@google/generative-ai');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
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

      console.log('Extracted Data:', extractedData);
      return extractedData;
    } catch (error) {
      console.error('Document Processing Error:', error);
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }

  async processPDF(model, fileContent) {
    try {
      const prompt = `Extract the following information from this invoice PDF and format it exactly as shown:

Required Invoice Information:
- Invoice/Serial Number (look for Invoice #, Reference #, Order #)
- Date (any date format)
- Customer Information:
  * Customer Name
  * Phone Number
  * Email (if available)
  * Address (if available)
- Product Details:
  * Product Name/Description
  * Quantity
  * Unit Price
  * Tax Amount
  * Discount (if any)
  * Price with Tax
  * Total Amount

Please format the response exactly as:
Serial Number: [value]
Date: [value]
Customer Name: [value]
Phone Number: [value]
Email: [value]
Address: [value]
Product Name: [value]
Quantity: [value]
Unit Price: [value]
Tax Amount: [value]
Discount: [value]
Price with Tax: [value]
Total Amount: [value]`;

      const response = await model.generateContent([
        { text: prompt },
        { inlineData: { data: fileContent.toString('base64'), mimeType: 'application/pdf' } }
      ]);

      return this.parseExtractedData(response.response.text());
    } catch (error) {
      console.error('PDF Processing Error:', error);
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  async processImage(model, fileContent) {
    try {
      // Use the same prompt as PDF processing for consistency
      const prompt = `Extract the following information from this invoice image and format it exactly as shown:
      [Same prompt as PDF processing]`;

      const response = await model.generateContent([
        { text: prompt },
        { inlineData: { data: fileContent.toString('base64'), mimeType: 'image/jpeg' } }
      ]);

      return this.parseExtractedData(response.response.text());
    } catch (error) {
      console.error('Image Processing Error:', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  async processSpreadsheet(fileContent) {
    try {
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
      console.error('Spreadsheet Processing Error:', error);
      throw new Error(`Spreadsheet processing failed: ${error.message}`);
    }
  }

  parseExtractedData(text) {
    console.log('Parsing text:', text);

    try {
      const patterns = {
        serialNumber: /(?:Serial Number|Invoice #|Reference #):\s*([^\n]*)/i,
        date: /Date:\s*([^\n]*)/i,
        customerName: /Customer Name:\s*([^\n]*)/i,
        phoneNumber: /Phone Number:\s*([^\n]*)/i,
        email: /Email:\s*([^\n]*)/i,
        address: /Address:\s*([^\n]*)/i,
        productName: /Product Name:\s*([^\n]*)/i,
        quantity: /Quantity:\s*(\d+)/i,
        unitPrice: /Unit Price:\s*\$?(\d+\.?\d*)/i,
        taxAmount: /Tax Amount:\s*\$?(\d+\.?\d*)/i,
        discount: /Discount:\s*\$?(\d+\.?\d*)/i,
        priceWithTax: /Price with Tax:\s*\$?(\d+\.?\d*)/i,
        totalAmount: /Total Amount:\s*\$?(\d+\.?\d*)/i
      };

      const data = {
        serialNumber: text.match(patterns.serialNumber)?.[1]?.trim(),
        date: text.match(patterns.date)?.[1]?.trim() || new Date().toISOString(),
        customerName: text.match(patterns.customerName)?.[1]?.trim(),
        phoneNumber: text.match(patterns.phoneNumber)?.[1]?.trim(),
        email: text.match(patterns.email)?.[1]?.trim(),
        address: text.match(patterns.address)?.[1]?.trim(),
        productName: text.match(patterns.productName)?.[1]?.trim(),
        quantity: parseInt(text.match(patterns.quantity)?.[1] || '0'),
        unitPrice: parseFloat(text.match(patterns.unitPrice)?.[1] || '0'),
        taxAmount: parseFloat(text.match(patterns.taxAmount)?.[1] || '0'),
        discount: parseFloat(text.match(patterns.discount)?.[1] || '0'),
        priceWithTax: parseFloat(text.match(patterns.priceWithTax)?.[1] || '0'),
        totalAmount: parseFloat(text.match(patterns.totalAmount)?.[1] || '0')
      };

      console.log('Extracted data:', data);

      if (!this.validateExtractedData(data)) {
        throw new Error('Invalid or incomplete data extracted');
      }

      return data;
    } catch (error) {
      console.error('Parsing Error:', error);
      throw new Error(`Data parsing failed: ${error.message}`);
    }
  }

  validateExtractedData(data) {
    // Required fields for each tab
    const requiredInvoiceFields = [
      'serialNumber',
      'customerName',
      'productName',
      'quantity',
      'taxAmount',
      'totalAmount',
      'date'
    ];

    const requiredProductFields = [
      'productName',
      'quantity',
      'unitPrice',
      'taxAmount',
      'priceWithTax'
    ];

    const requiredCustomerFields = [
      'customerName',
      'phoneNumber',
      'totalAmount'
    ];

    const isValid = (
      requiredInvoiceFields.every(field => !!data[field]) &&
      requiredProductFields.every(field => !isNaN(parseFloat(data[field])) || !!data[field]) &&
      requiredCustomerFields.every(field => !!data[field])
    );

    console.log('Data validation result:', isValid);
    return isValid;
  }
}

module.exports = {
  DocumentProcessingService,
  upload
}; 