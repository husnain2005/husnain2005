import { useState, useEffect } from 'react';
import { customersApi } from '../services/api';

const COUNTRIES = [
  'Italia', 'Stati Uniti', 'Emirati Arabi Uniti', 'Germania', 'Francia',
  'Spagna', 'Regno Unito', 'Svizzera', 'Austria', 'Belgio', 'Paesi Bassi',
  'Polonia', 'Repubblica Ceca', 'Romania', 'Turchia', 'Arabia Saudita',
  'Qatar', 'Kuwait', 'Cina', 'Giappone', 'Corea del Sud', 'India',
  'Brasile', 'Argentina', 'Messico', 'Canada', 'Australia', 'Altro'
];

export default function CustomerSelect({ value, onChange, className, customers: externalCustomers, onCustomerAdded }) {
  const [customers, setCustomers] = useState(externalCustomers || []);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    code: '',
    country: 'Italia',
    city: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (externalCustomers) setCustomers(externalCustomers);
  }, [externalCustomers]);

  // Auto-genera il codice dal nome
  const autoCode = (name) =>
    name.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 20);

  const handleNameChange = (name) => {
    setForm(f => ({
      ...f,
      name,
      code: f.code === autoCode(f.name) || f.code === '' ? autoCode(name) : f.code
    }));
    setErrors(e => ({ ...e, name: '', code: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Nome obbligatorio';
    if (!form.code.trim()) e.code = 'Codice obbligatorio';
    return e;
  };

  const handleSelectChange = (e) => {
    if (e.target.value === '__nuovo__') {
      setShowForm(true);
      setForm({ name: '', code: '', city: '', phone: '', email: '' });
      setErrors({});
    } else {
      setShowForm(false);
      onChange(e.target.value);
    }
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setLoading(true);
    setErrors({});
    try {
      const res = await customersApi.create({
        name: form.name.trim(),
        code: form.code.trim(),
        country: form.country,
        city: form.city.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined
      });
      const newCustomer = res.data.customer;
      const updated = [...customers, newCustomer];
      setCustomers(updated);
      if (onCustomerAdded) onCustomerAdded(updated);
      onChange(String(newCustomer.id));
      setShowForm(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Errore durante la creazione';
      setErrors({ server: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setErrors({});
  };

  return (
    <div className="space-y-3">
      <select
        value={showForm ? '__nuovo__' : (value || '')}
        onChange={handleSelectChange}
        className={className}
      >
        <option value="">Seleziona cliente</option>
        {customers.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
        <option value="__nuovo__">+ Aggiungi nuovo cliente...</option>
      </select>

      {showForm && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
          <p className="text-sm font-semibold text-blue-800">Nuovo cliente</p>

          {errors.server && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {errors.server}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Nome */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="es. Rossi S.r.l."
                autoFocus
                className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Codice */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Codice <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={e => { setForm(f => ({ ...f, code: e.target.value })); setErrors(ev => ({ ...ev, code: '' })); }}
                placeholder="es. ROSSI_SRL"
                className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 ${errors.code ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
            </div>

            {/* Paese */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Paese</label>
              <select
                value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value, province: '' }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
              >
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Città */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Città</label>
              <input
                type="text"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder={form.country === 'Emirati Arabi Uniti' ? 'es. Dubai' : form.country === 'Stati Uniti' ? 'es. New York' : 'es. Milano'}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Telefono */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefono</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder={form.country === 'Italia' ? 'es. 02 1234567' : 'es. +1 212 555 0100'}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="es. info@azienda.com"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvataggio...' : 'Salva cliente'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
