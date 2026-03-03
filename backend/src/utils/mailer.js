const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  const port = parseInt(process.env.EMAIL_PORT) || 587;
  const isGmail = process.env.EMAIL_HOST?.includes('gmail');

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: port,
    secure: port === 465, // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    // Thêm cấu hình TLS cho Gmail
    ...(isGmail && {
      tls: {
        rejectUnauthorized: false,
      }
    })
  });

  // Verify connection (chỉ chạy khi cần debug)
  if (process.env.NODE_ENV === 'development') {
    try {
      await transporter.verify();
      console.log('✅ Email server connected');
    } catch (err) {
      console.log('❌ Email server error:', err.message);
    }
  }

  const mailOptions = {
    from: `"LACA" <${process.env.EMAIL_USERNAME}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${options.email}`);
  } catch (err) {
    console.error('❌ Email send error:', err.message);
    throw err;
  }
};

module.exports = sendEmail;
