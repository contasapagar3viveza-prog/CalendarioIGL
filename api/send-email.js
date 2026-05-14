const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });

  const { emails, data_evento, horario, titulo, responsavel, descricao } = req.body;

  if (!emails || !emails.length) {
    return res.status(400).json({ ok: false, error: 'Nenhum e-mail informado' });
  }

  // Build HTML email
  const respRow = responsavel ? `<div style="font-size:13px;color:#5C6B2E;margin-bottom:4px;">👤 Responsável: ${responsavel}</div>` : '';
  const descRow = descricao   ? `<div style="font-size:13px;color:#555;margin-top:4px;">📝 ${descricao}</div>` : '';

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#F5F0E8;border-radius:16px;overflow:hidden;">
    <div style="background:#3E4A1C;padding:24px 28px;text-align:center;">
      <div style="font-size:10px;letter-spacing:5px;color:#F5C4A2;font-weight:700;text-transform:uppercase;">IGL</div>
      <div style="font-family:Georgia,serif;font-size:26px;font-weight:900;color:#E8763A;margin:4px 0;">Calendário</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.6);">Setor Financeiro • Casa Viveza</div>
    </div>
    <div style="background:#D4581A;padding:12px 28px;text-align:center;">
      <span style="color:white;font-weight:700;font-size:15px;">📅 Compromisso — ${data_evento}</span>
    </div>
    <div style="padding:24px 28px;">
      <div style="background:white;border-radius:12px;padding:20px;border-left:5px solid #D4581A;">
        <div style="font-size:12px;color:#D4581A;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">🕐 ${horario || '—'}</div>
        <div style="font-size:20px;font-weight:700;color:#3E4A1C;margin-bottom:8px;">${titulo}</div>
        ${respRow}
        ${descRow}
      </div>
    </div>
    <div style="background:#3E4A1C;padding:14px 28px;text-align:center;">
      <div style="font-size:11px;color:rgba(255,255,255,0.5);">Enviado automaticamente pelo <strong style="color:#E8763A;">IGL Calendário</strong></div>
    </div>
  </div>`;

  // Nodemailer transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false }
  });

  const results = [];
  const errors  = [];

  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: `"IGL Calendário" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `📅 IGL • ${titulo} — ${data_evento}`,
        html,
      });
      results.push({ email, ok: true });
      console.log(`✅ E-mail enviado para: ${email}`);
    } catch (e) {
      errors.push({ email, error: e.message });
      console.error(`❌ Erro ao enviar para ${email}:`, e.message);
    }
  }

  return res.status(200).json({ ok: true, sent: results.length, errors });
}
