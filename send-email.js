export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const { emails, data_evento, horario, titulo, responsavel, prioridade, descricao, operacao } = req.body || {};
  if (!emails?.length) return res.status(400).json({ ok: false, error: 'Sem e-mails' });

  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  if (!SMTP_USER || !SMTP_PASS) return res.status(500).json({ ok: false, error: 'SMTP não configurado' });

  const priorCor = { 'Crítica': '#DC2626', 'Alta': '#EA580C', 'Média': '#D97706', 'Baixa': '#16A34A' };
  const cor = priorCor[prioridade] || '#4A5A22';
  const op = operacao === 'edicao' ? '✏️ Compromisso Editado' : '📅 Novo Compromisso';

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#F0EDE6;font-family:system-ui,sans-serif;">
<div style="max-width:580px;margin:0 auto;padding:24px 16px;">
  <div style="background:#2C3A1A;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
    <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08);">
      <div style="font-size:9px;letter-spacing:6px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:4px;">IGL • SETOR FINANCEIRO</div>
      <div style="font-size:28px;font-weight:800;color:#E8763A;letter-spacing:-0.5px;">Calendário</div>
    </div>
    <div style="padding:24px 32px;">
      <div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:16px;">${op}</div>
      <div style="background:rgba(255,255,255,0.06);border-radius:14px;border-left:4px solid ${cor};padding:20px 22px;">
        <div style="font-size:11px;font-weight:700;color:${cor};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">
          ${prioridade ? `⚡ ${prioridade}` : '📌 Compromisso'}
        </div>
        <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:12px;line-height:1.2;">${titulo}</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px;">
          <div style="font-size:13px;color:rgba(255,255,255,0.6);">📅 <strong style="color:rgba(255,255,255,0.85);">${data_evento}</strong></div>
          ${horario ? `<div style="font-size:13px;color:rgba(255,255,255,0.6);">🕐 <strong style="color:rgba(255,255,255,0.85);">${horario}</strong></div>` : ''}
        </div>
        ${responsavel ? `<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:8px;">👤 <strong style="color:rgba(255,255,255,0.85);">${responsavel}</strong></div>` : ''}
        ${descricao ? `<div style="font-size:13px;color:rgba(255,255,255,0.55);margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08);line-height:1.5;">📝 ${descricao}</div>` : ''}
      </div>
    </div>
    <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <div style="font-size:11px;color:rgba(255,255,255,0.3);">Enviado automaticamente pelo <strong style="color:#E8763A;">IGL Calendário</strong> • Casa Viveza</div>
    </div>
  </div>
</div></body></html>`;

  // Send via Gmail SMTP using fetch to a simple SMTP relay
  // Using Gmail API via nodemailer-style base64 encoding
  const boundary = `boundary_${Date.now()}`;
  const subject = `${op} — ${titulo} | ${data_evento}`;

  // Build raw email for Gmail API
  const rawEmail = [
    `From: "IGL Calendário" <${SMTP_USER}>`,
    `To: ${emails.join(', ')}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: text/html; charset=UTF-8`,
    '',
    html
  ].join('\r\n');

  const base64Email = Buffer.from(rawEmail).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  // Use Gmail SMTP via nodemailer through a serverless-compatible approach
  // Since we can't use nodemailer directly, use Gmail's REST API with OAuth
  // Instead, use smtp2go or similar - but simplest is direct SMTP via net module

  // Simple SMTP implementation
  const net = await import('net');
  const tls = await import('tls');

  const results = [];
  const errors = [];

  async function sendViaSMTP(to) {
    return new Promise((resolve, reject) => {
      const socket = tls.connect({
        host: 'smtp.gmail.com',
        port: 465,
        rejectUnauthorized: false
      });

      let step = 0;
      let data = '';

      const send = (cmd) => socket.write(cmd + '\r\n');

      socket.on('data', (chunk) => {
        data += chunk.toString();
        if (!data.endsWith('\n')) return;
        const lines = data.trim().split('\n');
        data = '';

        for (const line of lines) {
          const code = parseInt(line.substring(0, 3));
          if (step === 0 && code === 220) { send('EHLO calendario-igl.vercel.app'); step = 1; }
          else if (step === 1 && (code === 250 || code === 235)) {
            if (line.includes('AUTH') || step === 1) {
              send('AUTH LOGIN'); step = 2;
            }
          }
          else if (step === 2 && code === 334) { send(Buffer.from(SMTP_USER).toString('base64')); step = 3; }
          else if (step === 3 && code === 334) { send(Buffer.from(SMTP_PASS).toString('base64')); step = 4; }
          else if (step === 4 && code === 235) { send(`MAIL FROM:<${SMTP_USER}>`); step = 5; }
          else if (step === 5 && code === 250) { send(`RCPT TO:<${to}>`); step = 6; }
          else if (step === 6 && code === 250) { send('DATA'); step = 7; }
          else if (step === 7 && code === 354) {
            send(`From: "IGL Calendário" <${SMTP_USER}>\r\nTo: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}\r\n.`);
            step = 8;
          }
          else if (step === 8 && code === 250) { send('QUIT'); resolve({ ok: true }); socket.destroy(); }
          else if (code >= 400) { reject(new Error(`SMTP Error ${code}: ${line}`)); socket.destroy(); }
        }
      });

      socket.on('error', reject);
      socket.setTimeout(15000, () => { reject(new Error('Timeout')); socket.destroy(); });
    });
  }

  for (const email of emails) {
    try {
      await sendViaSMTP(email);
      results.push({ email, ok: true });
      console.log(`✅ E-mail enviado: ${email}`);
    } catch (e) {
      errors.push({ email, error: e.message });
      console.error(`❌ Erro ${email}:`, e.message);
    }
  }

  return res.status(200).json({ ok: true, sent: results.length, failed: errors.length, errors });
}
