import Dexie from 'dexie';

const db = new Dexie('CNCMaintenanceDB');

db.version(1).stores({
  // Core data tables - indexed fields for efficient querying
  machines: 'id, numero_commessa, machine_type, customer_id',
  issues: 'id, machine_id, numero_commessa, status, priority, issue_type',
  customers: 'id, code, name, city',

  // Queue for offline write operations
  // ++id = auto-increment primary key
  pendingActions: '++id, type, endpoint, method, data, created_at',

  // Metadata for sync tracking
  // key = primary key (e.g., 'machines_lastSync', 'issues_lastSync')
  syncMeta: 'key'
});

export default db;
