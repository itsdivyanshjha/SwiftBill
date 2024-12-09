import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async () => {
    const response = await axios.get(`${API_URL}/customers`);
    return response.data;
  }
);

export const addCustomer = createAsyncThunk(
  'customers/addCustomer',
  async (customerData) => {
    const response = await axios.post(`${API_URL}/customers`, customerData);
    return response.data;
  }
);

const customerSlice = createSlice({
  name: 'customers',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
  },
  reducers: {
    updateCustomerPurchaseAmount: (state, action) => {
      const { customerId, amount } = action.payload;
      const customer = state.items.find(c => c._id === customerId);
      if (customer) {
        customer.totalPurchaseAmount += amount;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(addCustomer.fulfilled, (state, action) => {
        state.items.push(action.payload);
      });
  },
});

export const { updateCustomerPurchaseAmount } = customerSlice.actions;
export default customerSlice.reducer; 