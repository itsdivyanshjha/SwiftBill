import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createWorker } from 'tesseract.js';
import Papa from 'papaparse';
import { addInvoice } from '../store/slices/invoiceSlice';
import { updateProductQuantity } from '../store/slices/productSlice';
import { updateCustomerPurchaseAmount } from '../store/slices/customerSlice';
import axios from 'axios';

const FileUpload = () => {
  const dispatch = useDispatch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const processImageOrPdf = async (file) => {
    try {
      const worker = await createWorker({
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(parseInt(m.progress * 100));
          }
        },
      });

      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // Extract data using regex patterns
      const extractedData = extractDataFromText(text);
      if (extractedData) {
        dispatch(addInvoice(extractedData));
        updateRelatedData(extractedData);
      }
    } catch (err) {
      setError('Error processing image/PDF: ' + err.message);
    }
  };

  const processCsvOrExcel = (file) => {
    Papa.parse(file, {
      complete: (results) => {
        const { data } = results;
        // Assuming first row is headers
        const headers = data[0];
        const rows = data.slice(1);

        rows.forEach(row => {
          const invoiceData = mapRowToInvoiceData(headers, row);
          if (invoiceData) {
            dispatch(addInvoice(invoiceData));
            updateRelatedData(invoiceData);
          }
        });
      },
      error: (err) => {
        setError('Error processing CSV/Excel: ' + err.message);
      }
    });
  };

  const extractDataFromText = (text) => {
    try {
      // Basic regex patterns - adjust based on your invoice format
      const serialNumber = text.match(/Invoice #:\s*(\w+)/i)?.[1];
      const customerName = text.match(/Bill To:\s*([^\n]+)/i)?.[1];
      const productName = text.match(/Item:\s*([^\n]+)/i)?.[1];
      const quantity = parseInt(text.match(/Quantity:\s*(\d+)/i)?.[1]);
      const tax = parseFloat(text.match(/Tax:\s*\$?(\d+\.?\d*)/i)?.[1]);
      const totalAmount = parseFloat(text.match(/Total:\s*\$?(\d+\.?\d*)/i)?.[1]);

      if (!serialNumber || !customerName || !productName || !quantity || !tax || !totalAmount) {
        throw new Error('Missing required fields');
      }

      return {
        serialNumber,
        customerName,
        productName,
        quantity,
        tax,
        totalAmount,
        date: new Date()
      };
    } catch (err) {
      setError('Error extracting data: ' + err.message);
      return null;
    }
  };

  const mapRowToInvoiceData = (headers, row) => {
    try {
      const getValueByHeader = (header) => {
        const index = headers.findIndex(h => 
          h.toLowerCase().includes(header.toLowerCase())
        );
        return row[index];
      };

      return {
        serialNumber: getValueByHeader('serial'),
        customerName: getValueByHeader('customer'),
        productName: getValueByHeader('product'),
        quantity: parseInt(getValueByHeader('quantity')),
        tax: parseFloat(getValueByHeader('tax')),
        totalAmount: parseFloat(getValueByHeader('total')),
        date: new Date()
      };
    } catch (err) {
      setError('Error mapping row data: ' + err.message);
      return null;
    }
  };

  const updateRelatedData = (invoiceData) => {
    // Update product quantity
    dispatch(updateProductQuantity({
      productName: invoiceData.productName,
      quantity: invoiceData.quantity
    }));

    // Update customer purchase amount
    dispatch(updateCustomerPurchaseAmount({
      customerName: invoiceData.customerName,
      amount: invoiceData.totalAmount
    }));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
        console.log('No file selected');
        return;
    }

    console.log('Selected file:', {
        name: file.name,
        type: file.type,
        size: file.size
    });

    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('document', file);

    try {
        const apiUrl = `${process.env.REACT_APP_API_URL}/documents/upload`;
        console.log('Sending request to:', apiUrl);
        
        const response = await axios.post(
            apiUrl,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Accept': 'application/json',
                },
                withCredentials: true,
                timeout: 30000,
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    console.log('Upload progress:', percentCompleted + '%');
                }
            }
        );

        console.log('Upload response:', response.data);

        if (response.data.success) {
            // Handle the processed data
            if (response.data.data) {
                // Dispatch the extracted data to Redux store
                await dispatch(addInvoice(response.data.data));
                
                // Update related data in other stores
                if (response.data.data.productName && response.data.data.quantity) {
                    dispatch(updateProductQuantity({
                        productName: response.data.data.productName,
                        quantity: response.data.data.quantity
                    }));
                }
                
                if (response.data.data.customerName && response.data.data.totalAmount) {
                    dispatch(updateCustomerPurchaseAmount({
                        customerName: response.data.data.customerName,
                        amount: response.data.data.totalAmount
                    }));
                }
            }
        } else {
            throw new Error(response.data.message || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        
        setError(
            error.response?.data?.message || 
            error.message || 
            'Network error occurred'
        );
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                PDF, Excel, CSV, or Image files
              </p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileUpload}
              accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png"
            />
          </label>
        </div>
        {isProcessing && (
          <div className="mt-4 text-center text-blue-600">
            Processing file...
          </div>
        )}
        {error && (
          <div className="mt-4 text-center text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload; 