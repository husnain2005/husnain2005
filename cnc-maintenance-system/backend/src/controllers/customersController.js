const db = require('../config/database');
const https = require('https');

// Mappa nomi paese italiano → codice ISO per Nominatim
const COUNTRY_TO_ISO = {
  'Italia': 'it', 'Stati Uniti': 'us', 'Emirati Arabi Uniti': 'ae',
  'Germania': 'de', 'Francia': 'fr', 'Spagna': 'es', 'Regno Unito': 'gb',
  'Svizzera': 'ch', 'Austria': 'at', 'Belgio': 'be', 'Paesi Bassi': 'nl',
  'Polonia': 'pl', 'Repubblica Ceca': 'cz', 'Romania': 'ro', 'Turchia': 'tr',
  'Arabia Saudita': 'sa', 'Qatar': 'qa', 'Kuwait': 'kw', 'Cina': 'cn',
  'Giappone': 'jp', 'Corea del Sud': 'kr', 'India': 'in', 'Brasile': 'br',
  'Argentina': 'ar', 'Messico': 'mx', 'Canada': 'ca', 'Australia': 'au'
};

async function geocodeAddress({ address, city, province, postal_code, country }) {
  return new Promise((resolve) => {
    try {
      const parts = [address, city, province, postal_code, country].filter(Boolean);
      if (parts.length < 2) return resolve(null);

      const q = encodeURIComponent(parts.join(', '));
      const cc = COUNTRY_TO_ISO[country] || '';
      const url = `https://nominatim.openstreetmap.org/search?q=${q}${cc ? `&countrycodes=${cc}` : ''}&format=json&limit=1&addressdetails=0`;

      const req = https.get(url, { headers: { 'User-Agent': 'CNCMaintenanceSystem/1.0' } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const results = JSON.parse(data);
            if (results.length > 0) {
              resolve({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) });
            } else {
              resolve(null);
            }
          } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(5000, () => { req.destroy(); resolve(null); });
    } catch { resolve(null); }
  });
}

/**
 * Get all customers
 * GET /api/customers
 */
const getCustomers = async (req, res) => {
  try {
    const { search, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT
        c.*,
        (SELECT COUNT(*) FROM machines m WHERE m.customer_id = c.id AND m.is_active = true) as machines_count
      FROM customers c
      WHERE c.is_active = true
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (c.name ILIKE $${paramIndex} OR c.code ILIKE $${paramIndex} OR c.city ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const limitParam = paramIndex++;
    const offsetParam = paramIndex++;
    query += ` ORDER BY c.name LIMIT $${limitParam} OFFSET $${offsetParam}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    res.json({ customers: result.rows });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero dei clienti'
    });
  }
};

/**
 * Get single customer
 * GET /api/customers/:id
 */
const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT c.*, u.full_name as created_by_name
      FROM customers c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Cliente non trovato'
      });
    }

    // Get machines for this customer
    const machinesResult = await db.query(`
      SELECT m.*, mm.machine_type, mm.model_name, ms.size_value
      FROM machines m
      LEFT JOIN machine_models mm ON m.model_id = mm.id
      LEFT JOIN machine_sizes ms ON m.size_id = ms.id
      WHERE m.customer_id = $1 AND m.is_active = true
      ORDER BY m.created_at DESC
    `, [id]);

    res.json({
      customer: result.rows[0],
      machines: machinesResult.rows
    });

  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero del cliente'
    });
  }
};

/**
 * Create new customer
 * POST /api/customers
 */
const createCustomer = async (req, res) => {
  try {
    const {
      code,
      name,
      address,
      city,
      province,
      country,
      postal_code,
      phone,
      email,
      vat_number,
      latitude,
      longitude,
      notes
    } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Dati mancanti',
        message: 'Il nome cliente è obbligatorio'
      });
    }

    // Genera automaticamente il codice cliente
    const lastCode = await db.query(
      "SELECT code FROM customers WHERE code ~ '^CLI[0-9]+$' ORDER BY CAST(SUBSTRING(code FROM 4) AS INTEGER) DESC LIMIT 1"
    );
    let autoCode;
    if (lastCode.rows.length > 0) {
      const lastNum = parseInt(lastCode.rows[0].code.replace('CLI', ''), 10);
      autoCode = `CLI${String(lastNum + 1).padStart(3, '0')}`;
    } else {
      autoCode = 'CLI001';
    }
    const finalCode = code || autoCode;

    // Auto-geocodifica se non sono già fornite le coordinate
    let finalLat = latitude || null;
    let finalLng = longitude || null;
    if (!finalLat && (address || city)) {
      const geo = await geocodeAddress({ address, city, province, postal_code, country: country || 'Italia' });
      if (geo) { finalLat = geo.lat; finalLng = geo.lng; }
    }

    const result = await db.query(`
      INSERT INTO customers (
        code, name, address, city, province, country, postal_code,
        phone, email, vat_number, latitude, longitude, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      finalCode, name, address, city, province, country || 'Italia', postal_code,
      phone, email, vat_number, finalLat, finalLng, notes, req.user.id
    ]);

    // Audit log
    await req.audit('customers', result.rows[0].id, 'INSERT', null, result.rows[0]);

    res.status(201).json({
      message: 'Cliente creato con successo',
      customer: result.rows[0]
    });

  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante la creazione del cliente'
    });
  }
};

