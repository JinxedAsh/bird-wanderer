// Recovery accepts one plain mailbox, never a display name/address list.
export const plainMailbox = (email) => typeof email === 'string' && email.length <= 254 && /^[^\s@<>,;:"\\\[\]]+@[^\s@<>,;:"\\\[\]]+\.[^\s@<>,;:"\\\[\]]+$/.test(email);

// Credentials stay on the server. Unconfigured installations never send mail.
export async function configuredRecoveryMail(env = process.env, transportFactory) {
  const fields = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'];
  if (fields.every((field) => !env[field])) return undefined;
  if (fields.some((field) => typeof env[field] !== 'string' || !env[field] || env[field].length > 2048)) throw new Error('Complete all SMTP settings before enabling password recovery.');
  if (!/^[a-zA-Z0-9.-]{1,253}$/.test(env.SMTP_HOST) || !['465', '587'].includes(env.SMTP_PORT)
    || /[\r\n]/.test(env.SMTP_USER) || !plainMailbox(env.SMTP_FROM)) throw new Error('Use a valid SMTP host, TLS port 465/587 and plain sender email address.');
  const createTransport = transportFactory || (await import('nodemailer')).default.createTransport;
  const transport = createTransport({ host: env.SMTP_HOST, port: Number(env.SMTP_PORT), secure: env.SMTP_PORT === '465', requireTLS: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000,
    disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false });
  return {
    origin: env.RECOVERY_ORIGIN || undefined,
    async send({ email, url }) {
      if (!plainMailbox(email)) throw new Error('Recovery requires one plain recipient email address.');
      const result = await transport.sendMail({ from: { name: 'Bird Wanderer', address: env.SMTP_FROM }, to: { address: email },
        subject: 'Reset your Bird Wanderer password', text: `A password reset was requested for your Bird Wanderer account.\n\nOpen this link within 15 minutes:\n${url}\n\nOnly the latest link works, once. If you did not request this, ignore this email. Your password has not changed.` });
      if (!result.accepted?.some((recipient) => (typeof recipient === 'string' ? recipient : recipient?.address)?.toLowerCase() === email)) throw new Error('Recovery mail was not accepted.');
    },
  };
}
