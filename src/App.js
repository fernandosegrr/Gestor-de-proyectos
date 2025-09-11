import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import ProjectManager from './components/ProjectManager';
import FinancialReports from './components/FinancialReports';
import ClientDatabase from './components/ClientDatabase';
import ExpenseManager from './components/ExpenseManager';

function App() {
  return (
    <Router>
      <div className="App min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <Navigation />
        <div className="pt-20"> {/* Espacio para navbar fijo */}
          <Routes>
            <Route path="/" element={<ProjectManager />} />
            <Route path="/projects" element={<ProjectManager />} />
            <Route path="/reports" element={<FinancialReports />} />
            <Route path="/clients" element={<ClientDatabase />} />
            <Route path="/expenses" element={<ExpenseManager />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;