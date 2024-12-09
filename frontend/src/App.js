import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import TabContainer from './components/TabContainer';
import FileUpload from './components/FileUpload';

function App() {
  return (
    <Provider store={store}>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-800">
              Invoice Management System
            </h1>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6">
          <FileUpload />
          <TabContainer />
        </main>
      </div>
    </Provider>
  );
}

export default App; 