import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Search, Plus, Building2, MapPin, Phone, Mail, Wrench,
  X, AlertTriangle, CheckCircle, Edit, Trash2
} from 'lucide-react';

const COUNTRIES = [
  'Italia', 'Stati Uniti', 'Emirati Arabi Uniti', 'Germania', 'Francia',
  'Spagna', 'Regno Unito', 'Svizzera', 'Austria', 'Belgio', 'Paesi Bassi',
  'Polonia', 'Repubblica Ceca', 'Romania', 'Turchia', 'Arabia Saudita',
  'Qatar', 'Kuwait', 'Cina', 'Giappone', 'Corea del Sud', 'India',
  'Brasile', 'Argentina', 'Messico', 'Canada', 'Australia', 'Altro'
];

function Customers() {
  const { isTecnico, isAdmin } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [notification, setNotification] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    code: '',
    name: '',
    address: '',
    city: '',
    province: '',
    country: 'Italia',
    postal_code: '',
    phone: '',
    email: '',
    vat_number: '',
    notes: '',
  };
  const [formData, setFormData] = useState(emptyForm);

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

  const openCreateModal = () => {
    setEditCustomer(null);
    setFormData(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (customer, e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditCustomer(customer);
    setFormData({
      code: customer.code || '',
      name: customer.name || '',
      address: customer.address || '',
      city: customer.city || '',
      province: customer.province || '',
      country: customer.country || 'Italia',
      postal_code: customer.postal_code || '',
      phone: customer.phone || '',
      email: customer.email || '',
      vat_number: customer.vat_number || '',
      notes: customer.notes || '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      if (editCustomer) {
        await customersApi.update(editCustomer.id, formData);
        setNotification({ type: 'success', message: 'Cliente aggiornato con successo' });
      } else {
        await customersApi.create(formData);
        setNotification({ type: 'success', message: 'Cliente creato con successo' });
      }
      setShowModal(false);
      await loadCustomers();
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Errore durante il salvataggio');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customer, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Eliminare il cliente "${customer.name}"?`)) return;
    try {
      await customersApi.delete(customer.id);
      setNotification({ type: 'success', message: 'Cliente eliminato con successo' });
      await loadCustomers();
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Errore durante l\'eliminazione' });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6">
      {/* Notification */}
      {notification && (
        <div className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-2 ${
          notification.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {notification.message}
          <button onClick={() => setNotification(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clienti</h1>
          <p className="text-gray-500">
            Gestione anagrafica clienti
            {!loading && customers.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                {customers.length} trovati
              </span>
            )}
          </p>
        </div>
        {isTecnico && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            <Plus size={18} />
            Nuovo Cliente
          </button>
        )}
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
            <div key={customer.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition relative">
              {/* Edit/Delete actions */}
              {isTecnico && (
                <div className="absolute top-3 right-3 flex gap-1">
                  <button
                    onClick={(e) => openEditModal(customer, e)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded"
                    title="Modifica"
                  >
                    <Edit size={15} />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={(e) => handleDelete(customer, e)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Elimina"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-start gap-3 mb-4 pr-10">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="text-primary-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{customer.name}</h3>
                  <p className="text-sm text-gray-500">{customer.code}</p>
                </div>
                {customer.machines_count > 0 && (
                  <span className="ml-auto flex items-center gap-1 text-sm text-gray-500 flex-shrink-0">
                    <Wrench size={14} />
                    {customer.machines_count}
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {customer.city && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                    {customer.city}{customer.province && `, ${customer.province}`}
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={14} className="text-gray-400 flex-shrink-0" />
                    <a href={`tel:${customer.phone}`} className="hover:text-primary-600">
                      {customer.phone}
                    </a>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail size={14} className="text-gray-400 flex-shrink-0" />
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
                  Vedi macchine ({customer.machines_count || 0})
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">
                {editCustomer ? 'Modifica Cliente' : 'Nuovo Cliente'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
                  <AlertTriangle size={16} />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              {/* Paese */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paese</label>
                <select
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Indirizzo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder={formData.country === 'Italia' ? 'es. Via Roma 1' : 'es. 123 Main St'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Città</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder={formData.country === 'Stati Uniti' ? 'es. New York' : formData.country === 'Emirati Arabi Uniti' ? 'es. Dubai' : 'es. Milano'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.country === 'Italia' ? 'Provincia' : 'Stato / Regione'}
                  </label>
                  <input
                    type="text"
                    maxLength={formData.country === 'Italia' ? 2 : 100}
                    value={formData.province}
                    onChange={(e) => handleChange('province', formData.country === 'Italia' ? e.target.value.toUpperCase() : e.target.value)}
                    placeholder={formData.country === 'Italia' ? 'es. MI' : formData.country === 'Stati Uniti' ? 'es. New York' : formData.country === 'Emirati Arabi Uniti' ? 'es. Dubai' : ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.country === 'Italia' ? 'CAP' : 'Codice Postale / ZIP'}
                  </label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => handleChange('postal_code', e.target.value)}
                    placeholder={formData.country === 'Italia' ? 'es. 20100' : formData.country === 'Stati Uniti' ? 'es. 10001' : ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">P.IVA / Codice Fiscale</label>
                <input
                  type="text"
                  value={formData.vat_number}
                  onChange={(e) => handleChange('vat_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="loader w-4 h-4 border-2"></div>
                      Salvataggio...
                    </>
                  ) : (
                    editCustomer ? 'Salva Modifiche' : 'Crea Cliente'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;
