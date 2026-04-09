const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT) || 587,
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  return transporter;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Invia email di notifica per un nuovo intervento pianificato.
 * @param {Object} intervention - dati completi con JOIN (macchina, cliente, responsabile)
 * @param {string[]} recipientEmails - lista email destinatari
 */
async function sendInterventionNotification(intervention, recipientEmails) {
  const t = getTransporter();
  if (!t) {
    console.log('[Email] SMTP non configurato, notifica intervento saltata');
    return;
  }

  const emails = [...new Set(recipientEmails.filter(Boolean))];
  if (emails.length === 0) return;

  const appUrl = process.env.APP_URL || '';
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

  const subject = `Nuovo intervento pianificato — ${intervention.customer_name || 'Cliente'} — ${formatDate(intervention.scheduled_date)}`;

  const html = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:20px;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;">

    <!-- Header -->
    <div style="background:#3b82f6;border-radius:8px 8px 0 0;padding:24px 28px;">
      <div style="color:white;">
        <div style="font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;margin-bottom:4px;">
          Gestionale Macchine GIANA
        </div>
        <div style="font-size:22px;font-weight:700;">Nuovo Intervento Pianificato</div>
        <div style="font-size:14px;margin-top:6px;opacity:0.9;">
          Sei stato assegnato a un nuovo intervento. Controlla i dettagli qui sotto.
        </div>
      </div>
    </div>

    <!-- Body -->
    <div style="background:white;padding:28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

      <!-- Sezione Intervento -->
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280;margin-bottom:12px;">
          Dettagli Intervento
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:9px 0;color:#6b7280;font-size:14px;width:150px;">Data pianificata</td>
            <td style="padding:9px 0;color:#111827;font-size:14px;font-weight:600;">${formatDate(intervention.scheduled_date)}</td>
          </tr>
          ${intervention.scheduled_end_date ? `
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:9px 0;color:#6b7280;font-size:14px;">Fine prevista</td>
            <td style="padding:9px 0;color:#111827;font-size:14px;font-weight:600;">${formatDate(intervention.scheduled_end_date)}</td>
          </tr>` : ''}
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:9px 0;color:#6b7280;font-size:14px;">Stato</td>
            <td style="padding:9px 0;">
              <span style="background:#dbeafe;color:#1d4ed8;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;">Programmato</span>
            </td>
          </tr>
          ${intervention.description ? `
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:9px 0;color:#6b7280;font-size:14px;vertical-align:top;">Descrizione</td>
            <td style="padding:9px 0;color:#111827;font-size:14px;">${intervention.description}</td>
          </tr>` : ''}
          ${intervention.problem_description ? `
          <tr>
            <td style="padding:9px 0;color:#6b7280;font-size:14px;vertical-align:top;">Problema</td>
            <td style="padding:9px 0;color:#111827;font-size:14px;">${intervention.problem_description}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- Sezione Macchina -->
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280;margin-bottom:12px;">
          Macchina
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:9px 0;color:#6b7280;font-size:14px;width:150px;">N° Commessa</td>
            <td style="padding:9px 0;color:#111827;font-size:14px;font-weight:600;">${intervention.numero_commessa || '—'}</td>
          </tr>
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:9px 0;color:#6b7280;font-size:14px;">Modello</td>
            <td style="padding:9px 0;color:#111827;font-size:14px;">${[intervention.machine_type, intervention.model_name].filter(Boolean).join(' ') || '—'}</td>
          </tr>
          ${intervention.serial_number ? `
          <tr>
            <td style="padding:9px 0;color:#6b7280;font-size:14px;">N° Seriale</td>
            <td style="padding:9px 0;color:#111827;font-size:14px;">${intervention.serial_number}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- Sezione Cliente -->
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280;margin-bottom:12px;">
          Cliente
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:9px 0;color:#6b7280;font-size:14px;width:150px;">Nome</td>
            <td style="padding:9px 0;color:#111827;font-size:14px;font-weight:600;">${intervention.customer_name || '—'}</td>
          </tr>
          ${intervention.customer_address ? `
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:9px 0;color:#6b7280;font-size:14px;">Indirizzo</td>
            <td style="padding:9px 0;color:#111827;font-size:14px;">${intervention.customer_address}${intervention.customer_city ? ', ' + intervention.customer_city : ''}</td>
          </tr>` : ''}
          ${intervention.customer_phone ? `
          <tr>
            <td style="padding:9px 0;color:#6b7280;font-size:14px;">Telefono</td>
            <td style="padding:9px 0;color:#111827;font-size:14px;">${intervention.customer_phone}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- Sezione Responsabile -->
      ${intervention.assigned_to_name ? `
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280;margin-bottom:12px;">
          Assegnazione
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:9px 0;color:#6b7280;font-size:14px;width:150px;">Responsabile</td>
            <td style="padding:9px 0;color:#111827;font-size:14px;font-weight:600;">${intervention.assigned_to_name}</td>
          </tr>
          ${intervention.created_by_name ? `
          <tr>
            <td style="padding:9px 0;color:#6b7280;font-size:14px;">Pianificato da</td>
            <td style="padding:9px 0;color:#111827;font-size:14px;">${intervention.created_by_name}</td>
          </tr>` : ''}
        </table>
      </div>` : ''}

      ${appUrl ? `
      <div style="text-align:center;padding-top:8px;">
        <a href="${appUrl}/interventions/${intervention.id}"
           style="display:inline-block;background:#3b82f6;color:white;padding:11px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;">
          Apri nel gestionale
        </a>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:14px 28px;text-align:center;color:#9ca3af;font-size:12px;">
      Notifica automatica — Gestionale Macchine GIANA. Non rispondere a questa email.
    </div>

  </div>
</body>
</html>`;

  try {
    await t.sendMail({ from: fromEmail, to: emails.join(', '), subject, html });
    console.log(`[Email] Notifica intervento #${intervention.id} inviata a: ${emails.join(', ')}`);
  } catch (err) {
    console.error('[Email] Errore invio notifica intervento:', err.message);
  }
}

module.exports = { sendInterventionNotification };
