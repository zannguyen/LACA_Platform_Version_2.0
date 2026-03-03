const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // Detect if using SendGrid
  const isSendGrid = process.env.EMAIL_HOST?.includes('sendgrid');

  let transporter;

  if (isSendGrid) {
    // SendGrid SMTP
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: 'apikey', // SendGrid luôn dùng 'apikey'
        pass: process.env.SENDGRID_API_KEY,
      },
      tls: {
        rejectUnauthorized: false,
      }
    });
  } else {
    // Gmail/Other SMTP
    const port = parseInt(process.env.EMAIL_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: port,
      secure: port === 465,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      }
    });
  }

  console.log('📧 Sending via SMTP:', process.env.EMAIL_HOST);

  const mailOptions = {
    from: `"LACA" <${process.env.EMAIL_USERNAME || process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ Email error:', err.message);
    throw err;
  }
};

module.exports = sendEmail;
