import nodemailer from 'nodemailer';

/**
 * REUSABLE TRANSPORTER WITH POOLING
 * pool: true keeps the connection open instead of logging in/out for every email.
 * maxConnections: 1 is safest for Gmail to avoid "Too many concurrent connections" errors.
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', 
  pool: true, 
  maxConnections: 1, 
  maxMessages: Infinity,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Core function to send email notification
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Hostel Management'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || subject,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] ✅ Sent to: ${to}`);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] ❌ Failed for ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send Individual Monthly Mess Bill to Student
 */
export const sendMessBillToStudent = async (data) => {
  const { 
    studentEmail, 
    studentName, 
    rollNumber, 
    month, 
    year, 
    amount, 
    breakdown 
  } = data;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <body style="font-family: sans-serif; background-color: #f3f4f6; padding: 20px; color: #374151; margin: 0;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        <div style="background: #2563eb; padding: 30px; text-align: center; color: #ffffff;">
          <p style="text-transform: uppercase; letter-spacing: 2px; margin: 0; font-size: 11px; font-weight: 700; opacity: 0.9;">National Engineering College</p>
          <h1 style="margin: 10px 0 0 0; font-size: 24px; font-weight: 800;">Monthly Mess Bill</h1>
        </div>
        <div style="padding: 35px;">
          <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Dear ${studentName},</h2>
          <p style="line-height: 1.6; color: #4b5563;">Your mess bill for <strong>${month} ${year}</strong> has been generated.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 25px 0; display: table; width: 100%;">
            <div style="display: table-cell; width: 50%;">
              <span style="color: #64748b; display: block; text-transform: uppercase; font-size: 10px; font-weight: 800;">Roll Number</span>
              <span style="font-weight: 700;">${rollNumber || 'N/A'}</span>
            </div>
            <div style="display: table-cell; width: 50%; text-align: right;">
              <span style="color: #64748b; display: block; text-transform: uppercase; font-size: 10px; font-weight: 800;">Period</span>
              <span style="font-weight: 700;">${month} ${year}</span>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0;">
                <th style="text-align: left; padding: 12px 0; color: #64748b; font-size: 12px;">Particulars</th>
                <th style="text-align: right; padding: 12px 0; color: #64748b; font-size: 12px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 15px 0; border-bottom: 1px solid #f1f5f9;">
                  <strong>Mess Charges</strong><br>
                  <span style="color: #94a3b8; font-size: 12px;">Attendance: ${breakdown.messDays} days</span>
                </td>
                <td style="text-align: right; padding: 15px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700;">₹${parseFloat(breakdown.messAmount).toFixed(2)}</td>
              </tr>
              ${parseFloat(breakdown.additionalAmount) > 0 ? `<tr>
                <td style="padding: 15px 0; border-bottom: 1px solid #f1f5f9;"><strong>Extra Charges</strong></td>
                <td style="text-align: right; padding: 15px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700;">₹${parseFloat(breakdown.additionalAmount).toFixed(2)}</td>
              </tr>` : ''}
              ${parseFloat(breakdown.bedCharges) > 0 ? `<tr>
                <td style="padding: 15px 0; border-bottom: 1px solid #f1f5f9;"><strong>Bed Charges</strong></td>
                <td style="text-align: right; padding: 15px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700;">₹${parseFloat(breakdown.bedCharges).toFixed(2)}</td>
              </tr>` : ''}
              ${parseFloat(breakdown.newspaperAmount) > 0 ? `<tr>
                <td style="padding: 15px 0; border-bottom: 1px solid #f1f5f9;"><strong>Newspaper Charges</strong></td>
                <td style="text-align: right; padding: 15px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700;">₹${parseFloat(breakdown.newspaperAmount).toFixed(2)}</td>
              </tr>` : ''}
            </tbody>
          </table>

          <div style="background: #eff6ff; border-radius: 12px; padding: 25px; text-align: right; border: 1px solid #dbeafe;">
            <span style="color: #1e40af; font-size: 13px; font-weight: 700;">TOTAL AMOUNT DUE</span>
            <h2 style="color: #1e40af; margin: 8px 0 0 0; font-size: 32px; font-weight: 800;">₹${parseFloat(amount).toFixed(2)}</h2>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
          <p>National Engineering College Gents Hostel, K.R. Nagar.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: studentEmail, subject: `sample (beta) Mess Bill: ${month} ${year} - ₹${amount}`, html: htmlContent });
};

/**
 * Send Special Consumption Notification to Admin
 */
export const sendConsumptionNotificationToAdmin = async (data) => {
  const { eventName, consumptionDate, items, totalCost, recordedBy, hostelName, lowStockItems = [] } = data;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || '2312057@nec.edu.in';

  const itemsTableRows = items.map((item, index) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px;">${index + 1}</td>
      <td style="padding: 10px;">${item.item_name || item.name}</td>
      <td style="padding: 10px; text-align: center;">${item.quantity_consumed || item.quantity}</td>
      <td style="padding: 10px; text-align: right;">₹${parseFloat(item.cost || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <body style="font-family: sans-serif; padding: 20px;">
      <div style="background: #2563eb; color: #fff; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h2>🍽️ Extra Consumption Recorded</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
        <p><strong>Event:</strong> ${eventName} | <strong>By:</strong> ${recordedBy}</p>
        <table style="width: 100%; border-collapse: collapse;">
          <thead style="background: #f8fafc;">
            <tr><th>#</th><th align="left">Item</th><th>Qty</th><th align="right">Cost</th></tr>
          </thead>
          <tbody>${itemsTableRows}</tbody>
        </table>
        <h3 align="right">Total: ₹${parseFloat(totalCost).toFixed(2)}</h3>
      </div>
    </body>
  `;

  return sendEmail({ to: adminEmail, subject: `🍽️ Extra Consumption: ${eventName}`, html: htmlContent });
};

export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    return false;
  }
};