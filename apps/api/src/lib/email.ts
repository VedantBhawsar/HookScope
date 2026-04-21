import nodemailer from "nodemailer"

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env["SMTP_HOST"] ?? "smtp.ethereal.email",
    port: Number(process.env["SMTP_PORT"] ?? 587),
    secure: process.env["SMTP_SECURE"] === "true",
    auth:
      process.env["SMTP_USER"]
        ? { user: process.env["SMTP_USER"], pass: process.env["SMTP_PASS"] }
        : undefined,
  })
}

const APP_NAME = process.env["APP_NAME"] ?? "HookScope"
const FROM_ADDRESS = process.env["SMTP_FROM"] ?? "noreply@hookscope.dev"

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const transporter = createTransporter()

  const info = await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM_ADDRESS}>`,
    to,
    subject: "Reset your password",
    text: [
      `You requested a password reset for your ${APP_NAME} account.`,
      "",
      `Click the link below to reset your password. It expires in 15 minutes:`,
      "",
      resetUrl,
      "",
      "If you didn't request this, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:0 16px">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">Reset your password</h2>
        <p style="color:#555;font-size:14px;line-height:1.6">
          You requested a password reset for your <strong>${APP_NAME}</strong> account.
          Click the button below — this link expires in <strong>15 minutes</strong>.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;margin:20px 0;background:#000;color:#fff;padding:12px 24px;
                  border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
          Reset Password
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px">
          If you didn't request a password reset, you can safely ignore this email.
          Your password will remain unchanged.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#aaa;font-size:11px">This link can only be used once and expires in 15 minutes.</p>
      </div>
    `,
  })

  if (process.env["NODE_ENV"] !== "production") {
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) console.log("[email] Ethereal preview:", previewUrl)
    console.log("[email] Password reset URL:", resetUrl)
  }
}

export async function sendEmailVerificationOtp(to: string, otp: string, name: string): Promise<void> {
  const transporter = createTransporter()

  const info = await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM_ADDRESS}>`,
    to,
    subject: `${otp} is your ${APP_NAME} verification code`,
    text: [
      `Hi ${name},`,
      "",
      `Your ${APP_NAME} email verification code is:`,
      "",
      otp,
      "",
      "This code expires in 5 minutes. Do not share it with anyone.",
      "",
      "If you didn't request this, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:0 16px">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">Verify your email</h2>
        <p style="color:#555;font-size:14px;line-height:1.6;margin-bottom:24px">
          Hi <strong>${name}</strong>, use the code below to verify your email address.
          It expires in <strong>5 minutes</strong>.
        </p>

        <div style="background:#f5f5f5;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px">
          <div style="letter-spacing:0.25em;font-size:36px;font-weight:700;color:#111;font-family:monospace">
            ${otp.split("").join("&thinsp;")}
          </div>
          <p style="color:#888;font-size:12px;margin-top:8px;margin-bottom:0">
            One-time code · expires in 5 minutes
          </p>
        </div>

        <p style="color:#888;font-size:12px;margin-top:24px">
          If you didn't create a <strong>${APP_NAME}</strong> account, you can safely ignore this email.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#aaa;font-size:11px">Do not share this code with anyone. ${APP_NAME} will never ask for it.</p>
      </div>
    `,
  })

  if (process.env["NODE_ENV"] !== "production") {
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) console.log("[email] Ethereal preview:", previewUrl)
    console.log("[email] OTP for", to, ":", otp)
  }
}
