// backend/utils/emailUtils.js
import nodemailer from 'nodemailer';

// Create reusable transporter object using SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

/**
 * Send email notification
 * @param {Object} options - Email options
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Hostel Management'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || subject,
    };

    console.log(`[Email] Attempting to send email to: ${to}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] ✅ Email sent successfully!`);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] ❌ Failed to send email:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send Special Consumption Notification to Admin
 */
export const sendConsumptionNotificationToAdmin = async (data) => {
  const {
    eventName,
    consumptionDate,
    description,
    items,
    totalCost,
    recordedBy,
    hostelName,
    lowStockItems = [],
  } = data;

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || '2312057@nec.edu.in';

  // Format items table for email
  const itemsTableRows = items
    .map(
      (item, index) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; text-align: center; color: #6b7280;">${index + 1}</td>
        <td style="padding: 12px; font-weight: 500; color: #1f2937;">${item.item_name || item.name || 'N/A'}</td>
        <td style="padding: 12px; text-align: center; color: #374151;">${item.quantity_consumed || item.quantity || 0}</td>
        <td style="padding: 12px; text-align: center; color: #6b7280;">${item.unit || 'unit'}</td>
        <td style="padding: 12px; text-align: right; color: #059669; font-weight: 500;">₹${parseFloat(item.cost || 0).toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  // Format low stock warning
  let lowStockWarning = '';
  if (lowStockItems.length > 0) {
    const lowStockList = lowStockItems
      .map(
        (item) => `
        <li style="padding: 8px 0; border-bottom: 1px solid #fecaca;">
          <strong style="color: #dc2626;">${item.name}</strong> - 
          Current: ${item.current_stock} ${item.unit} 
          (Min: ${item.minimum_stock})
        </li>
      `
      )
      .join('');

    lowStockWarning = `
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 12px 0; color: #dc2626;">⚠️ Low Stock Alert</h3>
        <ul style="margin: 0; padding-left: 20px;">${lowStockList}</ul>
      </div>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <body style="font-family: sans-serif; background-color: #f3f4f6; padding: 20px;">
      <div style="max-width: 650px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden;">
        <div style="background: #2563eb; padding: 32px; text-align: center; color: #fff;">
          <h1>🍽️ Extra Consumption Recorded</h1>
        </div>
        <div style="padding: 32px;">
          <div style="background: #f0f9ff; padding: 20px; border-radius: 12px;">
            <p><strong>Event:</strong> ${eventName}</p>
            <p><strong>Date:</strong> ${consumptionDate}</p>
            <p><strong>Hostel:</strong> ${hostelName || 'N/A'}</p>
            <p><strong>By:</strong> ${recordedBy}</p>
          </div>
          <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
            <thead>
               <tr style="background: #f1f5f9;">
                 <th style="padding: 10px;">S.No</th>
                 <th style="padding: 10px; text-align: left;">Item</th>
                 <th style="padding: 10px;">Qty</th>
                 <th style="padding: 10px;">Unit</th>
                 <th style="padding: 10px; text-align: right;">Cost</th>
               </tr>
            </thead>
            <tbody>${itemsTableRows}</tbody>
          </table>
          <h3 style="text-align: right; color: #059669;">Total: ₹${parseFloat(totalCost).toFixed(2)}</h3>
          ${lowStockWarning}
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `🍽️ Extra Consumption Recorded: ${eventName} - ₹${parseFloat(totalCost).toFixed(2)}`,
    html: htmlContent,
  });
};

/**
 * Verify SMTP connection
 */
export const verifyEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('[Email] ✅ SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('[Email] ❌ SMTP connection failed:', error.message);
    return false;
  }
};