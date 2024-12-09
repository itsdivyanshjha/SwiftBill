import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchInvoices } from '../../store/slices/invoiceSlice';

const InvoicesTab = () => {
  const dispatch = useDispatch();
  const { items: invoices, status, error } = useAppSelector(state => state.invoices);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchInvoices());
    }
  }, [status, dispatch]);

  if (status === 'loading') {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600 py-4">Error: {error}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Serial Number
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Customer Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Product Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quantity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tax
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {invoices.map((invoice) => (
            <tr key={invoice._id}>
              <td className="px-6 py-4 whitespace-nowrap">{invoice.serialNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap">{invoice.customerName}</td>
              <td className="px-6 py-4 whitespace-nowrap">{invoice.productName}</td>
              <td className="px-6 py-4 whitespace-nowrap">{invoice.quantity}</td>
              <td className="px-6 py-4 whitespace-nowrap">${invoice.tax}</td>
              <td className="px-6 py-4 whitespace-nowrap">${invoice.totalAmount}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                {new Date(invoice.date).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InvoicesTab; 