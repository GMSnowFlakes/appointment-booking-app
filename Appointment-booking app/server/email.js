const { Resend } = require('resend');

// Configure Resend client
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@appointmentbook.com';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

let resend = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

const isDev = !RESEND_API_KEY;

/**
 * Format a time string (HH:MM) to a readable 12-hour format
 */
function formatTime(time) {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Format a date string (YYYY-MM-DD) to a readable format
 */
function formatDate(date) {
  const d = new Date(date + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Build a styled HTML email template
 */
function buildEmailHtml({ title, greeting, body, details, cta, ctaUrl, footer }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; }
    .container { max-width: 480px; margin: 0 auto; padding: 32px 16px; }
    .card { background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .logo { text-align: center; font-size: 28px; margin-bottom: 8px; }
    .title { text-align: center; font-size: 22px; font-weight: 700; color: #1e293b; margin: 0 0 8px; }
    .greeting { font-size: 16px; color: #1e293b; margin: 0 0 16px; }
    .body-text { font-size: 15px; color: #64748b; line-height: 1.6; margin: 0 0 20px; }
    .details { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .details h3 { font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px; }
    .detail-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .detail-row + .detail-row { border-top: 1px solid #e2e8f0; }
    .detail-label { font-size: 14px; color: #64748b; }
    .detail-value { font-size: 14px; font-weight: 600; color: #1e293b; text-align: right; }
    .cta { text-align: center; margin: 24px 0; }
    .cta a { display: inline-block; padding: 12px 32px; background: #6366f1; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: 600; }
    .footer-text { text-align: center; font-size: 12px; color: #94a3b8; margin: 24px 0 0; line-height: 1.5; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">📆</div>
      <h1 class="title">${title}</h1>
      <p class="greeting">${greeting}</p>
      <p class="body-text">${body}</p>
      ${details ? `
      <div class="details">
        <h3>Appointment Details</h3>
        ${details}
      </div>
      ` : ''}
      ${cta ? `
      <div class="cta">
        <a href="${ctaUrl}">${cta}</a>
      </div>
      ` : ''}
      <hr class="divider" />
      <p class="footer-text">
        ${footer || 'AppointmentBook — Your appointment management platform'}<br />
        If you have any questions, please contact us.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Build appointment detail rows
 */
function buildDetailRows(appointment) {
  return `
    <div class="detail-row"><span class="detail-label">Service</span><span class="detail-value">${appointment.service_name}</span></div>
    <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${formatDate(appointment.date)}</span></div>
    <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${formatTime(appointment.time)}</span></div>
    <div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${appointment.service_duration} minutes</span></div>
    <div class="detail-row"><span class="detail-label">Price</span><span class="detail-value">$${parseFloat(appointment.service_price).toFixed(2)}</span></div>
    ${appointment.notes ? `<div class="detail-row"><span class="detail-label">Notes</span><span class="detail-value">${appointment.notes}</span></div>` : ''}
  `;
}

/**
 * Send a booking confirmation email
 */
async function sendBookingConfirmation(user, appointment) {
  const html = buildEmailHtml({
    title: 'Booking Confirmed! 🎉',
    greeting: `Hi ${user.name},`,
    body: 'Your appointment has been successfully booked. Here\'s a summary of your reservation:',
    details: buildDetailRows(appointment),
    cta: 'View My Appointments',
    ctaUrl: `${APP_URL}/appointments`,
    footer: `Booking reference #${appointment.id} · Booked on ${appointment.created_at}`,
  });

  return sendEmail({
    to: user.email,
    subject: `✅ Confirmed: ${appointment.service_name} on ${formatDate(appointment.date)}`,
    html,
  });
}

/**
 * Send a cancellation confirmation email
 */
async function sendCancellationConfirmation(user, appointment) {
  const html = buildEmailHtml({
    title: 'Appointment Cancelled',
    greeting: `Hi ${user.name},`,
    body: 'Your appointment has been successfully cancelled. If this was a mistake, you can book a new appointment at your convenience.',
    details: buildDetailRows(appointment),
    cta: 'Book a New Appointment',
    ctaUrl: `${APP_URL}/services`,
    footer: `Cancelled appointment reference #${appointment.id}`,
  });

  return sendEmail({
    to: user.email,
    subject: `❌ Cancelled: ${appointment.service_name} on ${formatDate(appointment.date)}`,
    html,
  });
}

/**
 * Core send function — uses Resend when configured, logs to console in dev
 */
async function sendEmail({ to, subject, html }) {
  if (isDev) {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║           📧 EMAIL (DEV MODE)               ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║ To:      ${to.padEnd(38)}║`);
    console.log(`║ Subject: ${subject.slice(0, 38).padEnd(38)}║`);
    console.log('╠══════════════════════════════════════════════╣');
    // Print plain text version of HTML
    const plainText = html
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    console.log(`║ ${plainText.slice(0, 76).padEnd(76)} ║`);
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
    return { id: `dev-${Date.now()}`, from: 'dev', to, subject };
  }

  try {
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}: ${subject}`);
    return response;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    throw error;
  }
}

module.exports = {
  sendBookingConfirmation,
  sendCancellationConfirmation,
};
