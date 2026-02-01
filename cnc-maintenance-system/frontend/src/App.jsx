import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Machines from './pages/Machines';
import MachineCreate from './pages/MachineCreate';
import MachineDetail from './pages/MachineDetail';
import Issues from './pages/Issues';
import IssueDetail from './pages/IssueDetail';
import IssueCreate from './pages/IssueCreate';
import Customers from './pages/Customers';
import MapView from './pages/MapView';
import PdfImport from './pages/PdfImport';
import Users from './pages/Users';

// Protected Route wrapper
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="loader mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="machines" element={<Machines />} />
        <Route path="machines/new" element={<MachineCreate />} />
        <Route path="machines/:id" element={<MachineDetail />} />
        <Route path="issues" element={<Issues />} />
        <Route path="issues/new" element={<IssueCreate />} />
        <Route path="issues/:id" element={<IssueDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="map" element={<MapView />} />
        <Route path="pdf-import" element={<PdfImport />} />
        <Route path="users" element={
          <ProtectedRoute requireAdmin>
            <Users />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
