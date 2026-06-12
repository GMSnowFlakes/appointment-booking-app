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

/**
 * Send a reschedule confirmation email with old vs new date/time
 */
async function sendRescheduleConfirmation(user, oldAppointment, newAppointment) {
  const oldDateStr = formatDate(oldAppointment.date);
  const oldTimeStr = formatTime(oldAppointment.time);
  const newDateStr = formatDate(newAppointment.date);
  const newTimeStr = formatTime(newAppointment.time);

  const html = buildEmailHtml({
    title: '📅 Appointment Rescheduled',
    greeting: `Hi ${user.name},`,
    body: 'Your appointment has been successfully rescheduled. Here are the updated details:',
    details: `
    <div class="detail-row"><span class="detail-label">Service</span><span class="detail-value">${newAppointment.service_name}</span></div>
    <div class="detail-row" style="background: #fef2f2; border-radius: 6px; padding: 6px 0;">
      <span class="detail-label" style="color: #dc2626;">← Previously</span>
      <span class="detail-value" style="color: #dc2626; text-decoration: line-through;">${oldDateStr} at ${oldTimeStr}</span>
    </div>
    <div class="detail-row" style="background: #f0fdf4; border-radius: 6px; padding: 6px 0;">
      <span class="detail-label" style="color: #16a34a;">→ Rescheduled to</span>
      <span class="detail-value" style="color: #16a34a; font-weight: 700;">${newDateStr} at ${newTimeStr}</span>
    </div>
    <div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${newAppointment.service_duration} minutes</span></div>
    <div class="detail-row"><span class="detail-label">Price</span><span class="detail-value">$${parseFloat(newAppointment.service_price).toFixed(2)}</span></div>
    ${newAppointment.notes ? `<div class="detail-row"><span class="detail-label">Notes</span><span class="detail-value">${newAppointment.notes}</span></div>` : ''}
    `,
    cta: 'View My Appointments',
    ctaUrl: `${APP_URL}/appointments`,
    footer: `Appointment reference #${newAppointment.id} · Rescheduled on ${new Date().toISOString().slice(0, 10)}`,
  });

  return sendEmail({
    to: user.email,
    subject: `📅 Rescheduled: ${newAppointment.service_name} moved to ${newDateStr} at ${newTimeStr}`,
    html,
  });
}

/**
 * Send a status change confirmation email (admin marks complete/reopen)
 */
async function sendStatusChangeConfirmation(user, appointment) {
  const statusLabels = {
    confirmed: 'confirmed',
    completed: 'completed ✓',
    cancelled: 'cancelled',
  };

  const label = statusLabels[appointment.status] || appointment.status;
  const isCompleted = appointment.status === 'completed';
  const dateStr = formatDate(appointment.date);
  const timeStr = formatTime(appointment.time);

  const html = buildEmailHtml({
    title: isCompleted ? '✅ Appointment Completed' : '📋 Appointment Status Update',
    greeting: `Hi ${user.name},`,
    body: isCompleted
      ? 'Great news! Your appointment has been marked as completed. We hope you had a wonderful experience!'
      : `Your appointment status has been updated to "${label}" by our team.`,
    details: buildDetailRows(appointment),
    cta: 'View My Appointments',
    ctaUrl: `${APP_URL}/appointments`,
    footer: `Appointment reference #${appointment.id} · Status: ${label} on ${dateStr}`,
  });

  return sendEmail({
    to: user.email,
    subject: isCompleted
      ? `✅ Completed: ${appointment.service_name} on ${dateStr} — thank you!`
      : `📋 Status Update: ${appointment.service_name} — ${label}`,
    html,
  });
}

/**
 * Send a booking notification to all admin users when a customer books
 */
async function sendAdminBookingNotification(admins, customer, appointment) {
  const adminList = Array.isArray(admins) ? admins : [admins];
  if (adminList.length === 0) return { id: null };

  const dateStr = formatDate(appointment.date);
  const timeStr = formatTime(appointment.time);

  const html = buildEmailHtml({
    title: '🆕 New Booking Received',
    greeting: 'Hi Team,',
    body: `A new appointment has been booked by <strong>${customer.name}</strong> (${customer.email}). Here are the details:`,
    details: `
    <div class="detail-row"><span class="detail-label">Customer</span><span class="detail-value">${customer.name}</span></div>
    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${customer.email}</span></div>
    <div class="detail-row"><span class="detail-label">Service</span><span class="detail-value">${appointment.service_name}</span></div>
    <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${dateStr}</span></div>
    <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${timeStr}</span></div>
    <div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${appointment.service_duration} minutes</span></div>
    <div class="detail-row"><span class="detail-label">Price</span><span class="detail-value">$${parseFloat(appointment.service_price).toFixed(2)}</span></div>
    ${appointment.notes ? `<div class="detail-row"><span class="detail-label">Notes</span><span class="detail-value">${appointment.notes}</span></div>` : ''}
    `,
    cta: 'View in Admin Dashboard',
    ctaUrl: `${APP_URL}/admin`,
    footer: `Appointment reference #${appointment.id} · Customer ID: ${customer.id}`,
  });

  // Send to all admins sequentially
  let results = [];
  for (const admin of adminList) {
    try {
      const result = await sendEmail({
        to: admin.email,
        subject: `🆕 New Booking: ${customer.name} — ${appointment.service_name} on ${dateStr} at ${timeStr}`,
        html,
      });
      results.push(result);
    } catch (err) {
      console.error(`Failed to send admin notification to ${admin.email}:`, err.message);
    }
  }
  return results;
}

