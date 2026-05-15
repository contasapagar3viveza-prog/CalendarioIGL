export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const { emails, data_evento, horario, titulo, responsavel, descricao } = req.body || {};
  if (!emails?.length) return res.status(400).json({ ok: false, error: 'Sem e-mails' });

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return res.status(500).json({ ok: false, error: 'RESEND_API_KEY não configurada' });

  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#F5F0E8;border-radius:16px;overflow:hidden;"><div style="background:#3E4A1C;padding:24px 28px;text-align:center;"><div style="font-size:10px;letter-spacing:5px;color:#F5C4A2;font-weight:700;">IGL</div><div style="font-size:26px;font-weight:900;color:#E8763A;font-family:Georgia,serif;">Calendário</div><div style="font-size:12px;color:rgba(255,255,255,.6);">Setor Financeiro • Casa Viveza</div></div><div style="background:#D4581A;padding:12px 28px;text-align:center;"><span style="color:white;font-weight:700;font-size:15px;">📅 ${data_evento}</span></div><div style="padding:24px 28px;"><div style="background:white;border-radius:12px;padding:20px;border-left:5px solid #D4581A;"><div style="font-size:12px;color:#D4581A;font-weight:700;margin-bottom:8px;">🕐 ${horario||'—'}</div><div style="font-size:20px;font-weight:700;color:#3E4A1C;margin-bottom:8px;">${titulo}</div>${responsavel?`<div style="font-size:13px;color:#5C6B2E;margin-bottom:4px;">👤 ${responsavel}</div>`:''} ${descricao?`<div style="font-size:13px;color:#555;">📝 ${descricao}</div>`:''}</div></div><div style="background:#3E4A1C;padding:14px 28px;text-align:center;"><div style="font-size:11px;color:rgba(255,255,255,.5);">Enviado automaticamente pelo <strong style="color:#E8763A;">IGL Calendário</strong></div></div></div>`;

  const results = [], errors = [];

  for (const email of emails) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'IGL Calendário <onboarding@resend.dev>',
          to: [email],
          subject: `📅 IGL • ${titulo} — ${data_evento}`,
          html
        })
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.message || 'Erro Resend');
      results.push({ email, id: json.id });
    } catch(e) {
      errors.push({ email, error: e.message });
    }
  }

  return res.status(200).json({ ok: true, sent: results.length, failed: errors.length, errors });
}
