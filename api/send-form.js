const RECIPIENT_EMAIL = process.env.FORM_RECIPIENT_EMAIL || 'booking@puckpromedia.com';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatLabel(key) {
  return String(key)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = (process.env.RESEND_FROM_EMAIL || '').trim();

  if (!apiKey || !fromEmail) {
    console.error('Missing Resend configuration', {
      hasApiKey: Boolean(apiKey),
      hasFromEmail: Boolean(fromEmail),
    });
    return res.status(500).json({ error: 'Email service is not configured.' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (error) {
      console.error('Invalid JSON body', error);
      return res.status(400).json({ error: 'Invalid request body.' });
    }
  }

  const formType = body.formType || 'Website Form';
  const fields = body.fields || {};

  const rows = Object.entries(fields)
    .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
    .map(([key, value]) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;font-weight:700;color:#111;vertical-align:top;width:180px;">${escapeHtml(formatLabel(key))}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;color:#333;white-space:pre-wrap;">${escapeHtml(value)}</td>
      </tr>
    `)
    .join('');

  const subject = `Puck Pro Media ${formatLabel(formType)} Submission`;
  const replyTo = fields.email || fields['email-address'] || fields['your-email'] || undefined;

  const payload = {
    from: fromEmail,
    to: RECIPIENT_EMAIL,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#111;">
        <h1 style="font-size:24px;margin:0 0 8px;">${escapeHtml(subject)}</h1>
        <p style="margin:0 0 24px;color:#555;">A new form was submitted from puckpromedia.com.</p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e5e5;">
          ${rows || '<tr><td style="padding:12px;">No fields submitted.</td></tr>'}
        </table>
      </div>
    `,
  };

  if (replyTo) {
    payload.reply_to = replyTo;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('Resend rejected form email', {
        status: response.status,
        response: responseText,
        from: fromEmail,
        to: RECIPIENT_EMAIL,
        formType,
      });
      return res.status(502).json({ error: 'Email failed to send.' });
    }

    let data = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (_) {}

    return res.status(200).json({ ok: true, id: data.id });
  } catch (error) {
    console.error('Resend request failed before acceptance', error);
    return res.status(502).json({ error: 'Email failed to send.' });
  }
};
