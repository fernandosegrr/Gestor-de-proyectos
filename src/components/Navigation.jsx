import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FolderOpen,
  BarChart3,
  Users,
  Menu,
  X,
  DollarSign,
  MessageSquare,
} from 'lucide-react';

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigationItems = [
    {
      path: '/projects',
      name: 'Proyectos',
      icon: FolderOpen,
    },
    {
      path: '/conversations',
      name: 'Conversaciones',
      icon: MessageSquare,
    },
    {
      path: '/reports',
      name: 'Reportes',
      icon: BarChart3,
    },
    {
      path: '/clients',
      name: 'Clientes',
      icon: Users,
    },
    {
      path: '/expenses',
      name: 'Gastos',
      icon: DollarSign,
    },
  ];

  const isActiveRoute = (path) => {
    if (path === '/projects' && (location.pathname === '/' || location.pathname === '/projects')) {
      return true;
    }
    return location.pathname === path;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="app-nav">
        <div className="app-nav__content">
          <Link to="/" className="app-nav__brand" onClick={closeMobileMenu}>
            <img
              src="https://files.catbox.moe/14lubq.png"
              alt="Chatbot Manager"
            />
            <div>
              <p className="app-nav__title">Chatbot Manager</p>
              <p className="app-nav__subtitle">Control central de proyectos</p>
            </div>
          </Link>

          <ul className="app-nav__links">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`app-nav__link ${isActive ? 'app-nav__link--active' : ''}`}
                  >
                    <Icon />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            className="app-nav__toggle"
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        <div className={`app-nav__mobile-sheet ${isMobileMenuOpen ? 'is-open fade-in' : ''}`}>
          <div className="app-nav__mobile-links">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={`app-nav__mobile-link ${isActive ? 'is-active' : ''}`}
                >
                  <Icon />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div
        className={`app-nav__backdrop ${isMobileMenuOpen ? 'is-open' : ''}`}
        onClick={closeMobileMenu}
      />
    </>
  );
};

export default Navigation;
