const { spawn } = require('child_process');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const os = require('os');
const cron = require('node-cron');
const { logger } = require('../config/logger');

const BACKUP_DIR = process.env.BACKUP_DIR || '/app/backups';
const UPLOADS_DIR = process.env.UPLOAD_DIR || '/app/uploads';
const SETTINGS_FILE = path.join(BACKUP_DIR, 'settings.json');

// Assicura che la directory backup esista
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// ─── Helpers DB ──────────────────────────────────────────────────────────────

function getDbEnv() {
  return {
    ...process.env,
    PGPASSWORD: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || '',
  };
}

function getDbParams() {
  return {
    host: process.env.DB_HOST || 'db',
    port: String(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    name: process.env.DB_NAME || 'cnc_maintenance',
  };
}

// Esegue un comando esterno e ritorna { stdout, stderr }
function runCommand(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { env });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${cmd} uscito con codice ${code}\n${stderr}`));
      }
    });
    proc.on('error', reject);
  });
}

// ─── Impostazioni ─────────────────────────────────────────────────────────────

function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch (e) {
    logger.error('Errore lettura impostazioni backup:', e);
  }
  return {
    enabled: false,
    frequency: 'daily',
    time: '02:00',
    keep_last: 10,
    day_of_week: 1,
    day_of_month: 1,
  };
}

function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function cleanOldBackups(keepLast) {
  try {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('backup_') && f.endsWith('.zip'))
      .map((f) => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > keepLast) {
      files.slice(keepLast).forEach(({ name }) => {
        fs.unlinkSync(path.join(BACKUP_DIR, name));
        logger.info(`Backup vecchio eliminato: ${name}`);
      });
    }
  } catch (e) {
    logger.error('Errore pulizia backup vecchi:', e);
  }
}

// ─── Creazione backup con pg_dump ─────────────────────────────────────────────

async function createBackupFile() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-backup-'));

  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const filename = `backup_${timestamp}.zip`;
    const filepath = path.join(BACKUP_DIR, filename);
    const dumpFile = path.join(tmpDir, 'database.sql');

    const db = getDbParams();
    const env = getDbEnv();

    // Esegui pg_dump: dump SQL completo con DROP + CREATE + INSERT
    await runCommand('pg_dump', [
      '-h', db.host,
      '-p', db.port,
      '-U', db.user,
      '--clean',          // include DROP TABLE prima di CREATE TABLE
      '--if-exists',      // DROP IF EXISTS (sicuro su DB vuoto)
      '--no-owner',       // non include comandi OWNER (portabilità)
      '--no-acl',         // non include GRANT/REVOKE
      '--format=plain',   // SQL leggibile, restore con psql
      '-f', dumpFile,
      db.name,
    ], env);

    // Crea il file ZIP
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(filepath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        const stats = fs.statSync(filepath);
        resolve({ filename, filepath, size: stats.size });
      });

      archive.on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });

      archive.pipe(output);

      // Metadati backup
      archive.append(
        JSON.stringify({ created_at: new Date().toISOString(), version: '2.0', tool: 'pg_dump' }, null, 2),
        { name: 'backup_info.json' }
      );

      // Dump SQL del database
      archive.file(dumpFile, { name: 'database.sql' });

      // File uploads
      if (fs.existsSync(UPLOADS_DIR)) {
        archive.directory(UPLOADS_DIR, 'uploads');
      }

      archive.finalize();
    });
  } finally {
    fs.rm(tmpDir, { recursive: true, force: true }, () => {});
  }
}

// ─── Scheduler auto-backup ────────────────────────────────────────────────────

let cronJob = null;

function buildCronExpression(settings) {
  const [hour, minute] = settings.time.split(':');
  if (settings.frequency === 'daily')   return `${minute} ${hour} * * *`;
  if (settings.frequency === 'weekly')  return `${minute} ${hour} * * ${settings.day_of_week}`;
  if (settings.frequency === 'monthly') return `${minute} ${hour} ${settings.day_of_month} * *`;
  return `${minute} ${hour} * * *`;
}

function scheduleCronJob(settings) {
  if (cronJob) { cronJob.stop(); cronJob = null; }
  if (!settings.enabled) return;

  const expr = buildCronExpression(settings);
  cronJob = cron.schedule(expr, async () => {
    logger.info('Avvio backup automatico...');
    try {
      const { filename, size } = await createBackupFile();
      logger.info(`Backup automatico completato: ${filename} (${size} bytes)`);
      cleanOldBackups(settings.keep_last || 10);
    } catch (e) {
      logger.error('Errore backup automatico:', e);
    }
  });

  logger.info(`Backup automatico schedulato: ${expr}`);
}

function initBackupScheduler() {
  const settings = getSettings();
  scheduleCronJob(settings);
}

// ─── Controllers ──────────────────────────────────────────────────────────────

async function createBackup(req, res) {
  try {
    const { filename, size } = await createBackupFile();
    const settings = getSettings();
    cleanOldBackups(settings.keep_last || 10);
    res.json({ success: true, filename, size });
  } catch (e) {
    logger.error('Errore creazione backup:', e);
    res.status(500).json({ error: `Errore durante la creazione del backup: ${e.message}` });
  }
}

async function listBackups(req, res) {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return res.json([]);
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('backup_') && f.endsWith('.zip'))
      .map((f) => {
        const stats = fs.statSync(path.join(BACKUP_DIR, f));
        return { filename: f, size: stats.size, created_at: stats.mtime.toISOString() };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(files);
  } catch (e) {
    logger.error('Errore lista backup:', e);
    res.status(500).json({ error: 'Errore recupero lista backup' });
  }
}

async function downloadBackup(req, res) {
  try {
    const filename = path.basename(req.params.filename);
    if (!filename.startsWith('backup_') || !filename.endsWith('.zip')) {
      return res.status(400).json({ error: 'File non valido' });
    }
    const filepath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Backup non trovato' });
    }
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(filepath).pipe(res);
  } catch (e) {
    logger.error('Errore download backup:', e);
    res.status(500).json({ error: 'Errore durante il download' });
  }
}

async function deleteBackup(req, res) {
  try {
    const filename = path.basename(req.params.filename);
    if (!filename.startsWith('backup_') || !filename.endsWith('.zip')) {
      return res.status(400).json({ error: 'File non valido' });
    }
    const filepath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Backup non trovato' });
    }
    fs.unlinkSync(filepath);
    res.json({ success: true });
  } catch (e) {
    logger.error('Errore eliminazione backup:', e);
    res.status(500).json({ error: "Errore durante l'eliminazione" });
  }
}

async function getBackupSettings(req, res) {
  try {
    res.json(getSettings());
  } catch (e) {
    res.status(500).json({ error: 'Errore recupero impostazioni' });
  }
}

async function updateBackupSettings(req, res) {
  try {
    const { enabled, frequency, time, keep_last, day_of_week, day_of_month } = req.body;
    const settings = {
      enabled: Boolean(enabled),
      frequency: ['daily', 'weekly', 'monthly'].includes(frequency) ? frequency : 'daily',
      time: /^\d{2}:\d{2}$/.test(time) ? time : '02:00',
      keep_last: Math.min(Math.max(parseInt(keep_last) || 10, 1), 50),
      day_of_week: Math.min(Math.max(parseInt(day_of_week) || 1, 0), 6),
      day_of_month: Math.min(Math.max(parseInt(day_of_month) || 1, 1), 28),
    };
    saveSettings(settings);
    scheduleCronJob(settings);
    res.json({ success: true, settings });
  } catch (e) {
    logger.error('Errore salvataggio impostazioni backup:', e);
    res.status(500).json({ error: 'Errore salvataggio impostazioni' });
  }
}

// ─── Restore con psql ─────────────────────────────────────────────────────────

async function restoreBackup(req, res) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-restore-'));

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file ZIP caricato' });
    }

    // Estrai il file ZIP
    let zip;
    try {
      zip = new AdmZip(req.file.path);
    } catch (e) {
      return res.status(400).json({ error: 'File ZIP non valido o corrotto' });
    }

    zip.extractAllTo(tmpDir, true);

    // Verifica che sia un backup valido
    const infoPath = path.join(tmpDir, 'backup_info.json');
    const dumpPath = path.join(tmpDir, 'database.sql');

    if (!fs.existsSync(infoPath)) {
      return res.status(400).json({ error: 'File non è un backup valido (backup_info.json mancante)' });
    }
    if (!fs.existsSync(dumpPath)) {
      return res.status(400).json({ error: 'File non è un backup valido (database.sql mancante)' });
    }

    const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
    const log = [];

    const db = getDbParams();
    const env = getDbEnv();

    // Esegui psql per ripristinare il database
    // pg_dump --clean ha già generato i DROP TABLE IF EXISTS, quindi psql
    // svuota tutto e reinserisce i dati in modo atomico
    const { stderr } = await runCommand('psql', [
      '-h', db.host,
      '-p', db.port,
      '-U', db.user,
      '-d', db.name,
      '-f', dumpPath,
      '--set=ON_ERROR_STOP=off', // continua anche su warning minori
    ], env);

    // Filtra i warning non critici (pg_dump li genera sempre su DROP di oggetti inesistenti)
    const warnings = stderr
      .split('\n')
      .filter((l) => l.trim() && !l.includes('does not exist') && !l.includes('ERROR:  relation'))
      .join('\n');

    if (warnings) logger.warn('psql restore warnings:', warnings);
    log.push('✓ Database ripristinato con pg_dump/psql');
    log.push(`  Backup del: ${new Date(info.created_at).toLocaleString('it-IT')}`);

    // Ripristina i file uploads
    const uploadsBackupDir = path.join(tmpDir, 'uploads');
    if (fs.existsSync(uploadsBackupDir)) {
      // Svuota solo il contenuto (non la directory — è un volume Docker)
      for (const entry of fs.readdirSync(UPLOADS_DIR)) {
        fs.rmSync(path.join(UPLOADS_DIR, entry), { recursive: true, force: true });
      }
      copyDirRecursive(uploadsBackupDir, UPLOADS_DIR);
      log.push('✓ File allegati ripristinati');
    } else {
      log.push('- Nessun file allegato nel backup');
    }

    res.json({ success: true, log, backup_date: info.created_at });
  } catch (e) {
    logger.error('Errore restore backup:', e);
    res.status(500).json({ error: `Errore durante il ripristino: ${e.message}` });
  } finally {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    fs.rm(tmpDir, { recursive: true, force: true }, () => {});
  }
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = {
  createBackup,
  listBackups,
  downloadBackup,
  deleteBackup,
  getBackupSettings,
  updateBackupSettings,
  initBackupScheduler,
  restoreBackup,
};
