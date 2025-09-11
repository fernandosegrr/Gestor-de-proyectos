import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FolderOpen, 
  BarChart3, 
  Users, 
  Menu, 
  X,
  Home,
  DollarSign // Agregamos el ícono para gastos
} from 'lucide-react';

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigationItems = [
    {
      path: '/projects',
      name: 'Proyectos',
      icon: FolderOpen,
      description: 'Gestión de proyectos de chatbots'
    },
    {
      path: '/reports',
      name: 'Reportes',
      icon: BarChart3,
      description: 'Análisis financiero y estadísticas'
    },
    {
      path: '/clients',
      name: 'Clientes',
      icon: Users,
      description: 'Base de datos de clientes'
    },
    {
      path: '/expenses', // Nueva pestaña de gastos
      name: 'Gastos',
      icon: DollarSign,
      description: 'Gestión de gastos y egresos'
    }
  ];

  const isActiveRoute = (path) => {
    if (path === '/projects' && (location.pathname === '/' || location.pathname === '/projects')) {
      return true;
    }
    return location.pathname === path;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-3">
                <div className="h-10 w-auto">
                  <img 
                    src="https://files.catbox.moe/14lubq.png" 
                    alt="VepiAutoMKT Logo" 
                    className="h-10 w-auto object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-100">Chatbot Manager</h1>
                  <p className="text-xs text-gray-400">Sistema de Gestión</p>
                </div>
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.path);
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-gray-800 border-t border-gray-700">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.path);
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-3 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm opacity-75">{item.description}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Navigation;