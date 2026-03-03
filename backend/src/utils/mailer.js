const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  console.log('📧 Sending via Gmail SMTP to:', options.email);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1'
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000
  });

  const mailOptions = {
    from: `"LACA" <${process.env.EMAIL_USERNAME}>`,
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
