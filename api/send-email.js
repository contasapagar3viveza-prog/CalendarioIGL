export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const { emails, data_evento, horario, titulo, responsavel, prioridade, descricao } = req.body || {};
  if (!emails?.length) return res.status(400).json({ ok: false, error: 'Sem e-mails' });

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS?.replace(/\s/g, '');

  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#F5F0E8;border-radius:16px;overflow:hidden;"><div style="background:#2C3A1A;padding:24px 28px;text-align:center;"><div style="font-size:10px;letter-spacing:5px;color:#F5C4A2;font-weight:700;">IGL</div><div style="font-size:26px;font-weight:900;color:#E8763A;font-family:Georgia,serif;">Calendário</div><div style="font-size:11px;color:rgba(255,255,255,.5);">Setor Financeiro • Casa Viveza</div></div><div style="background:#C8521A;padding:12px 28px;text-align:center;"><span style="color:#fff;font-weight:700;font-size:15px;">📅 ${data_evento}</span></div><div style="padding:24px 28px;"><div style="background:#fff;border-radius:12px;padding:20px;border-left:5px solid #C8521A;"><div style="font-size:12px;color:#C8521A;font-weight:700;margin-bottom:8px;">🕐 ${horario||'—'}${prioridade?' · ⚡ '+prioridade:''}</div><div style="font-size:20px;font-weight:700;color:#2C3A1A;margin-bottom:8px;">${titulo}</div>${responsavel?`<div style="font-size:13px;color:#4A5A22;margin-bottom:6px;">👤 ${responsavel}</div>`:''}${descricao?`<div style="font-size:13px;color:#555;">📝 ${descricao}</div>`:''}</div></div><div style="background:#2C3A1A;padding:14px 28px;text-align:center;"><div style="font-size:11px;color:rgba(255,255,255,.4);">Enviado pelo <strong style="color:#E8763A;">IGL Calendário</strong></div></div></div>`;

  const subject = `📅 IGL • ${titulo} — ${data_evento}${prioridade?' ['+prioridade+']':''}`;

  // Use nodemailer via dynamic import (available in Vercel Node runtime)
  const nodemailer = (await import('nodemailer')).default;

  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: { user, pass }
  });

  const results = [], errors = [];
  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: `"IGL Calendário" <${user}>`,
        to: email, subject, html
      });
      results.push({ email, ok: true });
    } catch(e) {
      errors.push({ email, error: e.message });
      console.error('Email error:', email, e.message);
    }
  }

  return res.status(200).json({ ok: true, sent: results.length, failed: errors.length, errors });
}