/**
 * Send a cancellation notification to all admin users when a customer cancels
 */
async function sendAdminCancellationNotification(admins, customer, appointment) {
  const adminList = Array.isArray(admins) ? admins : [admins];
  if (adminList.length === 0) return { id: null };

  const dateStr = formatDate(appointment.date);
  const timeStr = formatTime(appointment.time);

  const html = buildEmailHtml({
    title: '❌ Appointment Cancelled by Customer',
    greeting: 'Hi Team,',
    body: `<strong>${customer.name}</strong> (${customer.email}) has cancelled their appointment. The following slot is now available for rebooking:`,
    details: `
    <div class="detail-row"><span class="detail-label">Customer</span><span class="detail-value">${customer.name}</span></div>
    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${customer.email}</span></div>
    <div class="detail-row"><span class="detail-label">Service</span><span class="detail-value">${appointment.service_name}</span></div>
    <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${dateStr}</span></div>
    <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${timeStr}</span></div>
    <div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${appointment.service_duration} minutes</span></div>
    <div class="detail-row"><span class="detail-label">Price</span><span class="detail-value">$${parseFloat(appointment.service_price).toFixed(2)}</span></div>
    `,
    cta: 'View in Admin Dashboard',
    ctaUrl: `${APP_URL}/admin`,
    footer: `Appointment reference #${appointment.id} · Cancelled on ${new Date().toISOString().slice(0, 10)}`,
  });

  let results = [];
  for (const admin of adminList) {
    try {
      const result = await sendEmail({
        to: admin.email,
        subject: `❌ Cancelled: ${customer.name} — ${appointment.service_name} on ${dateStr} at ${timeStr}`,
        html,
      });
      results.push(result);
    } catch (err) {
      console.error(`Failed to send cancellation notification to ${admin.email}:`, err.message);
    }
  }
  return results;
}

/**
 * Send a reschedule notification to all admin users when a customer reschedules
 */
async function sendAdminRescheduleNotification(admins, customer, oldAppointment, newAppointment) {
  const adminList = Array.isArray(admins) ? admins : [admins];
  if (adminList.length === 0) return { id: null };

  const oldDateStr = formatDate(oldAppointment.date);
  const oldTimeStr = formatTime(oldAppointment.time);
  const newDateStr = formatDate(newAppointment.date);
  const newTimeStr = formatTime(newAppointment.time);

  const html = buildEmailHtml({
    title: '📅 Appointment Rescheduled by Customer',
    greeting: 'Hi Team,',
    body: `<strong>${customer.name}</strong> (${customer.email}) has rescheduled their appointment. Here are the updated details:`,
    details: `
    <div class="detail-row"><span class="detail-label">Customer</span><span class="detail-value">${customer.name}</span></div>
    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${customer.email}</span></div>
    <div class="detail-row"><span class="detail-label">Service</span><span class="detail-value">${newAppointment.service_name}</span></div>
    <div class="detail-row" style="background: #fef2f2; border-radius: 6px; padding: 6px 0;">
      <span class="detail-label" style="color: #dc2626;">← Was</span>
      <span class="detail-value" style="color: #dc2626; text-decoration: line-through;">${oldDateStr} at ${oldTimeStr}</span>
    </div>
    <div class="detail-row" style="background: #f0fdf4; border-radius: 6px; padding: 6px 0;">
      <span class="detail-label" style="color: #16a34a;">→ Now</span>
      <span class="detail-value" style="color: #16a34a; font-weight: 700;">${newDateStr} at ${newTimeStr}</span>
    </div>
    <div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${newAppointment.service_duration} minutes</span></div>
    <div class="detail-row"><span class="detail-label">Price</span><span class="detail-value">$${parseFloat(newAppointment.service_price).toFixed(2)}</span></div>
    `,
    cta: 'View in Admin Dashboard',
    ctaUrl: `${APP_URL}/admin`,
    footer: `Appointment reference #${newAppointment.id} · Customer ID: ${customer.id}`,
  });

  let results = [];
  for (const admin of adminList) {
    try {
      const result = await sendEmail({
        to: admin.email,
        subject: `📅 Rescheduled: ${customer.name} — ${newAppointment.service_name} → ${newDateStr} at ${newTimeStr}`,
        html,
      });
      results.push(result);
    } catch (err) {
      console.error(`Failed to send reschedule notification to ${admin.email}:`, err.message);
    }
  }
  return results;
}

/**
 * Send a reminder email for an upcoming appointment
 */
async function sendReminderEmail(user, appointment) {
  const html = buildEmailHtml({
    title: '⏰ Upcoming Appointment Reminder',
    greeting: `Hi ${user.name},`,
    body: 'This is a friendly reminder about your appointment scheduled for tomorrow. We look forward to seeing you!',
    details: buildDetailRows(appointment),
    cta: 'View My Appointments',
    ctaUrl: `${APP_URL}/appointments`,
    footer: `Appointment reference #${appointment.id} · You received this reminder because you have an appointment scheduled.`,
  });

  return sendEmail({
    to: user.email,
    subject: `⏰ Reminder: ${appointment.service_name} tomorrow at ${formatTime(appointment.time)}`,
    html,
  });
}

module.exports = {
  sendBookingConfirmation,
  sendCancellationConfirmation,
  sendRescheduleConfirmation,
  sendStatusChangeConfirmation,
  sendAdminBookingNotification,
  sendAdminCancellationNotification,
  sendAdminRescheduleNotification,
  sendReminderEmail,
};
