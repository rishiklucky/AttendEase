import nodemailer from 'nodemailer';

/**
 * Sends an email using Resend HTTP API (if RESEND_API_KEY is defined)
 * or falls back to Nodemailer SMTP (with fast connection timeouts).
 * 
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body content
 * @param {Array} [options.attachments] - Array of attachments (filename, content/path)
 * @param {string} [options.from] - Custom from display/email
 */
export const sendEmail = async ({ to, subject, html, attachments, fromDisplayName }) => {
  const resendApiKey = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : null;

  const fromName = fromDisplayName || process.env.EMAIL_FROM || 'AttendEase';

  if (resendApiKey) {
    console.log('Sending email via Resend HTTP API...');
    const resendUrl = 'https://api.resend.com/emails';
    const recipientList = Array.isArray(to) ? to : [to];

    // Format attachments for Resend API
    const resendAttachments = (attachments || []).map(att => {
      let contentBase64 = '';
      if (Buffer.isBuffer(att.content)) {
        contentBase64 = att.content.toString('base64');
      } else if (typeof att.content === 'string') {
        contentBase64 = att.content;
      }
      return {
        content: contentBase64,
        filename: att.filename
      };
    });

    // Default from email: if EMAIL_FROM_ADDRESS is defined, use it, otherwise use 'onboarding@resend.dev'
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev';
    const finalFrom = `"${fromName}" <${fromAddress}>`;

    const response = await fetch(resendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: finalFrom,
        to: recipientList,
        subject,
        html,
        attachments: resendAttachments
      })
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('Resend API Error response:', result);
      throw new Error(result.message || `Resend API returned status ${response.status}`);
    }
    return result;
  }

  const brevoApiKey = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : null;

  if (brevoApiKey) {
    console.log('Sending email via Brevo HTTP API...');
    const brevoUrl = 'https://api.brevo.com/v3/smtp/email';
    const recipientList = (Array.isArray(to) ? to : [to]).map(email => ({ email }));

    // Format attachments for Brevo API
    const brevoAttachments = (attachments || []).map(att => {
      let contentBase64 = '';
      if (Buffer.isBuffer(att.content)) {
        contentBase64 = att.content.toString('base64');
      } else if (typeof att.content === 'string') {
        contentBase64 = att.content;
      }
      return {
        content: contentBase64,
        name: att.filename
      };
    });

    const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;

    const response = await fetch(brevoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
        'accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromAddress },
        to: recipientList,
        subject,
        htmlContent: html,
        attachment: brevoAttachments.length > 0 ? brevoAttachments : undefined
      })
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('Brevo API Error response:', result);
      throw new Error(result.message || `Brevo API returned status ${response.status}`);
    }
    return result;
  }

  // Fallback to Nodemailer SMTP
  console.log('Sending email via Nodemailer SMTP...');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,   // 10 seconds
    socketTimeout: 15000      // 15 seconds
  });

  const recipientString = Array.isArray(to) ? to.join(', ') : to;
  const finalFrom = `"${fromName}" <${process.env.EMAIL_USER}>`;

  const mailOptions = {
    from: finalFrom,
    to: recipientString,
    subject,
    html,
    attachments
  };

  return await transporter.sendMail(mailOptions);
};
