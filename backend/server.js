require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const Invoice = require('./models/Invoice');
const Product = require('./models/Product');
const Customer = require('./models/Customer');

const app = express();

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`Request: ${req.method} ${req.url} from ${req.ip}`);
    next();
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure CORS for more security in production
const corsOptions = {
  origin: ['http://localhost:3000'], // Adjust this to include the origin of your front-end app
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  logger.error(`MongoDB connection error: ${err.message}`);
});

// File Upload Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/csv'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Error handling middleware for general and file upload errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Specific error messages for file upload issues
    logger.error('Multer error:', err);
    return res.status(400).json({
      error: 'File upload error',
      message: err.message
    });
  } else if (err) {
    // Log and respond with other errors
    logger.error('Global error:', err);
    res.status(err.status || 500).json({
      error: 'Server error',
      message: err.message || 'An unknown error occurred'
    });
  } else {
    next();
  }
});

// Add this middleware function before your routes
const syncDataMiddleware = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = async function (data) {
    try {
      // Only process if this is an invoice creation response
      if (req.method === 'POST' && req.path.includes('/api/invoices')) {
        const invoiceData = JSON.parse(data);
        logger.info('Processing invoice data:', invoiceData);
        
        // Update or create product
        const productUpdate = await Product.findOneAndUpdate(
          { name: invoiceData.productName },
          {
            $set: {
              name: invoiceData.productName,
              unitPrice: invoiceData.unitPrice,
              tax: invoiceData.taxAmount,
              priceWithTax: invoiceData.priceWithTax
            },
            $inc: { quantity: invoiceData.quantity }
          },
          { upsert: true, new: true }
        );
        logger.info('Product update result:', productUpdate);

        // Update or create customer
        const customerUpdate = await Customer.findOneAndUpdate(
          { name: invoiceData.customerName },
          {
            $set: {
              name: invoiceData.customerName,
              phoneNumber: invoiceData.companyMobile || 'N/A',
            },
            $inc: { totalPurchaseAmount: invoiceData.totalAmount },
            $push: {
              purchaseHistory: {
                invoiceId: invoiceData._id,
                amount: invoiceData.totalAmount,
                date: invoiceData.date
              }
            }
          },
          { upsert: true, new: true }
        );
        logger.info('Customer update result:', customerUpdate);
      }
    } catch (error) {
      logger.error('Data sync error:', error);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Add the middleware before your routes
app.use(syncDataMiddleware);

// Routes
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/documents', require('./routes/documents'));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));