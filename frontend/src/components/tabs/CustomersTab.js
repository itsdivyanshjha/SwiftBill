import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchCustomers } from '../../store/slices/customerSlice';

const CustomersTab = () => {
  const dispatch = useDispatch();
  const { items: customers, status, error } = useAppSelector(state => state.customers);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchCustomers());
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
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Phone Number
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Purchase Amount
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {customers.map((customer) => (
            <tr key={customer._id}>
              <td className="px-6 py-4 whitespace-nowrap">{customer.name}</td>
              <td className="px-6 py-4 whitespace-nowrap">{customer.phoneNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                ${customer.totalPurchaseAmount.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustomersTab; 