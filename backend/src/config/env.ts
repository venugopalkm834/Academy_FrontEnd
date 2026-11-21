import 'dotenv/config';
const need = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`Missing env ${k}`); return v; };
const aadhaarKey = process.env.AADHAAR_KEY || (process.env.NODE_ENV === 'production' ? '' : '00'.repeat(32));
if (!/^[0-9a-fA-F]{64}$/.test(aadhaarKey)) throw new Error('AADHAAR_KEY must be 64 hex characters. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
export const env = {
  aadhaarKey,
  port: +(process.env.PORT || 5000), prod: process.env.NODE_ENV === 'production',
  mongo: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/academic_club', client: process.env.CLIENT_URL || 'http://localhost:4200',
  access: need('JWT_ACCESS_SECRET'), refresh: need('JWT_REFRESH_SECRET'),
  smtp: { host: process.env.SMTP_HOST, port: +(process.env.SMTP_PORT || 587), user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  from: process.env.MAIL_FROM || 'no-reply@localhost',
};
