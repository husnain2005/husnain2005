import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customersApi } from '../services/api';
import { Search, Plus, Building2, MapPin, Phone, Mail, Wrench } from 'lucide-react';

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await customersApi.getAll({ search });
      setCustomers(response.data.customers);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clienti</h1>
          <p className="text-gray-500">Gestione anagrafica clienti</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca cliente per nome, codice o città..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="loader"></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
          Nessun cliente trovato
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map(customer => (
            <div key={customer.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Building2 className="text-primary-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{customer.name}</h3>
                    <p className="text-sm text-gray-500">{customer.code}</p>
                  </div>
                </div>
                {customer.machines_count > 0 && (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Wrench size={14} />
                    {customer.machines_count}
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {customer.city && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin size={14} className="text-gray-400" />
                    {customer.city}{customer.province && `, ${customer.province}`}
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={14} className="text-gray-400" />
                    {customer.phone}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail size={14} className="text-gray-400" />
                    <a href={`mailto:${customer.email}`} className="text-primary-600 hover:underline truncate">
                      {customer.email}
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t flex justify-between">
                <Link
                  to={`/machines?customer_id=${customer.id}`}
                  className="text-sm text-primary-600 hover:underline"
                >
                  Vedi macchine
                </Link>
                {customer.latitude && customer.longitude && (
                  <Link
                    to={`/map?lat=${customer.latitude}&lng=${customer.longitude}`}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    Mappa
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Customers;
