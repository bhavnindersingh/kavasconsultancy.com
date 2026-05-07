import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { name, email, business, message } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL ?? 'hello@kavasconsultancy.com';

  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — logging inquiry to console');
    console.log({ name, email, business, message });
    return NextResponse.json({ ok: true });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Kavas Website <noreply@kavasconsultancy.com>',
      to: [toEmail],
      reply_to: email,
      subject: `New inquiry from ${name}${business ? ` — ${business}` : ''}`,
      text: `Name: ${name}\nEmail: ${email}\nBusiness: ${business || 'Not provided'}\n\n${message}`,
    }),
  });

  if (!res.ok) {
    console.error('Resend error', await res.text());
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