/**
 * Update customer
 * PUT /api/customers/:id
 */
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      city,
      province,
      country,
      postal_code,
      phone,
      email,
      vat_number,
      latitude,
      longitude,
      notes
    } = req.body;

    // Get current values
    const current = await db.query('SELECT * FROM customers WHERE id = $1', [id]);

    if (current.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Cliente non trovato'
      });
    }

    const oldValues = current.rows[0];

    const result = await db.query(`
      UPDATE customers SET
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        city = COALESCE($3, city),
        province = COALESCE($4, province),
        country = COALESCE($5, country),
        postal_code = COALESCE($6, postal_code),
        phone = COALESCE($7, phone),
        email = COALESCE($8, email),
        vat_number = COALESCE($9, vat_number),
        latitude = COALESCE($10, latitude),
        longitude = COALESCE($11, longitude),
        notes = COALESCE($12, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
    `, [
      name, address, city, province, country, postal_code,
      phone, email, vat_number, latitude, longitude, notes, id
    ]);

    // Audit log
    await req.audit('customers', parseInt(id), 'UPDATE', oldValues, result.rows[0]);

    res.json({
      message: 'Cliente aggiornato con successo',
      customer: result.rows[0]
    });

  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'aggiornamento del cliente'
    });
  }
};

/**
 * Delete customer (soft delete)
 * DELETE /api/customers/:id
 */
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const current = await db.query('SELECT * FROM customers WHERE id = $1', [id]);

    if (current.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Cliente non trovato'
      });
    }

    // Check if customer has active machines
    const machinesCheck = await db.query(
      'SELECT COUNT(*) as count FROM machines WHERE customer_id = $1 AND is_active = true',
      [id]
    );

    if (parseInt(machinesCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Operazione non permessa',
        message: 'Non è possibile eliminare un cliente con macchine associate'
      });
    }

    await db.query(
      'UPDATE customers SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // Audit log
    await req.audit('customers', parseInt(id), 'DELETE', current.rows[0], { is_active: false });

    res.json({
      message: 'Cliente eliminato con successo'
    });

  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'eliminazione del cliente'
    });
  }
};

const getCustomersForMap = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        c.id, c.name, c.code, c.address, c.city, c.province, c.country,
        c.phone, c.email, c.latitude, c.longitude,
        COUNT(DISTINCT m.id) FILTER (WHERE m.is_active = true) AS machines_count,
        COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'aperta') AS open_issues_count
      FROM customers c
      LEFT JOIN machines m ON m.customer_id = c.id AND m.is_active = true
      LEFT JOIN issues i ON i.machine_id = m.id AND i.status = 'aperta'
      WHERE c.is_active = true AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
      GROUP BY c.id
      ORDER BY c.name
    `);
    res.json({ customers: result.rows });
  } catch (err) {
    console.error('getCustomersForMap error:', err);
    res.status(500).json({ error: 'Errore nel recupero clienti per mappa' });
  }
};

const geocodeCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM customers WHERE id = $1 AND is_active = true', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente non trovato' });

    const c = result.rows[0];
    const geo = await geocodeAddress({ address: c.address, city: c.city, province: c.province, postal_code: c.postal_code, country: c.country });

    if (!geo) return res.status(422).json({ error: 'Indirizzo non trovato. Verifica città e paese.' });

    await db.query('UPDATE customers SET latitude = $1, longitude = $2, updated_at = NOW() WHERE id = $3', [geo.lat, geo.lng, id]);
    res.json({ message: 'Posizione aggiornata', latitude: geo.lat, longitude: geo.lng });
  } catch (err) {
    console.error('geocodeCustomer error:', err);
    res.status(500).json({ error: 'Errore durante la geocodifica' });
  }
};

module.exports = {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomersForMap,
  geocodeCustomer
};
