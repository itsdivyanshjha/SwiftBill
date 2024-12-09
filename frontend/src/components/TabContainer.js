import React, { useState } from 'react';
import InvoicesTab from './tabs/InvoicesTab';
import ProductsTab from './tabs/ProductsTab';
import CustomersTab from './tabs/CustomersTab';

const TabContainer = () => {
  const [activeTab, setActiveTab] = useState('invoices');

  const tabs = [
    { id: 'invoices', label: 'Invoices' },
    { id: 'products', label: 'Products' },
    { id: 'customers', label: 'Customers' },
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="p-4">
        {activeTab === 'invoices' && <InvoicesTab />}
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'customers' && <CustomersTab />}
      </div>
    </div>
  );
};

export default TabContainer; 