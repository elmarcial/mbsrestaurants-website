const RESEND_API = 'https://api.resend.com/emails';
const FROM_EMAIL = 'orders@mbsrestaurants.com';
const CC_EMAIL = 'jasonm@mbsandcompany.com';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/api/demo-order') {
      return handleOrder(request, env);
    }
    return new Response('Not Found', { status: 404 });
  },
};

async function handleOrder(request, env) {
  let body;
  try { body = await request.json(); } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { restaurant, restaurantColor, customerName, customerEmail, items, subtotal, tax, deliveryFee, total, lang } = body;

  if (!customerEmail || !customerName || !items?.length) {
    return json({ error: 'Missing required fields' }, 400);
  }

  const orderId = 'DEMO-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  const isES = lang === 'es';

  const html = buildEmail({ restaurant, restaurantColor: restaurantColor || '#C45C26', customerName, orderId, items, subtotal, tax, deliveryFee, total, isES });

  const subject = isES
    ? `Pedido demo confirmado — ${restaurant} · ${orderId}`
    : `Demo order confirmed — ${restaurant} · ${orderId}`;

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${restaurant} via MBS Restaurants <${FROM_EMAIL}>`,
        to: [customerEmail],
        cc: [CC_EMAIL],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return json({ error: 'Email failed' }, 500);
    }

    return json({ success: true, orderId });
  } catch (err) {
    console.error(err);
    return json({ error: 'Server error' }, 500);
  }
}

function buildEmail({ restaurant, restaurantColor, customerName, orderId, items, subtotal, tax, deliveryFee, total, isES }) {
  const t = isES ? {
    greeting: '¡Gracias por explorar el demo!',
    order: 'Número de pedido',
    hi: `Hola, ${customerName}`,
    body: 'Tu pedido de demostración ha sido recibido. Aquí están los detalles:',
    col1: 'Artículo', col2: 'Cant.', col3: 'Precio',
    subtotal: 'Subtotal', delivery: 'Envío', tax: 'Impuesto (6.625%)', total: 'Total',
    dTitle: '⚠️ Este es un pedido de demostración',
    dBody: 'No se preparará ni entregará ningún alimento. Este correo muestra lo que recibirían tus clientes al ordenar desde el sitio web de tu restaurante.',
    dCta: '¿Quieres un sitio así? Contáctanos:',
  } : {
    greeting: 'Thanks for trying the demo!',
    order: 'Order number',
    hi: `Hi ${customerName},`,
    body: 'Your demo order has been placed. Here are the details:',
    col1: 'Item', col2: 'Qty', col3: 'Price',
    subtotal: 'Subtotal', delivery: 'Delivery', tax: 'Tax (6.625%)', total: 'Total',
    dTitle: '⚠️ This is a demo order',
    dBody: 'No food will be prepared or delivered. This email demonstrates what your customers would receive when ordering from your restaurant\'s website.',
    dCta: 'Interested in a site like this? Reach out:',
  };

  const rows = items.map(i => `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid #F2F2F2;color:#1A1A1A;">${i.name}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #F2F2F2;text-align:center;color:#666;">×${i.qty}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #F2F2F2;text-align:right;color:#1A1A1A;">$${(i.price * i.qty).toFixed(2)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html lang="${isES ? 'es' : 'en'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F4F4;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:24px;margin-bottom:24px;">
  <div style="background:${restaurantColor};padding:44px 36px;text-align:center;">
    <h1 style="color:#fff;font-size:28px;font-weight:700;margin:0;letter-spacing:-0.5px;">${restaurant}</h1>
    <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">MBS Restaurants Demo</p>
  </div>
  <div style="padding:36px 36px 0;">
    <p style="font-size:22px;font-weight:700;color:#1A1A1A;margin:0 0 4px;">${t.greeting}</p>
    <p style="font-size:12px;color:#AAAAAA;margin:0 0 28px;letter-spacing:0.05em;text-transform:uppercase;">${t.order}: <strong style="color:#555;">${orderId}</strong></p>
    <p style="font-size:15px;color:#444;margin:0 0 6px;">${t.hi}</p>
    <p style="font-size:15px;color:#666;margin:0 0 28px;line-height:1.6;">${t.body}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead><tr style="background:#F8F8F8;">
        <th style="padding:10px 12px;text-align:left;color:#888;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${t.col1}</th>
        <th style="padding:10px 12px;text-align:center;color:#888;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${t.col2}</th>
        <th style="padding:10px 12px;text-align:right;color:#888;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${t.col3}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:16px;padding-top:12px;">
      <table style="width:100%;font-size:14px;">
        <tr><td style="color:#888;padding:5px 0;">${t.subtotal}</td><td style="text-align:right;color:#1A1A1A;">$${Number(subtotal).toFixed(2)}</td></tr>
        <tr><td style="color:#888;padding:5px 0;">${t.delivery}</td><td style="text-align:right;color:#1A1A1A;">$${Number(deliveryFee).toFixed(2)}</td></tr>
        <tr><td style="color:#888;padding:5px 0;">${t.tax}</td><td style="text-align:right;color:#1A1A1A;">$${Number(tax).toFixed(2)}</td></tr>
        <tr style="border-top:2px solid #F0F0F0;">
          <td style="padding:12px 0 4px;font-weight:700;font-size:17px;color:#1A1A1A;">${t.total}</td>
          <td style="text-align:right;font-weight:700;font-size:17px;color:${restaurantColor};padding:12px 0 4px;">$${Number(total).toFixed(2)}</td>
        </tr>
      </table>
    </div>
  </div>
  <div style="padding:28px 36px 36px;">
    <div style="background:#FDF8F0;border-radius:10px;border-left:4px solid ${restaurantColor};padding:20px 20px 20px 20px;">
      <p style="font-size:14px;font-weight:700;color:#1A1A1A;margin:0 0 8px;">${t.dTitle}</p>
      <p style="font-size:13px;color:#666;margin:0 0 12px;line-height:1.6;">${t.dBody}</p>
      <p style="font-size:13px;color:#666;margin:0;line-height:1.6;">${t.dCta} <a href="mailto:jasonm@mbsandcompany.com" style="color:${restaurantColor};font-weight:600;">jasonm@mbsandcompany.com</a> &nbsp;·&nbsp; <a href="tel:6092874301" style="color:${restaurantColor};font-weight:600;">(609) 287-4301</a></p>
    </div>
  </div>
  <div style="background:#111;padding:20px 36px;text-align:center;">
    <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0;">MBS Restaurants &nbsp;·&nbsp; Part of MBS &amp; Company LLC &nbsp;·&nbsp; mbsrestaurants.com</p>
  </div>
</div>
</body></html>`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
