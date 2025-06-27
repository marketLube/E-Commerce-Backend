import { configDotenv } from "dotenv";
configDotenv();

// import twilio from "twilio";
import crypto from "crypto";
import nodemailer from "nodemailer";

// const accountSid = process.env.TWILIO_SID;
// const authToken = process.env.TWILIO_TOKEN;
// const client = twilio(accountSid, authToken);

const generateOtp = () => crypto.randomInt(1000, 9999).toString();

export async function otpToEmail(
  mail,
  customContent = null,
  customSubject = "Your OTP Code"
) {
  const otp = generateOtp();

  let transpoter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.NODEMAILER_MAIL,
      pass: process.env.NODEMAILER_PASSWORD,
    },
  });

  let mailOptions = {
    from: process.env.NODEMAILER_MAIL,
    to: mail,
    subject: customSubject,
    html:
      customContent ||
      `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
              body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                  color: #333;
                  margin: 0;
                  padding: 0;
                  line-height: 1.6;
              }
              .container {
                  max-width: 600px;
                  margin: 30px auto;
                  background: #ffffff;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              }
              .header {
                  text-align: center;
                  padding: 10px 0;
                  border-bottom: 1px solid #eeeeee;
                  margin-bottom: 20px;
              }
              .header h1 {
                  font-size: 24px;
                  color: #333;
                  margin: 0;
              }
              .content {
                  text-align: center;
                  margin-bottom: 20px;
              }
              .otp {
                  font-size: 32px;
                  font-weight: bold;
                  color: #ffb64a;
                  margin: 20px 0;
              }
              .footer {
                  text-align: center;
                  font-size: 14px;
                  color: #666;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>MillStore</h1>
                  <h2>Your OTP Code</h2>
              </div>
              <div class="content">
                  <p>Your OTP code is <span class="otp">${otp}</span>. It is valid for 5 minutes.</p>
              </div>
              <div class="footer">
                  <p>If you did not request this code, please ignore this email.</p>
              </div>
          </div>
      </body>
      </html>
    `,
  };

  try {
    let info = await transpoter.sendMail(mailOptions);
    return [info.response, "OK", otp];
  } catch (err) {
    return [err, "Failed", null];
  }
}

