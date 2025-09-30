import React from 'react';
import './modern.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import ProjectManager from './components/ProjectManager';
import FinancialReports from './components/FinancialReports';
import ClientDatabase from './components/ClientDatabase';
import ExpenseManager from './components/ExpenseManager';
import ConversationsManager from './components/ConversationsManager';
import ChatbotBubble from './components/ChatbotBubble';

function App() {
  return (
    <Router>
      <Navigation />
      <div className="main-container fade-in">
  {/* Título y subtítulo eliminados para un look más minimalista */}
        <div className="pt-8">
          <Routes>
            <Route path="/" element={<ProjectManager />} />
            <Route path="/projects" element={<ProjectManager />} />
            <Route path="/conversations" element={<ConversationsManager />} />
            <Route path="/reports" element={<FinancialReports />} />
            <Route path="/clients" element={<ClientDatabase />} />
            <Route path="/expenses" element={<ExpenseManager />} />
          </Routes>
        </div>
        <ChatbotBubble />
      </div>
    </Router>
  );
}

export default App;
