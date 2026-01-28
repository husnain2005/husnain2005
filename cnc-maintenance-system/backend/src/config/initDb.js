/**
 * Database Initialization Script
 * Creates all tables, indexes, and constraints for CNC Maintenance System
 */
const db = require('./database');

const initializeDatabase = async () => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // =============================================
    // ENUM TYPES
    // =============================================
    console.log('Creating enum types...');

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('admin', 'tecnico', 'lettura');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE machine_type AS ENUM ('TORNIO', 'FORATRICE', 'PICO');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE tornio_category AS ENUM ('TRADIZIONALE', 'VERTICALE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE axis_type AS ENUM ('SINGOLA_XZ', 'DOPPIA_XZ');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE control_type AS ENUM ('FANUC', 'SINUMERIK_ONE', 'CSE', 'FAGOR');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE issue_type AS ENUM ('ELETTRICO', 'MECCANICO');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE issue_status AS ENUM ('aperta', 'in_lavorazione', 'risolta', 'chiusa');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE issue_priority AS ENUM ('bassa', 'media', 'alta', 'critica');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // =============================================
    // USERS TABLE
    // =============================================
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(200),
        role user_role DEFAULT 'tecnico',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        mfa_secret VARCHAR(255),
        mfa_enabled BOOLEAN DEFAULT false,
        mfa_backup_codes TEXT[],
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // =============================================
    // CUSTOMERS TABLE
    // =============================================
    console.log('Creating customers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        province VARCHAR(50),
        country VARCHAR(100) DEFAULT 'Italia',
        postal_code VARCHAR(20),
        phone VARCHAR(50),
        email VARCHAR(255),
        vat_number VARCHAR(50),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
      );
    `);

    // =============================================
    // MACHINE MODELS TABLE
    // =============================================
    console.log('Creating machine_models table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS machine_models (
        id SERIAL PRIMARY KEY,
        machine_type machine_type NOT NULL,
        category tornio_category,
        model_name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(machine_type, category, model_name)
      );
    `);

    // =============================================
    // MACHINE SIZES TABLE
    // =============================================
    console.log('Creating machine_sizes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS machine_sizes (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES machine_models(id) ON DELETE CASCADE,
        size_value INTEGER NOT NULL,
        description VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        UNIQUE(model_id, size_value)
      );
    `);

    // =============================================
    // MACHINES TABLE
    // =============================================
    console.log('Creating machines table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS machines (
        id SERIAL PRIMARY KEY,
        numero_commessa VARCHAR(100) UNIQUE NOT NULL,
        model_id INTEGER REFERENCES machine_models(id),
        size_id INTEGER REFERENCES machine_sizes(id),
        customer_id INTEGER REFERENCES customers(id),
        axis_type axis_type,
        control_type control_type,
        serial_number VARCHAR(100),
        manufacturing_year INTEGER,
        installation_date DATE,
        warranty_expiry DATE,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        address TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
      );
    `);

    // =============================================
    // ISSUE GROUPS TABLE
    // =============================================
    console.log('Creating issue_groups table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS issue_groups (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // =============================================
    // ISSUES TABLE
    // =============================================
    console.log('Creating issues table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS issues (
        id SERIAL PRIMARY KEY,
        machine_id INTEGER REFERENCES machines(id),
        numero_commessa VARCHAR(100),
        machine_type_fallback machine_type,
        model_fallback VARCHAR(100),
        customer_fallback VARCHAR(255),
        issue_group_id INTEGER REFERENCES issue_groups(id),
        issue_type issue_type NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        status issue_status DEFAULT 'aperta',
        priority issue_priority DEFAULT 'media',
        resolution_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP WITH TIME ZONE,
        created_by INTEGER REFERENCES users(id),
        assigned_to INTEGER REFERENCES users(id),
        CONSTRAINT chk_machine_or_fallback CHECK (
          machine_id IS NOT NULL OR
          numero_commessa IS NOT NULL OR
          machine_type_fallback IS NOT NULL OR
          customer_fallback IS NOT NULL
        )
      );
    `);

    // =============================================
    // ISSUE COMMENTS TABLE
    // =============================================
    console.log('Creating issue_comments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS issue_comments (
        id SERIAL PRIMARY KEY,
        issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        comment TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // =============================================
    // ATTACHMENTS TABLE
    // =============================================
    console.log('Creating attachments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        thumbnail_path TEXT,
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // =============================================
    // PDF IMPORTS TABLE
    // =============================================
    console.log('Creating pdf_imports table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdf_imports (
        id SERIAL PRIMARY KEY,
        original_filename VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        extracted_data JSONB,
        processed_at TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        created_issues INTEGER[],
        uploaded_by INTEGER REFERENCES users(id),
        reviewed_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // =============================================
    // AUDIT LOG TABLE
    // =============================================
    console.log('Creating audit_log table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        table_name VARCHAR(100) NOT NULL,
        record_id INTEGER,
        action audit_action NOT NULL,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // =============================================
    // INDEXES
    // =============================================
    console.log('Creating indexes...');

    // Primary search indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_machines_numero_commessa ON machines(numero_commessa);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_machines_customer ON machines(customer_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_machines_model ON machines(model_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_machines_location ON machines(latitude, longitude);');

    await client.query('CREATE INDEX IF NOT EXISTS idx_issues_machine ON issues(machine_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_issues_numero_commessa ON issues(numero_commessa);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at DESC);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_issues_customer_fallback ON issues(customer_fallback);');

    await client.query('CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);');

    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_log(table_name);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);');

    await client.query('CREATE INDEX IF NOT EXISTS idx_attachments_issue ON attachments(issue_id);');

    // =============================================
    // INSERT DEFAULT DATA
    // =============================================
    console.log('Inserting default data...');

    // Default Issue Groups
    await client.query(`
      INSERT INTO issue_groups (code, name, display_order) VALUES
        ('TESTA_PORTA_PEZZO', 'Testa Porta Pezzo', 1),
        ('CONTROPUNTA', 'Contropunta', 2),
        ('CARRO', 'Carro', 3),
        ('CONVOGLIATORI', 'Convogliatori', 4),
        ('PULSANTIERA_CN', 'Pulsantiera CN', 5),
        ('LUNETTE', 'Lunette', 6),
        ('MANDRINO', 'Mandrino', 7),
        ('SISTEMA_IDRAULICO', 'Sistema Idraulico', 8),
        ('SISTEMA_LUBRIFICAZIONE', 'Sistema Lubrificazione', 9),
        ('ELETTRONICA', 'Elettronica', 10),
        ('ALTRO', 'Altro', 99)
      ON CONFLICT (code) DO NOTHING;
    `);

    // Default Machine Models - TORNI TRADIZIONALI
    await client.query(`
      INSERT INTO machine_models (machine_type, category, model_name, description) VALUES
        ('TORNIO', 'TRADIZIONALE', 'GGL', 'Tornio tradizionale modello GGL'),
        ('TORNIO', 'TRADIZIONALE', 'GGTRONIC', 'Tornio tradizionale modello GGTRONIC'),
        ('TORNIO', 'VERTICALE', 'TORNIO_VERTICALE', 'Tornio verticale con caratteristiche GGTRONIC'),
        ('FORATRICE', NULL, 'GGB', 'Foratrice modello GGB'),
        ('PICO', NULL, 'PICO', 'Macchina PICO')
      ON CONFLICT (machine_type, category, model_name) DO NOTHING;
    `);

    // Get model IDs for size insertion
    const ggtronicResult = await client.query(
      "SELECT id FROM machine_models WHERE model_name = 'GGTRONIC'"
    );
    const verticaleResult = await client.query(
      "SELECT id FROM machine_models WHERE model_name = 'TORNIO_VERTICALE'"
    );
    const ggbResult = await client.query(
      "SELECT id FROM machine_models WHERE model_name = 'GGB'"
    );
    const picoResult = await client.query(
      "SELECT id FROM machine_models WHERE model_name = 'PICO'"
    );
    const gglResult = await client.query(
      "SELECT id FROM machine_models WHERE model_name = 'GGL'"
    );

    // Insert sizes for GGTRONIC
    if (ggtronicResult.rows.length > 0) {
      const ggtronicId = ggtronicResult.rows[0].id;
      await client.query(`
        INSERT INTO machine_sizes (model_id, size_value) VALUES
          ($1, 1000), ($1, 1800), ($1, 2000), ($1, 2500), ($1, 3000), ($1, 4000), ($1, 5000)
        ON CONFLICT (model_id, size_value) DO NOTHING;
      `, [ggtronicId]);
    }

    // Insert sizes for TORNIO_VERTICALE (same as GGTRONIC)
    if (verticaleResult.rows.length > 0) {
      const verticaleId = verticaleResult.rows[0].id;
      await client.query(`
        INSERT INTO machine_sizes (model_id, size_value) VALUES
          ($1, 1000), ($1, 1800), ($1, 2000), ($1, 2500), ($1, 3000), ($1, 4000), ($1, 5000)
        ON CONFLICT (model_id, size_value) DO NOTHING;
      `, [verticaleId]);
    }

    // Insert sizes for GGB
    if (ggbResult.rows.length > 0) {
      const ggbId = ggbResult.rows[0].id;
      await client.query(`
        INSERT INTO machine_sizes (model_id, size_value) VALUES
          ($1, 1000), ($1, 1500), ($1, 2000), ($1, 2500), ($1, 3000)
        ON CONFLICT (model_id, size_value) DO NOTHING;
      `, [ggbId]);
    }

    // Insert sizes for PICO
    if (picoResult.rows.length > 0) {
      const picoId = picoResult.rows[0].id;
      await client.query(`
        INSERT INTO machine_sizes (model_id, size_value) VALUES
          ($1, 500), ($1, 750), ($1, 1000)
        ON CONFLICT (model_id, size_value) DO NOTHING;
      `, [picoId]);
    }

    // Insert sizes for GGL
    if (gglResult.rows.length > 0) {
      const gglId = gglResult.rows[0].id;
      await client.query(`
        INSERT INTO machine_sizes (model_id, size_value) VALUES
          ($1, 800), ($1, 1000), ($1, 1500), ($1, 2000)
        ON CONFLICT (model_id, size_value) DO NOTHING;
      `, [gglId]);
    }

    await client.query('COMMIT');
    console.log('Database initialization completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
    await db.pool.end();
  }
};

// Run if executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = initializeDatabase;
