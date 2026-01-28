const fs = require('fs');

/**
 * ClamAV antivirus scanning middleware
 * Scans uploaded files for malware using ClamAV daemon
 */
const scanFile = async (filePath) => {
  const CLAMAV_HOST = process.env.CLAMAV_HOST || 'clamav';
  const CLAMAV_PORT = parseInt(process.env.CLAMAV_PORT) || 3310;

  return new Promise((resolve, reject) => {
    try {
      const net = require('net');
      const client = new net.Socket();

      client.connect(CLAMAV_PORT, CLAMAV_HOST, () => {
        const fileBuffer = fs.readFileSync(filePath);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(fileBuffer.length, 0);

        client.write('zINSTREAM\0');
        client.write(size);
        client.write(fileBuffer);
        // Send zero-length chunk to signal end
        const end = Buffer.alloc(4);
        end.writeUInt32BE(0, 0);
        client.write(end);
      });

      let response = '';
      client.on('data', (data) => {
        response += data.toString();
      });

      client.on('end', () => {
        const isClean = response.includes('OK') && !response.includes('FOUND');
        resolve({
          clean: isClean,
          result: response.trim()
        });
      });

      client.on('error', (err) => {
        // If ClamAV is not available, log warning but allow upload
        console.warn('ClamAV non disponibile:', err.message);
        resolve({ clean: true, result: 'ClamAV non disponibile - scan saltato', skipped: true });
      });

      // Timeout after 30 seconds
      client.setTimeout(30000, () => {
        client.destroy();
        resolve({ clean: true, result: 'ClamAV timeout - scan saltato', skipped: true });
      });
    } catch (error) {
      console.warn('Errore ClamAV:', error.message);
      resolve({ clean: true, result: 'Errore ClamAV - scan saltato', skipped: true });
    }
  });
};

/**
 * Middleware to scan uploaded files
 * Use after multer upload middleware
 */
const antivirusScan = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (files.length === 0) {
      return next();
    }

    for (const file of files) {
      const result = await scanFile(file.path);

      if (!result.clean) {
        // Delete infected file
        try { fs.unlinkSync(file.path); } catch(e) {}

        console.error(`File infetto rilevato: ${file.originalname} - ${result.result}`);

        return res.status(400).json({
          error: 'File non sicuro',
          message: `Il file "${file.originalname}" è stato rilevato come potenzialmente pericoloso e non può essere caricato.`
        });
      }

      if (result.skipped) {
        console.warn(`Scansione antivirus saltata per ${file.originalname}: ${result.result}`);
      }
    }

    next();
  } catch (error) {
    console.error('Errore scansione antivirus:', error);
    // Don't block uploads if antivirus fails
    next();
  }
};

module.exports = { antivirusScan, scanFile };
