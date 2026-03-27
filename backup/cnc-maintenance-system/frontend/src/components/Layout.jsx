import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Wrench,
  AlertTriangle,
  Users,
  MapPin,
  FileText,
  Building2,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Calendar,
  UserCircle
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/machines', icon: Wrench, label: 'Macchine' },
  { path: '/issues', icon: AlertTriangle, label: 'Problematiche' },
  { path: '/interventions', icon: Calendar, label: 'Interventi' },
  { path: '/customers', icon: Building2, label: 'Clienti' },
  { path: '/map', icon: MapPin, label: 'Mappa' },
  { path: '/pdf-import', icon: FileText, label: 'Import PDF' },
];

const adminItems = [
  { path: '/users', icon: Users, label: 'Utenti' },
];

function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItem = ({ item }) => (
    <NavLink
      to={item.path}
      onClick={() => setSidebarOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          isActive
            ? 'bg-primary-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`
      }
    >
      <item.icon size={20} />
      <span>{item.label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile header */}
      <header className="lg:hidden bg-white shadow-sm fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu size={24} />
          </button>
          <h1 className="font-semibold text-gray-800">Gestionale Macchine GIANA</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <img src="/icons/logo.webp" alt="GIANA" className="w-8 h-8 rounded object-cover" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
              <span className="hidden items-center justify-center w-8 h-8 bg-primary-600 rounded text-white font-bold text-sm">G</span>
              <div className="leading-tight">
                <span className="font-bold text-sm text-gray-800 block">Gestionale Macchine</span>
                <span className="font-bold text-sm text-primary-600 block">GIANA</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map(item => (
              <NavItem key={item.path} item={item} />
            ))}

            {isAdmin && (
              <>
                <div className="pt-4 mt-4 border-t">
                  <p className="px-4 text-xs font-semibold text-gray-400 uppercase">
                    Amministrazione
                  </p>
                </div>
                {adminItems.map(item => (
                  <NavItem key={item.path} item={item} />
                ))}
              </>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 font-semibold">
                      {user?.full_name?.charAt(0) || user?.username?.charAt(0)}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-800">
                      {user?.full_name || user?.username}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                </div>
                <ChevronDown size={16} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border overflow-hidden">
                  <NavLink
                    to="/profile"
                    onClick={() => { setUserMenuOpen(false); setSidebarOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-50"
                  >
                    <UserCircle size={18} />
                    <span>Il mio Profilo</span>
                  </NavLink>
                  <div className="border-t" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
