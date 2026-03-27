/**
 * Seed Data Script
 * Populates database with demo data for testing
 */
const db = require('./database');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Check if already seeded
    const existing = await client.query('SELECT COUNT(*) FROM machines');
    if (parseInt(existing.rows[0].count) > 0) {
      console.log('Database already seeded, skipping.');
      await client.query('ROLLBACK');
      return;
    }

    console.log('Seeding database with demo data...');

    // =============================================
    // SEED USERS
    // =============================================
    console.log('Creating demo users...');
    const password = await bcrypt.hash('password123', 12);

    const usersResult = await client.query(`
      INSERT INTO users (user_id, username, email, password_hash, full_name, role) VALUES
        ('USR001', 'admin', 'admin@cncmaint.com', $1, 'Amministratore Sistema', 'admin'),
        ('USR002', 'mario.rossi', 'mario.rossi@cncmaint.com', $1, 'Mario Rossi', 'tecnico'),
        ('USR003', 'luigi.bianchi', 'luigi.bianchi@cncmaint.com', $1, 'Luigi Bianchi', 'tecnico'),
        ('USR004', 'anna.verdi', 'anna.verdi@cncmaint.com', $1, 'Anna Verdi', 'tecnico'),
        ('USR005', 'paolo.neri', 'paolo.neri@cncmaint.com', $1, 'Paolo Neri', 'lettura'),
        ('USR006', 'laura.gialli', 'laura.gialli@cncmaint.com', $1, 'Laura Gialli', 'tecnico'),
        ('USR007', 'marco.blu', 'marco.blu@cncmaint.com', $1, 'Marco Blu', 'tecnico'),
        ('USR008', 'sara.viola', 'sara.viola@cncmaint.com', $1, 'Sara Viola', 'lettura'),
        ('USR009', 'giovanni.rosa', 'giovanni.rosa@cncmaint.com', $1, 'Giovanni Rosa', 'tecnico'),
        ('USR010', 'elena.marrone', 'elena.marrone@cncmaint.com', $1, 'Elena Marrone', 'admin')
      ON CONFLICT (user_id) DO NOTHING
      RETURNING id;
    `, [password]);

    const adminId = usersResult.rows[0]?.id || 1;
    const tecnicoId = usersResult.rows[1]?.id || 2;

    // =============================================
    // SEED CUSTOMERS
    // =============================================
    console.log('Creating demo customers...');
    await client.query(`
      INSERT INTO customers (code, name, address, city, province, country, postal_code, phone, email, latitude, longitude, created_by) VALUES
        ('CLI001', 'Acciaierie Riunite SpA', 'Via Industriale 45', 'Brescia', 'BS', 'Italia', '25100', '+39 030 1234567', 'info@acciaierie.it', 45.5416, 10.2118, $1),
        ('CLI002', 'Meccanica Precision Srl', 'Via della Meccanica 12', 'Torino', 'TO', 'Italia', '10100', '+39 011 9876543', 'info@meccanicap.it', 45.0703, 7.6869, $1),
        ('CLI003', 'Fonderie del Nord', 'Viale dell''Industria 88', 'Milano', 'MI', 'Italia', '20100', '+39 02 5551234', 'contact@fondnord.it', 45.4642, 9.1900, $1),
        ('CLI004', 'Officine Metallurgiche Venete', 'Via dei Metalli 33', 'Padova', 'PD', 'Italia', '35100', '+39 049 8887766', 'omv@omvenete.it', 45.4064, 11.8768, $1),
        ('CLI005', 'Lavorazioni Industriali Emilia', 'Via Emilia Est 150', 'Bologna', 'BO', 'Italia', '40100', '+39 051 4443322', 'lie@lavemilia.it', 44.4949, 11.3426, $1),
        ('CLI006', 'Torneria Toscana', 'Via Artigianale 22', 'Firenze', 'FI', 'Italia', '50100', '+39 055 6665544', 'info@torntoscana.it', 43.7696, 11.2558, $1),
        ('CLI007', 'Meccanica Pugliese', 'Zona Industriale Lotto 5', 'Bari', 'BA', 'Italia', '70100', '+39 080 3332211', 'mp@mecpuglia.it', 41.1171, 16.8719, $1),
        ('CLI008', 'Steel Works Sicilia', 'Contrada Industriale', 'Catania', 'CT', 'Italia', '95100', '+39 095 1112233', 'sws@steelsicilia.it', 37.5079, 15.0830, $1),
        ('CLI009', 'Nordmeccanica GmbH', 'Industriestraße 45', 'München', 'BY', 'Germania', '80331', '+49 89 12345678', 'info@nordmech.de', 48.1351, 11.5820, $1),
        ('CLI010', 'France Usinage SARL', 'Rue de l''Industrie 78', 'Lyon', '', 'Francia', '69001', '+33 4 12345678', 'contact@frausinage.fr', 45.7640, 4.8357, $1)
      ON CONFLICT (code) DO NOTHING;
    `, [adminId]);

    // Get model and size IDs for machines
    const modelsResult = await client.query('SELECT id, model_name FROM machine_models');
    const modelsMap = {};
    modelsResult.rows.forEach(m => modelsMap[m.model_name] = m.id);

    const sizesResult = await client.query('SELECT id, model_id, size_value FROM machine_sizes');
    const sizesMap = {};
    sizesResult.rows.forEach(s => {
      if (!sizesMap[s.model_id]) sizesMap[s.model_id] = {};
      sizesMap[s.model_id][s.size_value] = s.id;
    });

    const customersResult = await client.query('SELECT id, code FROM customers');
    const customersMap = {};
    customersResult.rows.forEach(c => customersMap[c.code] = c.id);

    // =============================================
    // SEED MACHINES
    // =============================================
    console.log('Creating demo machines...');

    // Helper to get size_id safely
    const getSizeId = (modelName, size) => {
      const modelId = modelsMap[modelName];
      return sizesMap[modelId]?.[size] || null;
    };

    await client.query(`
      INSERT INTO machines (numero_commessa, model_id, size_id, customer_id, axis_type, control_type, serial_number, manufacturing_year, latitude, longitude, address, notes, created_by) VALUES
        ('COM-2024-001', $1, $2, $3, 'SINGOLA_XZ', 'FANUC', 'SN-GGT-001', 2024, 45.5416, 10.2118, 'Via Industriale 45, Brescia', 'Installazione nuova', $18),
        ('COM-2024-002', $4, $5, $6, 'DOPPIA_XZ', 'SINUMERIK_ONE', 'SN-GGT-002', 2024, 45.0703, 7.6869, 'Via della Meccanica 12, Torino', 'Configurazione speciale', $18),
        ('COM-2023-015', $1, $7, $8, 'SINGOLA_XZ', 'CSE', 'SN-GGT-003', 2023, 45.4642, 9.1900, 'Viale dell''Industria 88, Milano', NULL, $18),
        ('COM-2023-022', $9, $10, $11, 'DOPPIA_XZ', 'FANUC', 'SN-TV-001', 2023, 45.4064, 11.8768, 'Via dei Metalli 33, Padova', 'Tornio verticale grande capacità', $18),
        ('COM-2023-033', $12, $13, $14, NULL, 'FAGOR', 'SN-GGB-001', 2023, 44.4949, 11.3426, 'Via Emilia Est 150, Bologna', 'Foratrice alta precisione', $18),
        ('COM-2022-048', $1, $15, $16, 'SINGOLA_XZ', 'FANUC', 'SN-GGT-004', 2022, 43.7696, 11.2558, 'Via Artigianale 22, Firenze', NULL, $18),
        ('COM-2022-055', $17, $2, $3, 'SINGOLA_XZ', 'SINUMERIK_ONE', 'SN-GGL-001', 2022, 45.5416, 10.2118, 'Via Industriale 45, Brescia - Capannone B', 'Secondo impianto', $18),
        ('COM-2024-008', $1, $7, $6, 'DOPPIA_XZ', 'FANUC', 'SN-GGT-005', 2024, 45.0703, 7.6869, 'Via della Meccanica 12, Torino', NULL, $18),
        ('COM-2021-112', $12, $13, $8, NULL, 'CSE', 'SN-GGB-002', 2021, 45.4642, 9.1900, 'Viale dell''Industria 88, Milano - Reparto 2', NULL, $18),
        ('COM-2024-003', $9, $5, $14, 'SINGOLA_XZ', 'SINUMERIK_ONE', 'SN-TV-002', 2024, 44.4949, 11.3426, 'Via Emilia Est 150, Bologna', NULL, $18),
        ('COM-2020-089', $1, $2, $3, 'SINGOLA_XZ', 'FANUC', 'SN-GGT-006', 2020, 45.5416, 10.2118, 'Via Industriale 45, Brescia', 'In garanzia estesa', $18),
        ('COM-2024-011', $4, NULL, $11, NULL, 'FAGOR', 'SN-PICO-001', 2024, 45.4064, 11.8768, 'Via dei Metalli 33, Padova - Sala test', 'PICO nuovo modello', $18),
        ('COM-2023-067', $1, $15, $16, 'DOPPIA_XZ', 'SINUMERIK_ONE', 'SN-GGT-007', 2023, 43.7696, 11.2558, 'Via Artigianale 22, Firenze', NULL, $18),
        ('COM-2019-145', $17, $10, $6, 'SINGOLA_XZ', 'CSE', 'SN-GGL-002', 2019, 45.0703, 7.6869, 'Via della Meccanica 12, Torino - Reparto storico', 'Macchina revisionata 2023', $18),
        ('COM-2024-019', $12, $13, $8, NULL, 'FANUC', 'SN-GGB-003', 2024, 45.4642, 9.1900, 'Viale dell''Industria 88, Milano', 'Ultimo modello', $18)
      ON CONFLICT (numero_commessa) DO NOTHING
    `, [
      modelsMap['GGTRONIC'], // $1
      getSizeId('GGTRONIC', 2000), // $2
      customersMap['CLI001'], // $3
      modelsMap['PICO'], // $4
      getSizeId('GGTRONIC', 3000), // $5
      customersMap['CLI002'], // $6
      getSizeId('GGTRONIC', 2500), // $7
      customersMap['CLI003'], // $8
      modelsMap['TORNIO_VERTICALE'], // $9
      getSizeId('TORNIO_VERTICALE', 4000), // $10
      customersMap['CLI004'], // $11
      modelsMap['GGB'], // $12
      getSizeId('GGB', 2000), // $13
      customersMap['CLI005'], // $14
      getSizeId('GGTRONIC', 1800), // $15
      customersMap['CLI006'], // $16
      modelsMap['GGL'], // $17
      adminId // $18
    ]);

    // Get issue groups
    const groupsResult = await client.query('SELECT id, code FROM issue_groups');
    const groupsMap = {};
    groupsResult.rows.forEach(g => groupsMap[g.code] = g.id);

    // Get machines for issues
    const machinesResult = await client.query('SELECT id, numero_commessa FROM machines');
    const machinesMap = {};
    machinesResult.rows.forEach(m => machinesMap[m.numero_commessa] = m.id);

    // =============================================
    // SEED ISSUES
    // =============================================
    console.log('Creating demo issues...');
    await client.query(`
      INSERT INTO issues (machine_id, numero_commessa, issue_group_id, issue_type, title, description, status, priority, created_by, assigned_to) VALUES
        ($1, 'COM-2024-001', $2, 'MECCANICO', 'Vibrazione anomala durante rotazione', 'Si rileva una vibrazione anomala del mandrino durante la rotazione a velocità superiori a 1500 RPM. Il cliente segnala un peggioramento della finitura superficiale dei pezzi lavorati.', 'in_lavorazione', 'alta', $17, $18),
        ($3, 'COM-2024-002', $4, 'ELETTRICO', 'Errore encoder asse Z', 'Comparsa intermittente errore 414 sul controllo SINUMERIK. L''errore si presenta principalmente dopo lunghi periodi di inattività della macchina.', 'aperta', 'critica', $17, $18),
        ($5, 'COM-2023-015', $6, 'MECCANICO', 'Perdita olio contropunta', 'Rilevata perdita di olio idraulico nella zona della contropunta. Necessaria sostituzione guarnizioni.', 'risolta', 'media', $18, $17),
        ($7, 'COM-2023-022', $8, 'ELETTRICO', 'Guasto pulsantiera', 'Il pulsante di emergenza non risponde correttamente. Verificare cablaggio e contatti.', 'chiusa', 'critica', $17, $18),
        ($9, 'COM-2023-033', $10, 'MECCANICO', 'Usura guide carro', 'Le guide del carro mostrano segni di usura. Pianificare sostituzione durante prossima manutenzione programmata.', 'aperta', 'bassa', $18, $17),
        ($11, 'COM-2022-048', $12, 'ELETTRICO', 'Malfunzionamento convogliatore trucioli', 'Il convogliatore trucioli si blocca frequentemente. Verificare motore e sensori di fine corsa.', 'in_lavorazione', 'media', $17, $18),
        ($1, 'COM-2024-001', $12, 'MECCANICO', 'Intasamento sistema refrigerante', 'Il sistema di raffreddamento presenta un flusso ridotto. Necessaria pulizia filtri e verifica pompa.', 'aperta', 'media', $18, NULL),
        ($3, 'COM-2024-002', $2, 'MECCANICO', 'Gioco eccessivo mandrino', 'Rilevato gioco assiale nel mandrino superiore alla tolleranza. Richiedere intervento specializzato.', 'aperta', 'alta', $17, $18),
        ($13, 'COM-2022-055', $4, 'ELETTRICO', 'Surriscaldamento azionamento', 'L''azionamento asse X presenta temperature superiori alla norma. Verificare ventilazione e parametri.', 'risolta', 'alta', $18, $17),
        ($14, 'COM-2024-008', $6, 'MECCANICO', 'Rumorosità contropunta', 'La contropunta emette un rumore metallico durante l''avanzamento. Controllare cuscinetti.', 'in_lavorazione', 'media', $17, $18),
        ($15, 'COM-2021-112', $8, 'ELETTRICO', 'Display pulsantiera lampeggiante', 'Il display della pulsantiera lampeggia in modo intermittente. Possibile problema alimentazione.', 'aperta', 'bassa', $18, NULL),
        ($16, 'COM-2024-003', $10, 'MECCANICO', 'Precisione carro compromessa', 'Le misurazioni mostrano una deviazione di 0.05mm sulla corsa del carro. Necessaria calibrazione.', 'aperta', 'alta', $17, $18)
    `, [
      machinesMap['COM-2024-001'], // $1
      groupsMap['TESTA_PORTA_PEZZO'], // $2
      machinesMap['COM-2024-002'], // $3
      groupsMap['ELETTRONICA'], // $4
      machinesMap['COM-2023-015'], // $5
      groupsMap['CONTROPUNTA'], // $6
      machinesMap['COM-2023-022'], // $7
      groupsMap['PULSANTIERA_CN'], // $8
      machinesMap['COM-2023-033'], // $9
      groupsMap['CARRO'], // $10
      machinesMap['COM-2022-048'], // $11
      groupsMap['CONVOGLIATORI'], // $12
      machinesMap['COM-2022-055'], // $13
      machinesMap['COM-2024-008'], // $14
      machinesMap['COM-2021-112'], // $15
      machinesMap['COM-2024-003'], // $16
      adminId, // $17
      tecnicoId // $18
    ]);

    // =============================================
    // SEED ISSUE COMMENTS
    // =============================================
    console.log('Creating demo comments...');
    const issuesResult = await client.query('SELECT id FROM issues ORDER BY id LIMIT 5');
    if (issuesResult.rows.length > 0) {
      await client.query(`
        INSERT INTO issue_comments (issue_id, user_id, comment) VALUES
          ($1, $6, 'Ho verificato la macchina. La vibrazione sembra provenire dal cuscinetto anteriore del mandrino.'),
          ($1, $7, 'Ordinato cuscinetto sostitutivo. Consegna prevista in 3 giorni lavorativi.'),
          ($2, $6, 'Richiesto supporto remoto al fornitore del controllo numerico.'),
          ($3, $7, 'Guarnizioni sostituite. Test di tenuta superato.'),
          ($3, $6, 'Confermo risoluzione. La macchina è tornata operativa.'),
          ($4, $7, 'Verificato cablaggio. Trovato filo interrotto. Riparato e testato OK.'),
          ($5, $6, 'Pianificato intervento per il prossimo fermo programmato.')
      `, [
        issuesResult.rows[0]?.id,
        issuesResult.rows[1]?.id,
        issuesResult.rows[2]?.id,
        issuesResult.rows[3]?.id,
        issuesResult.rows[4]?.id,
        adminId,
        tecnicoId
      ]);
    }

    await client.query('COMMIT');
    console.log('Database seeding completed successfully!');
    console.log('\n=== Demo Credentials ===');
    console.log('Admin: admin / password123');
    console.log('Tecnico: mario.rossi / password123');
    console.log('Lettura: paolo.neri / password123');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await db.pool.end();
  }
};

// Run if executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedDatabase;
