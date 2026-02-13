// backend/utils/emailUtils.js
const nodemailer = require('nodemailer');

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
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content of email
 * @param {string} [options.text] - Plain text content (optional)
 * @returns {Promise<Object>} - Nodemailer send result
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Hostel Management'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || subject, // Fallback to subject if no plain text provided
    };

    console.log(`[Email] Attempting to send email to: ${to}`);
    console.log(`[Email] Subject: ${subject}`);

    const info = await transporter.sendMail(mailOptions);

    console.log(`[Email] ✅ Email sent successfully!`);
    console.log(`[Email] Message ID: ${info.messageId}`);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] ❌ Failed to send email:`, error.message);
    console.error(`[Email] Error details:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Send Special Consumption Notification to Admin
 * @param {Object} data - Consumption data
 * @param {string} data.eventName - Name of the consumption event
 * @param {string} data.consumptionDate - Date of consumption
 * @param {string} data.description - Event description/notes
 * @param {Array} data.items - Array of consumed items
 * @param {number} data.totalCost - Total cost of consumption
 * @param {string} data.recordedBy - Username of the mess staff who recorded
 * @param {string} data.hostelName - Name of the hostel
 * @param {Array} data.lowStockItems - Items that are low on stock
 * @returns {Promise<Object>} - Email send result
 */
const sendConsumptionNotificationToAdmin = async (data) => {
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

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'siddiqabubacker148@gmail.com';

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

  // Format low stock warning if any
  let lowStockWarning = '';
  if (lowStockItems.length > 0) {
    const lowStockList = lowStockItems
      .map(
        (item) => `
        <li style="padding: 8px 0; border-bottom: 1px solid #fecaca;">
          <strong style="color: #dc2626;">${item.name}</strong> - 
          Current: ${item.current_stock} ${item.unit} 
          (Minimum: ${item.minimum_stock} ${item.unit})
        </li>
      `
      )
      .join('');

    lowStockWarning = `
      <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-left: 4px solid #dc2626; padding: 20px; margin: 24px 0; border-radius: 0 12px 12px 0;">
        <h3 style="margin: 0 0 12px 0; color: #dc2626; font-size: 16px; display: flex; align-items: center;">
          ⚠️ Low Stock Alert
        </h3>
        <p style="margin: 0 0 12px 0; color: #7f1d1d; font-size: 14px;">
          The following items are running low on stock after this consumption:
        </p>
        <ul style="margin: 0; padding-left: 20px; color: #991b1b;">
          ${lowStockList}
        </ul>
      </div>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Special Consumption Recorded</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 650px; margin: 0 auto; padding: 20px;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
            🍽️ Special Consumption Recorded
          </h1>
          <p style="margin: 8px 0 0 0; color: #bfdbfe; font-size: 14px;">
            Hostel Management System Notification
          </p>
        </div>

        <!-- Main Content -->
        <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- Event Details Card -->
          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #0369a1; font-size: 18px; border-bottom: 2px solid #0ea5e9; padding-bottom: 8px;">
              📋 Event Details
            </h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; width: 140px;">Event Name:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${eventName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Date:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">${consumptionDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Hostel:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">${hostelName || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Recorded By:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">${recordedBy}</td>
              </tr>
              ${
                description
                  ? `
              <tr>
                <td style="padding: 8px 0; color: #64748b; vertical-align: top;">Notes:</td>
                <td style="padding: 8px 0; color: #475569; font-style: italic;">${description}</td>
              </tr>
              `
                  : ''
              }
            </table>
          </div>

          <!-- Items Table -->
          <div style="margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">
              📦 Items Consumed
            </h2>
            
            <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <thead>
                <tr style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);">
                  <th style="padding: 14px 12px; text-align: center; color: #475569; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">S.No</th>
                  <th style="padding: 14px 12px; text-align: left; color: #475569; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Item Name</th>
                  <th style="padding: 14px 12px; text-align: center; color: #475569; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                  <th style="padding: 14px 12px; text-align: center; color: #475569; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Unit</th>
                  <th style="padding: 14px 12px; text-align: right; color: #475569; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Cost</th>
                </tr>
              </thead>
              <tbody>
                ${itemsTableRows}
              </tbody>
              <tfoot>
                <tr style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);">
                  <td colspan="4" style="padding: 16px 12px; text-align: right; font-weight: 700; color: #065f46; font-size: 16px;">
                    Total Cost:
                  </td>
                  <td style="padding: 16px 12px; text-align: right; font-weight: 700; color: #059669; font-size: 18px;">
                    ₹${parseFloat(totalCost).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Low Stock Warning -->
          ${lowStockWarning}

          <!-- Footer Note -->
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 24px; text-align: center;">
            <p style="margin: 0; color: #64748b; font-size: 13px;">
              🕐 This consumption was recorded on <strong>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</strong>
            </p>
          </div>

        </div>

        <!-- Email Footer -->
        <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0 0 8px 0;">
            This is an automated notification from the Hostel Management System.
          </p>
          <p style="margin: 0;">
            © ${new Date().getFullYear()} National Engineering College - Hostel Management
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  const plainText = `
SPECIAL CONSUMPTION RECORDED
=============================

Event Name: ${eventName}
Date: ${consumptionDate}
Hostel: ${hostelName || 'N/A'}
Recorded By: ${recordedBy}
${description ? `Notes: ${description}` : ''}

ITEMS CONSUMED:
${items.map((item, i) => `${i + 1}. ${item.item_name || item.name} - ${item.quantity_consumed || item.quantity} ${item.unit} - ₹${parseFloat(item.cost || 0).toFixed(2)}`).join('\n')}

TOTAL COST: ₹${parseFloat(totalCost).toFixed(2)}

${lowStockItems.length > 0 ? `\n⚠️ LOW STOCK ALERT:\n${lowStockItems.map((item) => `- ${item.name}: ${item.current_stock} ${item.unit} (Min: ${item.minimum_stock})`).join('\n')}` : ''}

---
This is an automated notification from the Hostel Management System.
  `;

  return sendEmail({
    to: adminEmail,
    subject: `🍽️ Special Consumption Recorded: ${eventName} - ₹${parseFloat(totalCost).toFixed(2)}`,
    html: htmlContent,
    text: plainText,
  });
};

/**
 * Verify SMTP connection
 * @returns {Promise<boolean>} - True if connection is successful
 */
const verifyEmailConnection = async () => {
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

module.exports = {
  sendEmail,
  sendConsumptionNotificationToAdmin,
  verifyEmailConnection,
};