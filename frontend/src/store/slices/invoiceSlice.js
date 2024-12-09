import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const fetchInvoices = createAsyncThunk(
  'invoices/fetchInvoices',
  async () => {
    const response = await axios.get(`${API_URL}/invoices`);
    return response.data;
  }
);

export const addInvoice = createAsyncThunk(
  'invoices/addInvoice',
  async (invoiceData) => {
    const response = await axios.post(`${API_URL}/invoices`, invoiceData);
    return response.data;
  }
);

const invoiceSlice = createSlice({
  name: 'invoices',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(addInvoice.fulfilled, (state, action) => {
        state.items.push(action.payload);
      });
  },
});

export default invoiceSlice.reducer; 