import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async () => {
    const response = await axios.get(`${API_URL}/products`);
    return response.data;
  }
);

export const addProduct = createAsyncThunk(
  'products/addProduct',
  async (productData) => {
    const response = await axios.post(`${API_URL}/products`, productData);
    return response.data;
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
  },
  reducers: {
    updateProductQuantity: (state, action) => {
      const { productId, quantity } = action.payload;
      const product = state.items.find(p => p._id === productId);
      if (product) {
        product.quantity = quantity;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(addProduct.fulfilled, (state, action) => {
        state.items.push(action.payload);
      });
  },
});

export const { updateProductQuantity } = productSlice.actions;
export default productSlice.reducer; 