import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';
import nodemailer from 'nodemailer';
import pg from 'pg';
import { ensureConfiguredAdministrator } from './adminAccount.js';



const serverDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(serverDir, '../../.env') });

const app = express();
app.set('trust proxy', 1);


const allowedClientOrigins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);
if (process.env.APP_URL) {
  try {
    allowedClientOrigins.add(new URL(process.env.APP_URL).origin);
  } catch {
    // APP_URL is validated for production startup below.
  }
}
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedClientOrigins.has(origin));
  },
  credentials: true,
}));

const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
const pool = databaseUrl ? new pg.Pool({ connectionString: databaseUrl }) : null;

function validateDatabaseUrl(value) {
  if (!value) return;
  let parsedDatabaseUrl;
  try {
    parsedDatabaseUrl = new URL(value);
  } catch {
    throw new Error('DATABASE_URL must be a PostgreSQL URL such as postgresql://postgres:password@localhost:5432/fieldnotes. Remove any leading slash or .s.PGSQL socket suffix.');
  }
  if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol) || !parsedDatabaseUrl.pathname || parsedDatabaseUrl.pathname === '/' || /\.s\.PGSQL\.\d+$/.test(parsedDatabaseUrl.pathname)) {
    throw new Error('DATABASE_URL must be a PostgreSQL URL such as postgresql://postgres:password@localhost:5432/fieldnotes. Remove any leading slash or .s.PGSQL socket suffix.');
  }
}


const signupSecret = process.env.JWT_SECRET || randomBytes(48).toString('hex');
const cookieName = process.env.NODE_ENV === 'production' ? '__Host-fieldnotes_session' : 'fieldnotes_session';
const cookieLifetime = 8 * 60 * 60 * 1000;
const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
};
const contentRoot = join(serverDir, '../content');
const memoryUsers = [];
const memorySignupVerifications = new Map();
const memorySessions = new Map();
const memoryFeedback = [];
const memoryPasswordResets = new Map();
let nextMemoryUserId = 1;
let sesTransporter;
const signupCodeLifetimeMs = 10 * 60 * 1000;
const maxSignupCodeAttempts = 5;
const passwordResetCodeLifetimeMs = 10 * 60 * 1000;
const onlinePresenceWindowMs = 5 * 60 * 1000;

const categories = [
  { slug: 'os', name: 'Operating Systems', icon: 'monitor' },
  { slug: 'networking', name: 'Networking + Hardware', icon: 'network' },
  { slug: 'keycloak', name: 'Keycloak', icon: 'key' },
  { slug: 'commands', name: 'Commands', icon: 'terminal' },
  { slug: 'aws', name: 'AWS', icon: 'cloud' },
];

const contentBySection = {
  os: [{ id: 'cybersecurity', title: 'Cybersecurity and OS notes', sourceName: 'Cybersecurity.odt', textName: 'cybersecurity.txt' }],
  networking: [
    { id: 'emipro-task', title: 'Networking and learning notes', sourceName: 'emipro_task.odt', textName: 'emipro-task.txt' },
    { id: 'hardware-diagram', title: 'Hardware diagram', sourceName: 'Hardwares.drawio', diagramName: 'Hardwares.svg' },
    { id: 'company-network-diagram', title: 'Company network diagram', sourceName: 'Network_Connection_whole_compney.drawio', diagramName: 'Network_Connection_whole_compney.svg' },
  ],
  keycloak: [{ id: 'keycloak', title: 'Keycloak server and SSO notes', sourceName: 'Keyclock_server.odt', textName: 'keycloak.txt' }],
  commands: [{ id: 'commands', title: 'Linux commands reference', sourceName: 'commands.txt', textName: 'commands.txt' }],
  aws: [{ id: 'aws', title: 'AWS notes', sourceName: 'AWS.odt', textName: 'aws.txt' }],
};

let allDocuments = [];

const spellingCorrections = [
  ['kernal', 'kernel'], ['demon-reload', 'daemon-reload'], ['protocall', 'protocol'],
  ['Keyclock', 'Keycloak'], ['keyclock', 'Keycloak'], ['keyclok', 'Keycloak'], ['Keyclok', 'Keycloak'],
    ['reciver', 'receiver'], ['communcation', 'communication'], ['virtuall', 'virtual'],
    ['sedn', 'send'], ['khow', 'know'], ['wich', 'which'], ['vedio', 'video'],
    ['traffice', 'traffic'], ['wil', 'will'], ['wesbite', 'website'], ['youtub', 'YouTube'],
    ['wiregurd', 'WireGuard'], ['occure', 'occur'], ['formate', 'format'],
    ['stagging', 'staging'], ['seprate', 'separate'], ['perfomr', 'perform'],
    ['intrupt', 'interrupt'], ['ethernate', 'Ethernet'], ['desti', 'destination'],
    ['threades', 'threads'], ['threade', 'thread'], ['authnetcate', 'authenticate'],
    ['authnetcate', 'authenticate'], ['comunication', 'communication'], ['probleme', 'problem'],
    ['reciver', 'receiver'], ['responce', 'response'], ['tranmission', 'transmission'],
    ['trasmission', 'transmission'], ['conection', 'connection'], ['comapny', 'company'],
    ['defualt', 'default'], ['untill', 'until'], ['untile', 'until'], ['intall', 'install'],
    ['unquie', 'unique'], ['unknow', 'unknown'], ['authentcate', 'authenticate'],
    ['authentiction', 'authentication'], ['exchnage', 'exchange'], ['exchage', 'exchange'],
    ['keybaord', 'keyboard'], ['monitering', 'monitoring'], ['recieves', 'receives'],
    ['recieving', 'receiving'], ['recieve', 'receive'], ['recieved', 'received'],
    ['currenly', 'currently'], ['currnetly', 'currently'], ['currenlty', 'currently'],
    ['lenght', 'length'], ['happend', 'happened'], ['hapen', 'happen'], ['becuase', 'because'],
    ['throught', 'through'], ['thoughout', 'throughout'], ['thier', 'their'], ['teh', 'the'],
    ['scirpt', 'script'], ['scrpit', 'script'], ['manuallly', 'manually'], ['manuall', 'manual'],
    ['recetly', 'recently'], ['sucessful', 'successful'], ['succesful', 'successful'],
    ['succsessful', 'successful'], ['succesfully', 'successfully'], ['occurr', 'occur'],
    ['acheive', 'achieve'], ['acheived', 'achieved'], ['securty', 'security'],
    ['secutiry', 'security'], ['securtiy', 'security'], ['authenication', 'authentication'],
    ['identiy', 'identity'], ['widht', 'width'], ['heigth', 'height'], ['widht', 'width'],
    ['incrase', 'increase'], ['decreasee', 'decrease'], ['spefic', 'specific'],
    ['spesific', 'specific'], ['diffrence', 'difference'], ['diffrent', 'different'],
    ['differnt', 'different'], ['differnce', 'difference'], ['recieve', 'receive'],
    ['releated', 'related'], ['relavent', 'relevant'], ['aslo', 'also'], ['alwasy', 'always'],
    ['becouse', 'because'], ['becuase', 'because'], ['reslove', 'resolve'], ['soluton', 'solution'],
    ['instace', 'instance'], ['instnace', 'instance'], ['meduim', 'medium'],
    ['servre', 'server'], ['sevice', 'service'], ['serivce', 'service'], ['serer', 'server'],
    ['enviroment', 'environment'], ['environemnt', 'environment'], ['requirment', 'requirement'],
    ['requried', 'required'], ['requiremnt', 'requirement'], ['recomend', 'recommend'],
    ['recomendation', 'recommendation'], ['teh', 'the'], ['adn', 'and'], ['taht', 'that'],
    ['thsi', 'this'], ['tis', 'this'], ['wiht', 'with'],
    ['fom', 'from'], ['frmo', 'from'], ['wrok', 'work'], ['worng', 'wrong'], ['wroking', 'working'],
    ['becasue', 'because'], ['beacuse', 'because'], ['thn', 'then'], ['thsi', 'this'],
  ['instacne', 'instance'], ['databse', 'database'], ['performace', 'performance'],
  ['parmanatly', 'permanently'], ['permanant', 'permanent'], ['exicute', 'execute'],
  ['exicutable', 'executable'], ['downlod', 'download'], ['currunte', 'current'],
  ['currunt', 'current'], ['specefic', 'specific'], ['perticuler', 'particular'],
  ['somthing', 'something'], ['commite', 'commit'], ['commint', 'commit'], ['stagging', 'staging'],
  ['staggin', 'staging'], ['partions', 'partitions'], ['partiton', 'partition'],
  ['formate', 'format'], ['permisison', 'permission'], ['hiddent', 'hidden'],
  ['fromate', 'format'], ['timezon', 'timezone'], ['serch', 'search'], ['khown', 'known'],
  ['autheticate', 'authenticate'], ['authetication', 'authentication'], ['authencatin', 'authentication'],
  ['authorizaton', 'authorization'], ['autorization', 'authorization'], ['genrate', 'generate'],
  ['exchnage', 'exchange'], ['requste', 'request'], ['responce', 'response'],
  ['internate', 'internet'], ['connecte', 'connected'], ['conntet', 'connect'],
  ['diffrent', 'different'], ['rsycn', 'rsync'], ['rulles', 'rules'], ['fomrate', 'format'],
  ['passwornd', 'password'], ['chekc', 'check'], ['occure', 'occur'], ['moniter', 'monitor'],
  ['continusely', 'continuously'], ['vulerability', 'vulnerability'], ['commnay', 'company'],
  ['compney', 'company'], ['comnpany', 'company'], ['comnay', 'company'], ['buisnees', 'business'],
  ['buisneess', 'business'], ['swith', 'switch'], ['motherbord', 'motherboard'],
  ['perge', 'purge'], ['temparary', 'temporary'], ['temparory', 'temporary'],
  ['virchual', 'virtual'], ['virchul', 'virtual'], ['tamplate', 'template'],
  ['replac', 'replace'], ['provde', 'provide'], ['pasy-as-you-use', 'pay-as-you-use'],
  ['thigs', 'things'], ['hourseor', 'hours or'], ['recive', 'receive'], ['recieves', 'receives'],
  ['untile', 'until'], ['proparly', 'properly'], ['enviroment', 'environment'],
  ['environemt', 'environment'], ['seprate', 'separate'], ['tranmission', 'transmission'],
  ['tranmisison', 'transmission'], ['tramsission', 'transmission'], ['commnad', 'command'],
  ['commad', 'command'], ['commads', 'commands'], ['acess', 'access'], ['acesss', 'access'],
  ['seting', 'setting'], ['settign', 'setting'], ['acount', 'account'], ['acutal', 'actual'],
  ['actuall', 'actual'], ['reques', 'request'], ['requst', 'request'], ['secuirty', 'security'],
  ['securiry', 'security'], ['securly', 'securely'], ['securtly', 'securely'],
  ['authneticate', 'authenticate'], ['refress', 'refresh'], ['resion', 'reason'],
  ['woking', 'working'], ['easialy', 'easily'], ['instalation', 'installation'],
  ['intallation', 'installation'], ['intall', 'install'], ['dowlod', 'download'],
  ['uplod', 'upload'], ['comuter', 'computer'], ['passwod', 'password'],
  ['passdowrd', 'password'], ['passwor', 'password'], ['softcut', 'shortcut'],
  ['sortcut', 'shortcut'], ['sortcuts', 'shortcuts'], ['expiary', 'expiry'],
  ['writen', 'written'], ['guss', 'guess'], ['threade', 'thread'], ['threades', 'threads'],
  ['mathamatical', 'mathematical'], ['aligment', 'alignment'], ['conert', 'convert'],
  ['calcluat', 'calculate'], ['calcualte', 'calculate'], ['identifiy', 'identify'],
  ['uniqally', 'uniquely'], ['uniqe', 'unique'], ['indetify', 'identify'],
  ['destinaton', 'destination'], ['receving', 'receiving'], ['reciving', 'receiving'],
  ['strenght', 'strength'], ['incrase', 'increase'], ['electical', 'electrical'],
  ['keybord', 'keyboard'], ['pyorly', 'purely'], ['connete', 'connect'], ['repeter', 'repeater'],
  ['interfce', 'interface'], ['differnt', 'different'], ['connetion', 'connection'],
  ['conection', 'connection'], ['becuase', 'because'], ['happend', 'happened'],
  ['comand', 'command'], ['servce', 'service'], ['sevice', 'service'],
  ['dependecy', 'dependency'], ['depedency', 'dependency'], ['configration', 'configuration'],
  ['confguration', 'configuration'], ['confiuration', 'configuration'], ['identiy', 'identity'],
  ['administatore', 'administrator'], ['administratore', 'administrator'], ['admnistratore', 'administrator'],
  ['enterpize', 'enterprise'], ['enterpirze', 'enterprise'], ['indivisual', 'individual'],
  ['wich', 'which'], ['protocoll', 'protocol'], ['protocal', 'protocol'],
  ['inforamtion', 'information'], ['infromation', 'information'], ['permssion', 'permission'],
  ['enviornment', 'environment'], ['sucessful', 'successful'], ['successfull', 'successful'],
  ['succesfully', 'successfully'], ['succesful', 'successful'], ['sucessfully', 'successfully'],
  ['occured', 'occurred'], ['ocurred', 'occurred'], ['unknow', 'unknown'], ['unkhown', 'unknown'],
  ['defult', 'default'], ['lenght', 'length'], ['thier', 'their'], ['wiht', 'with'],
];

const findDocument = (id) => allDocuments.find((item) => item.id === id);
const publicUser = ({ id, name, email, role, is_active = true, payment_done = false, referral_code = null, referral_rewarded = false }) => ({
  id,
  name,
  email,
  role,
  isActive: is_active,
  paymentDone: payment_done,
  referralRewarded: referral_rewarded,
  hasFullAccess: role === 'admin' || payment_done || referral_rewarded,
  referralCode: referral_code,
});
const isStrongPassword = (password) => typeof password === 'string'
  && password.length >= 8
  && password.length <= 128
  && /[a-z]/.test(password)
  && /[A-Z]/.test(password)
  && /\d/.test(password)
  && /[^A-Za-z0-9]/.test(password);

async function readCorrectedText(document) {
  let text = document.content;
  if (typeof text !== 'string') {
    text = await readFile(join(contentRoot, 'source', document.textName), 'utf8');
  }
  for (const [misspelling, correction] of spellingCorrections) {
    text = text.replace(new RegExp(`\\b${misspelling}\\b`, 'gi'), (matched) => {
      if (matched.toUpperCase() === matched) return correction.toUpperCase();
      if (matched[0] === matched[0].toUpperCase()) return correction[0].toUpperCase() + correction.slice(1);
      return correction;
    });
  }
  return text;
}

async function initializeContent() {
  allDocuments = [];
  for (const category of categories) {
    for (const [index, source] of (contentBySection[category.slug] || []).entries()) {
      const kind = source.diagramName ? 'diagram' : 'document';
      const content = source.diagramName
        ? await readFile(join(contentRoot, 'diagrams', source.diagramName), 'utf8')
        : await readCorrectedText(source);
      const document = { id: source.id, sectionSlug: category.slug, title: source.title, sourceName: source.sourceName, kind, content };
      if (pool) {
        await pool.query(`INSERT INTO content_documents (id, section_id, title, source_name, kind, content, sort_order)
          SELECT $1, id, $3, $4, $5, $6, $7 FROM categories WHERE slug = $2
          ON CONFLICT (id) DO NOTHING`, [document.id, category.slug, document.title, document.sourceName, kind, content, index + 1]);
      } else {
        allDocuments.push(document);
      }
    }
  }
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  strictTransportSecurity: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: false, preload: false }
    : false,
}));
app.disable('x-powered-by');
app.use((request, response, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
  const origin = request.get('origin');
  if (process.env.NODE_ENV === 'production' && !origin) return response.status(403).json({ error: 'A valid request origin is required' });
  if (origin && !allowedClientOrigins.has(origin)) return response.status(403).json({ error: 'This request origin is not allowed' });
  next();
});

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  validate:   { xForwardedForHeader: false  },
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_request, response) => response.status(429).json({ error: 'Too many sign-in attempts. Wait 15 minutes before trying again.' }),
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  validate: { xForwardedForHeader: false },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (request) => {
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const emailKey = createHash('sha256').update(email).digest('hex');
    return `${ipKeyGenerator(request.ip)}:${emailKey}`;
  },
  handler: (_request, response) => response.status(429).json({ error: 'Too many sign-in attempts. Wait 15 minutes before trying again.' }),
});
const signupLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false });
const signupVerificationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => response.status(429).json({ error: 'Too many reset requests. Wait a while and try again.' }),
});
const passwordResetVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => response.status(429).json({ error: 'Too many verification attempts. Wait a while and try again.' }),
});

async function findUserByEmail(email) {
  if (!pool) return memoryUsers.find((user) => user.email === email) || null;
  const result = await pool.query('SELECT id, name, email, password_hash, role, is_active, payment_done, referral_code, referral_rewarded, referred_by_user_id FROM app_users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

async function findUserById(id) {
  if (!pool) return memoryUsers.find((user) => String(user.id) === String(id)) || null;
  const result = await pool.query('SELECT id, name, email, role, is_active, payment_done, referral_code, referral_rewarded, referred_by_user_id FROM app_users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function createReferralCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomBytes(5).toString('hex').toUpperCase();
    if (pool) {
      const result = await pool.query('SELECT 1 FROM app_users WHERE referral_code = $1', [code]);
      if (!result.rowCount) return code;
    } else if (!memoryUsers.some((user) => user.referral_code === code)) {
      return code;
    }
  }
  throw new Error('Could not allocate a unique referral code');
}

async function findReferrerByCode(code) {
  if (!pool) return memoryUsers.find((user) => user.referral_code === code && user.role === 'user' && user.is_active) || null;
  const result = await pool.query('SELECT id FROM app_users WHERE referral_code = $1 AND role = \'user\' AND is_active = TRUE', [code]);
  return result.rows[0] || null;
}

async function backfillReferralCodes() {
  if (!pool) return;
  const missing = await pool.query('SELECT id FROM app_users WHERE referral_code IS NULL');
  for (const user of missing.rows) {
    const code = await createReferralCode();
    await pool.query('UPDATE app_users SET referral_code = $1 WHERE id = $2 AND referral_code IS NULL', [code, user.id]);
  }
}

async function ensureReferralCode(userId) {
  if (pool) {
    const account = await findUserById(userId);
    if (!account) return null;
    if (account.referral_code) return account.referral_code;
    const code = await createReferralCode();
    const updated = await pool.query('UPDATE app_users SET referral_code = $1 WHERE id = $2 AND referral_code IS NULL RETURNING referral_code', [code, userId]);
    return updated.rows[0]?.referral_code || (await findUserById(userId))?.referral_code || null;
  }
  const account = memoryUsers.find((user) => String(user.id) === String(userId));
  if (!account) return null;
  if (!account.referral_code) account.referral_code = await createReferralCode();
  return account.referral_code;
}

async function getReferralEligibility(userId) {
  if (pool) {
    const result = await pool.query(`SELECT COUNT(*) FILTER (WHERE payment_done = TRUE)::int AS purchases
      FROM app_users WHERE referred_by_user_id = $1 AND role = 'user'`, [userId]);
    return result.rows[0]?.purchases >= 2;
  }
  return memoryUsers.filter((user) => String(user.referred_by_user_id) === String(userId) && user.role === 'user' && user.payment_done).length >= 2;
}

async function getReferralStats(userId) {
  const code = await ensureReferralCode(userId);
  if (pool) {
    const result = await pool.query(`SELECT account.referral_code, account.referral_rewarded,
        stats.registrations, stats.logins, stats.purchases, pending.pending_uses
      FROM app_users account
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS registrations,
          COUNT(*) FILTER (WHERE login_count > 0)::int AS logins,
          COUNT(*) FILTER (WHERE payment_done = TRUE)::int AS purchases
        FROM app_users WHERE referred_by_user_id = account.id AND role = 'user'
      ) stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS pending_uses FROM signup_verifications
        WHERE referred_by_user_id = account.id AND expires_at > NOW()
      ) pending ON TRUE
      WHERE account.id = $1`, [userId]);
    const account = result.rows[0];
    return {
      code: code || account?.referral_code || null,
      registrations: account?.registrations || 0,
      logins: account?.logins || 0,
      purchases: account?.purchases || 0,
      shares: (account?.registrations || 0) + (account?.pending_uses || 0),
      rewardUnlocked: Boolean(account?.referral_rewarded),
      rewardEligible: (account?.purchases || 0) >= 2 && !Boolean(account?.referral_rewarded),
    };
  }
  const account = memoryUsers.find((user) => String(user.id) === String(userId));
  const referredUsers = memoryUsers.filter((user) => String(user.referred_by_user_id) === String(userId) && user.role === 'user');
  const pendingReferralUses = [...memorySignupVerifications.values()].filter((pending) =>
    String(pending.referred_by_user_id) === String(userId) && new Date(pending.expires_at).getTime() > Date.now()).length;
  return {
    code: code || account?.referral_code || null,
    registrations: referredUsers.length,
    logins: referredUsers.filter((user) => Number(user.login_count || 0) > 0).length,
    purchases: referredUsers.filter((user) => user.payment_done).length,
    shares: referredUsers.length + pendingReferralUses,
    rewardUnlocked: Boolean(account?.referral_rewarded),
    rewardEligible: referredUsers.filter((user) => user.payment_done).length >= 2 && !Boolean(account?.referral_rewarded),
  };
}

async function getAdminReferralSummary(currentUserId) {
  if (pool) {
    const [overviewResult, currentUserOnlineResult, referralsResult] = await Promise.all([
      pool.query(`SELECT
        (SELECT COUNT(*)::int FROM app_users WHERE role = 'user') AS total_users,
        (SELECT COUNT(DISTINCT active_session.user_id)::int FROM auth_sessions active_session JOIN app_users u ON u.id = active_session.user_id
          WHERE active_session.expires_at > NOW() AND active_session.last_seen_at > NOW() - INTERVAL '5 minutes' AND u.is_active = TRUE) AS online_users,
        ((SELECT COUNT(*)::int FROM app_users WHERE referred_by_user_id IS NOT NULL AND role = 'user')
          + (SELECT COUNT(*)::int FROM signup_verifications WHERE referred_by_user_id IS NOT NULL AND expires_at > NOW())) AS referral_shares,
        (SELECT COUNT(*)::int FROM app_users WHERE referred_by_user_id IS NOT NULL AND role = 'user') AS referral_registrations,
        (SELECT COUNT(*)::int FROM app_users WHERE referred_by_user_id IS NOT NULL AND role = 'user' AND login_count > 0) AS referral_logins,
        (SELECT COUNT(*)::int FROM app_users WHERE referred_by_user_id IS NOT NULL AND role = 'user' AND payment_done = TRUE) AS referral_purchases`),
      pool.query(`SELECT EXISTS (
        SELECT 1 FROM auth_sessions active_session JOIN app_users account ON account.id = active_session.user_id
        WHERE active_session.user_id = $1 AND active_session.expires_at > NOW()
          AND active_session.last_seen_at > NOW() - INTERVAL '5 minutes' AND account.is_active = TRUE
      ) AS is_online`, [currentUserId]),
      pool.query(`SELECT owner.id, owner.name, owner.email, owner.referral_rewarded,
          (COUNT(referred.id) + COALESCE(pending.pending_count, 0))::int AS shares,
          COUNT(referred.id)::int AS registrations,
          COUNT(referred.id) FILTER (WHERE referred.login_count > 0)::int AS logins,
          COUNT(referred.id) FILTER (WHERE referred.payment_done = TRUE)::int AS purchases
        FROM app_users owner
        LEFT JOIN app_users referred ON referred.referred_by_user_id = owner.id AND referred.role = 'user'
        LEFT JOIN (SELECT referred_by_user_id, COUNT(*)::int AS pending_count FROM signup_verifications
          WHERE referred_by_user_id IS NOT NULL AND expires_at > NOW() GROUP BY referred_by_user_id) pending ON pending.referred_by_user_id = owner.id
        WHERE owner.role = 'user'
        GROUP BY owner.id, pending.pending_count
        HAVING COUNT(referred.id) > 0 OR COALESCE(pending.pending_count, 0) > 0
        ORDER BY registrations DESC, shares DESC, owner.created_at`),
    ]);
    const overview = overviewResult.rows[0];
    return {
      overview: {
        totalUsers: overview.total_users,
        onlineUsers: overview.online_users + (currentUserOnlineResult.rows[0].is_online ? 0 : 1),
        referralShares: overview.referral_shares,
        referralRegistrations: overview.referral_registrations,
        referralLogins: overview.referral_logins,
        referralPurchases: overview.referral_purchases,
      },
      referrals: referralsResult.rows.map((row) => ({
        id: row.id, name: row.name, email: row.email,
        referralRewarded: Boolean(row.referral_rewarded), shares: row.shares,
        registrations: row.registrations, logins: row.logins, purchases: row.purchases,
      })),
    };
  }

  const onlineUserIds = new Set([...memorySessions.values()]
    .filter((session) => new Date(session.expiresAt).getTime() > Date.now() && Date.now() - new Date(session.lastSeenAt || 0).getTime() < onlinePresenceWindowMs)
    .filter((session) => memoryUsers.some((user) => String(user.id) === String(session.userId) && user.is_active))
    .map((session) => String(session.userId)));
  const referred = memoryUsers.filter((user) => user.role === 'user' && user.referred_by_user_id);
  const pendingReferralUses = [...memorySignupVerifications.values()].filter((pending) =>
    pending.referred_by_user_id && new Date(pending.expires_at).getTime() > Date.now());
  const referrals = memoryUsers.filter((owner) => owner.role === 'user').map((owner) => {
    const referredUsers = referred.filter((user) => String(user.referred_by_user_id) === String(owner.id));
    const pendingUsesForOwner = pendingReferralUses.filter((pending) => String(pending.referred_by_user_id) === String(owner.id)).length;
    const shares = referredUsers.length + pendingUsesForOwner;
    return {
      id: owner.id, name: owner.name, email: owner.email,
      referralRewarded: Boolean(owner.referral_rewarded), shares,
      registrations: referredUsers.length,
      logins: referredUsers.filter((user) => Number(user.login_count || 0) > 0).length,
      purchases: referredUsers.filter((user) => user.payment_done).length,
    };
  }).filter((row) => row.registrations > 0 || row.shares > 0)
    .sort((a, b) => b.registrations - a.registrations || b.shares - a.shares);
  return {
    overview: {
      totalUsers: memoryUsers.filter((user) => user.role === 'user').length,
      onlineUsers: onlineUserIds.has(String(currentUserId)) ? onlineUserIds.size : onlineUserIds.size + 1,
      referralShares: referred.length + pendingReferralUses.length,
      referralRegistrations: referred.length,
      referralLogins: referred.filter((user) => Number(user.login_count || 0) > 0).length,
      referralPurchases: referred.filter((user) => user.payment_done).length,
    },
    referrals,
  };
}

function sessionTokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function issueSession(response, user) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = sessionTokenHash(token);
  const expiresAt = new Date(Date.now() + cookieLifetime);
  if (pool) {
    await pool.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
    await pool.query('INSERT INTO auth_sessions (token_hash, user_id, expires_at, last_seen_at) VALUES ($1, $2, $3, NOW())', [tokenHash, user.id, expiresAt]);
  } else {
    memorySessions.set(tokenHash, { userId: user.id, expiresAt, lastSeenAt: new Date() });
  }
  response.cookie(cookieName, token, { ...sessionCookieOptions, maxAge: cookieLifetime });
}

async function requireAuth(request, response, next) {
  const token = request.cookies[cookieName];
  if (!token) return response.status(401).json({ error: 'Sign in is required' });
  try {
    const tokenHash = sessionTokenHash(token);
    let session;
    if (pool) {
      const result = await pool.query('UPDATE auth_sessions SET last_seen_at = NOW() WHERE token_hash = $1 AND expires_at > NOW() RETURNING user_id', [tokenHash]);
      session = result.rows[0];
    } else {
      session = memorySessions.get(tokenHash);
      if (session && new Date(session.expiresAt).getTime() <= Date.now()) {
        memorySessions.delete(tokenHash);
        session = null;
      }
      if (session) session.lastSeenAt = new Date();
    }
    if (!session) {
      response.clearCookie(cookieName, sessionCookieOptions);
      return response.status(401).json({ error: 'Session is no longer valid' });
    }
    const user = await findUserById(session.user_id ?? session.userId);
    if (!user || !user.is_active) {
      if (pool) await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash]);
      else memorySessions.delete(tokenHash);
      response.clearCookie(cookieName, sessionCookieOptions);
      return response.status(401).json({ error: 'This account is inactive or the session is no longer valid' });
    }
    request.user = user;
    return next();
  } catch (error) {
    if (error.code) return next(error);
    response.clearCookie(cookieName, sessionCookieOptions);
    return response.status(401).json({ error: 'Session is no longer valid' });
  }
}

function requireAdmin(request, response, next) {
  if (request.user?.role !== 'admin') return response.status(403).json({ error: 'Admin access is required' });
  next();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function emailFrame({ preheader, eyebrow, title, recipientName, content, footer }) {
  const safeName = escapeHtml(recipientName || 'there');
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f7fc;color:#18314f;font-family:Arial,Helvetica,sans-serif">
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;color:transparent">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f7fc;padding:32px 12px"><tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e0e9f3;border-radius:10px;overflow:hidden">
        <tr><td style="padding:22px 30px;border-bottom:1px solid #e7eef6"><table role="presentation" cellspacing="0" cellpadding="0"><tr>
          <td align="center" valign="middle" width="38" height="39"><img src="cid:cyberclouds-logo" width="38" height="39" alt="CyberClouds" style="display:block;width:38px;height:39px;border-radius:8px"></td>
          <td style="padding-left:10px;color:#132a49;font-size:17px;font-weight:700;letter-spacing:-.3px">cyberclouds</td>
        </tr></table></td></tr>
        <tr><td style="padding:32px 30px 36px"><div style="color:#4185a6;font-size:10px;font-weight:700;letter-spacing:1.2px">${escapeHtml(eyebrow)}</div>
          <h1 style="margin:11px 0 14px;color:#142a47;font-size:27px;line-height:1.25;letter-spacing:-.5px">${escapeHtml(title)}</h1>
          <p style="margin:0 0 18px;color:#536a84;font-size:14px;line-height:1.7">Hi ${safeName},</p>
          ${content}
        </td></tr>
        <tr><td style="padding:17px 30px;border-top:1px solid #e7eef6;color:#8192a6;font-size:11px;line-height:1.6">${footer}</td></tr>
      </table><div style="padding:15px 8px;color:#91a0b2;font-size:10px">CYBERCLOUDS / PRIVATE KNOWLEDGE, CONNECTED SYSTEMS</div>
    </td></tr></table>
  </body></html>`;
}

function emailTransporter() {
  const settings = {
    host: process.env.BREVO_SMTP_HOST,
    port: process.env.BREVO_SMTP_PORT,
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
    from: process.env.MAIL_FROM,
  };
  const missing = Object.values(settings).filter((value) => !value?.trim());
  if (missing.length) {
    const error = new Error('Email delivery is temporarily unavailable. Please try again later.');
    error.statusCode = 503;
    throw error;
  }
  if (!sesTransporter) {
    const portNumber = Number(settings.port);
    if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
      const error = new Error('Email delivery is temporarily unavailable. Please try again later.');
      error.statusCode = 503;
      throw error;
    }
    sesTransporter = nodemailer.createTransport({
      host: settings.host,
      port: portNumber,
      secure: portNumber === 465,
      auth: { user: settings.user, pass: settings.pass },
    });
  }
  return sesTransporter;
}

function hasEmailSettings() {
  return [
    process.env.BREVO_SMTP_HOST,
    process.env.BREVO_SMTP_PORT,
    process.env.BREVO_SMTP_USER,
    process.env.BREVO_SMTP_PASS,
    process.env.MAIL_FROM,
  ].every((value) => value?.trim());
}

async function sendBrandedEmail({ to, subject, text, html }) {
  if (process.env.NODE_ENV !== 'production' && !hasEmailSettings()) {
    console.info(`Local email preview for ${to}:\nSubject: ${subject}\n\n${text}`);
    return;
  }
  try {
    await emailTransporter().sendMail({
      from: `CyberClouds <${process.env.MAIL_FROM}>`,
      to,
      subject,
      text,
      html,
      attachments: [{ filename: 'cyberclouds-email-logo.png', path: join(serverDir, '../assets/cyberclouds-email-logo.png'), cid: 'cyberclouds-logo' }],
    });
  } catch (cause) {
    if (cause.statusCode) throw cause;
    console.error('Transactional email delivery failed:', cause.code || 'unknown', cause.responseCode || 'no upstream status');
    const error = new Error('Email delivery is temporarily unavailable. Please try again later.');
    error.statusCode = 503;
    throw error;
  }
}

function signupCodeHash(email, code) {
  return createHash('sha256').update(`${signupSecret}:${email}:${code}`).digest('hex');
}

function passwordResetCodeHash(email, code) {
  return createHash('sha256').update(`${signupSecret}:password-reset:${email}:${code}`).digest('hex');
}

function hashesMatch(expected, supplied) {
  const expectedBuffer = Buffer.from(expected || '', 'hex');
  const suppliedBuffer = Buffer.from(supplied || '', 'hex');
  return expectedBuffer.length === suppliedBuffer.length && expectedBuffer.length > 0 && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

async function saveSignupVerification({ name, email, passwordHash, code, referredByUserId = null, termsAcceptedAt = null }) {
  const otpHash = signupCodeHash(email, code);
  const expiresAt = new Date(Date.now() + signupCodeLifetimeMs);
  if (pool) {
    await pool.query('DELETE FROM signup_verifications WHERE expires_at <= NOW()');
    await pool.query(`INSERT INTO signup_verifications (email, name, password_hash, otp_hash, referred_by_user_id, expires_at, attempts, terms_accepted_at)
      VALUES ($1, $2, $3, $4, $5, $6, 0, $7)
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash,
        otp_hash = EXCLUDED.otp_hash, referred_by_user_id = EXCLUDED.referred_by_user_id,
        expires_at = EXCLUDED.expires_at, attempts = 0,
        terms_accepted_at = COALESCE(EXCLUDED.terms_accepted_at, signup_verifications.terms_accepted_at)`, [email, name, passwordHash, otpHash, referredByUserId, expiresAt, termsAcceptedAt]);
  } else {
    for (const [pendingEmail, pending] of memorySignupVerifications) {
      if (new Date(pending.expires_at).getTime() <= Date.now()) memorySignupVerifications.delete(pendingEmail);
    }
    const previous = memorySignupVerifications.get(email);
    memorySignupVerifications.set(email, { name, email, password_hash: passwordHash, otp_hash: otpHash, referred_by_user_id: referredByUserId, terms_accepted_at: termsAcceptedAt || previous?.terms_accepted_at || null, expires_at: expiresAt, attempts: 0 });
  }
  return otpHash;
}

async function sendSignupVerification({ name, email, passwordHash, referredByUserId = null, termsAcceptedAt = null }) {
  const code = String(randomInt(100000, 1000000));
  const otpHash = await saveSignupVerification({ name, email, passwordHash, code, referredByUserId, termsAcceptedAt });
  const expiryText = '10 minutes';
  const html = emailFrame({
    preheader: 'Your CyberClouds signup verification code.',
    eyebrow: 'ACCOUNT SECURITY / EMAIL VERIFICATION',
    title: 'Verify your email',
    recipientName: name,
    content: `<p style="margin:0 0 18px;color:#536a84;font-size:14px;line-height:1.7">Enter this code on CyberClouds to finish creating your reader account.</p>
      <div style="display:inline-block;margin:0 0 19px;padding:13px 20px;border:1px solid #d8e6f2;border-radius:7px;background:#f5f9fd;color:#1551a2;font-size:30px;font-weight:700;letter-spacing:8px">${code}</div>
      <p style="margin:0;color:#788ba1;font-size:12px;line-height:1.7">This code expires in ${expiryText}. If you did not request an account, you can ignore this email.</p>`,
    footer: 'For your security, never share this verification code with anyone.',
  });
  try {
    await sendBrandedEmail({ to: email, subject: `${code} is your CyberClouds verification code`, text: `Hi ${name},\n\nYour CyberClouds verification code is ${code}. It expires in ${expiryText}.\n\nIf you did not request an account, ignore this email.`, html });
  } catch (error) {
    if (pool) await pool.query('DELETE FROM signup_verifications WHERE email = $1 AND otp_hash = $2', [email, otpHash]).catch(() => {});
    else if (memorySignupVerifications.get(email)?.otp_hash === otpHash) memorySignupVerifications.delete(email);
    throw error;
  }
}

async function storePasswordResetCode(email, code) {
  const otpHash = passwordResetCodeHash(email, code);
  const expiresAt = new Date(Date.now() + passwordResetCodeLifetimeMs);
  if (pool) {
    await pool.query('DELETE FROM password_reset_verifications WHERE expires_at <= NOW()');
    const result = await pool.query(`INSERT INTO password_reset_verifications (email, otp_hash, expires_at, attempts, last_sent_at)
      VALUES ($1, $2, $3, 0, NOW())
      ON CONFLICT (email) DO UPDATE SET otp_hash = EXCLUDED.otp_hash, expires_at = EXCLUDED.expires_at,
        attempts = 0, last_sent_at = NOW()
      WHERE password_reset_verifications.last_sent_at <= NOW() - INTERVAL '1 minute'
      RETURNING email`, [email, otpHash, expiresAt]);
    return result.rowCount ? otpHash : null;
  }
  const current = memoryPasswordResets.get(email);
  if (current && Date.now() - new Date(current.last_sent_at).getTime() < 60 * 1000) return null;
  memoryPasswordResets.set(email, { otp_hash: otpHash, expires_at: expiresAt, attempts: 0, last_sent_at: new Date() });
  return otpHash;
}

async function sendPasswordResetCode(email, code, otpHash) {
  const expiryText = '10 minutes';
  const html = emailFrame({
    preheader: 'Your CyberClouds password reset verification code.',
    eyebrow: 'ACCOUNT SECURITY / PASSWORD RESET',
    title: 'Reset your password',
    recipientName: 'there',
    content: `<p style="margin:0 0 18px;color:#536a84;font-size:14px;line-height:1.7">Enter this one-time code on CyberClouds to choose a new password.</p>
      <div style="display:inline-block;margin:0 0 19px;padding:13px 20px;border:1px solid #d8e6f2;border-radius:7px;background:#f5f9fd;color:#1551a2;font-size:30px;font-weight:700;letter-spacing:8px">${code}</div>
      <p style="margin:0;color:#788ba1;font-size:12px;line-height:1.7">This code expires in ${expiryText} and can only be used once. If you did not request a reset, ignore this email.</p>`,
    footer: 'For your security, never share this verification code with anyone.',
  });
  try {
    await sendBrandedEmail({
      to: email,
      subject: `${code} is your CyberClouds password reset code`,
      text: `Your CyberClouds password reset code is ${code}. It expires in ${expiryText} and can only be used once. If you did not request a reset, ignore this email.`,
      html,
    });
  } catch (error) {
    if (pool) await pool.query('DELETE FROM password_reset_verifications WHERE email = $1 AND otp_hash = $2', [email, otpHash]).catch(() => {});
    else if (memoryPasswordResets.get(email)?.otp_hash === otpHash) memoryPasswordResets.delete(email);
    console.error('Password reset email delivery failed:', error.statusCode || 'unavailable');
  }
}

async function sendPaymentConfirmation(user) {
  const libraryUrl = process.env.APP_URL || 'http://localhost:5173';
  const html = emailFrame({
    preheader: 'Your payment has been confirmed and all CyberClouds modules are unlocked.',
    eyebrow: 'PAYMENT / ACCESS CONFIRMED',
    title: 'Your modules are unlocked',
    recipientName: user.name,
    content: `<p style="margin:0 0 20px;color:#536a84;font-size:14px;line-height:1.7">Your payment has been confirmed. You can now explore every CyberClouds learning module and diagram.</p>
      <a href="${escapeHtml(libraryUrl)}" style="display:inline-block;padding:12px 18px;border-radius:4px;background:#1551a2;color:#fff;text-decoration:none;font-size:13px;font-weight:700">Open your library&nbsp; →</a>
      <p style="margin:19px 0 0;color:#788ba1;font-size:12px;line-height:1.7">If you are not signed in, you will be redirected to sign in before opening your library.</p>`,
    footer: 'Thank you for learning with CyberClouds.',
  });
  await sendBrandedEmail({
    to: user.email,
    subject: 'Payment confirmed — all CyberClouds modules are unlocked',
    text: `Hi ${user.name},\n\nYour payment has been confirmed. All CyberClouds modules are now unlocked. Open your library here: ${libraryUrl}\n\nIf you are not signed in, you will be redirected to sign in first.\n\nThank you for learning with CyberClouds.`,
    html,
  });
}

async function sendReferralRewardEmail(user) {
  const libraryUrl = process.env.APP_URL || 'http://localhost:5173';
  const html = emailFrame({
    preheader: 'Your referral reward is granted. All CyberClouds modules are unlocked.',
    eyebrow: 'REFERRAL / REWARD GRANTED',
    title: 'Your reward is granted',
    recipientName: user.name,
    content: `<p style="margin:0 0 20px;color:#536a84;font-size:14px;line-height:1.7">You successfully referred two learners whose payments were confirmed. Your referral reward is now granted, and you can access every CyberClouds module.</p><a href="${escapeHtml(libraryUrl)}" style="display:inline-block;padding:12px 18px;border-radius:4px;background:#1551a2;color:#fff;text-decoration:none;font-size:13px;font-weight:700">Open your library&nbsp; →</a>`,
    footer: 'Thank you for sharing CyberClouds.',
  });
  await sendBrandedEmail({
    to: user.email,
    subject: 'Referral reward granted — all CyberClouds modules unlocked',
    text: `Hi ${user.name},\n\nYour referral reward is granted. Two learners who used your referral have confirmed payments, so you can now access all CyberClouds modules. Open your library: ${libraryUrl}\n\nThank you for sharing CyberClouds.`,
    html,
  });
}

app.get('/api/health', async (_request, response) => {
  if (!pool) return response.json({ status: 'ok', database: 'demo-memory' });
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch {
    response.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.post('/api/auth/signup', signupLimiter, async (request, response, next) => {
  const { name, email, password } = request.body;
  if (request.body.termsAccepted !== true && request.body.termsAccepted !== 'true') return response.status(400).json({ error: 'Please agree to the Terms and Conditions and Privacy Policy' });
  const referralCode = typeof request.body.referralCode === 'string' ? request.body.referralCode.trim().toUpperCase() : '';
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    return response.status(400).json({ error: 'Enter a name between 2 and 100 characters' });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return response.status(400).json({ error: 'Enter a valid email address' });
  }
  if (!isStrongPassword(password)) {
    return response.status(400).json({ error: 'Use at least 8 characters with uppercase, lowercase, a number, and a special character' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  try {
    if (await findUserByEmail(normalizedEmail)) return response.status(409).json({ error: 'An account with this email already exists' });
    let referredByUserId = null;
    if (referralCode) {
      if (!/^[A-F0-9]{10}$/.test(referralCode)) return response.status(400).json({ error: 'Enter a valid referral code' });
      const referrer = await findReferrerByCode(referralCode);
      if (!referrer) return response.status(400).json({ error: 'That referral code is not valid' });
      referredByUserId = referrer.id;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await sendSignupVerification({ name: name.trim(), email: normalizedEmail, passwordHash, referredByUserId, termsAcceptedAt: new Date() });
    response.status(202).json({ verificationRequired: true, email: normalizedEmail });
  } catch (error) { next(error); }
});

app.post('/api/auth/resend-signup-code', signupVerificationLimiter, async (request, response, next) => {
  const { email } = request.body;
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return response.status(400).json({ error: 'Enter a valid email address' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  try {
    if (await findUserByEmail(normalizedEmail)) return response.status(409).json({ error: 'An account with this email already exists' });
    let pending;
    if (pool) {
      const result = await pool.query('SELECT name, password_hash, referred_by_user_id, terms_accepted_at FROM signup_verifications WHERE email = $1', [normalizedEmail]);
      pending = result.rows[0];
    } else {
      pending = memorySignupVerifications.get(normalizedEmail);
    }
    if (!pending) return response.status(404).json({ error: 'No pending signup was found. Start again to request a verification code.' });
    await sendSignupVerification({ name: pending.name, email: normalizedEmail, passwordHash: pending.password_hash, referredByUserId: pending.referred_by_user_id, termsAcceptedAt: pending.terms_accepted_at || null });
    response.status(202).json({ verificationRequired: true, email: normalizedEmail });
  } catch (error) { next(error); }
});

app.post('/api/auth/verify-signup', signupVerificationLimiter, async (request, response, next) => {
  const { email, code } = request.body;
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return response.status(400).json({ error: 'Enter a valid email address' });
  }
  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) return response.status(400).json({ error: 'Enter the 6-digit verification code' });
  const normalizedEmail = email.trim().toLowerCase();
  const suppliedHash = signupCodeHash(normalizedEmail, code.trim());
  try {
    let user;
    const referralCode = await createReferralCode();
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await client.query('SELECT name, password_hash, otp_hash, referred_by_user_id, terms_accepted_at, expires_at, attempts FROM signup_verifications WHERE email = $1 FOR UPDATE', [normalizedEmail]);
        const pending = result.rows[0];
        if (!pending) {
          await client.query('ROLLBACK');
          return response.status(400).json({ error: 'No pending signup was found. Start again to request a code.' });
        }
        if (new Date(pending.expires_at).getTime() <= Date.now()) {
          await client.query('COMMIT');
          return response.status(410).json({ error: 'That code has expired. Request a new one to continue.' });
        }
        if (pending.attempts >= maxSignupCodeAttempts) {
          await client.query('COMMIT');
          return response.status(429).json({ error: 'Too many incorrect codes. Request a new verification code.' });
        }
        if (!hashesMatch(pending.otp_hash, suppliedHash)) {
          const attemptsResult = await client.query('UPDATE signup_verifications SET attempts = attempts + 1 WHERE email = $1 RETURNING attempts', [normalizedEmail]);
          await client.query('COMMIT');
          const error = attemptsResult.rows[0].attempts >= maxSignupCodeAttempts
            ? 'Too many incorrect codes. Request a new verification code.'
            : 'That verification code is incorrect. Check it and try again.';
          return response.status(attemptsResult.rows[0].attempts >= maxSignupCodeAttempts ? 429 : 400).json({ error });
        }
        const existing = await client.query('SELECT id FROM app_users WHERE email = $1', [normalizedEmail]);
        if (existing.rowCount) {
          await client.query('DELETE FROM signup_verifications WHERE email = $1', [normalizedEmail]);
          await client.query('COMMIT');
          return response.status(409).json({ error: 'An account with this email already exists' });
        }
        const created = await client.query(`INSERT INTO app_users (name, email, password_hash, role, is_active, payment_done, referral_code, referred_by_user_id, terms_accepted_at)
          VALUES ($1, $2, $3, 'user', TRUE, FALSE, $4, $5, $6)
          RETURNING id, name, email, role, is_active, payment_done, referral_code, referral_rewarded, referred_by_user_id`, [pending.name, normalizedEmail, pending.password_hash, referralCode, pending.referred_by_user_id, pending.terms_accepted_at || new Date()]);
        await client.query('DELETE FROM signup_verifications WHERE email = $1', [normalizedEmail]);
        await client.query('COMMIT');
        user = created.rows[0];
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    } else {
      const pending = memorySignupVerifications.get(normalizedEmail);
      if (!pending) return response.status(400).json({ error: 'No pending signup was found. Start again to request a code.' });
      if (new Date(pending.expires_at).getTime() <= Date.now()) {
        return response.status(410).json({ error: 'That code has expired. Request a new one to continue.' });
      }
      if (pending.attempts >= maxSignupCodeAttempts) return response.status(429).json({ error: 'Too many incorrect codes. Request a new verification code.' });
      if (!hashesMatch(pending.otp_hash, suppliedHash)) {
        pending.attempts += 1;
        const locked = pending.attempts >= maxSignupCodeAttempts;
        return response.status(locked ? 429 : 400).json({ error: locked ? 'Too many incorrect codes. Request a new verification code.' : 'That verification code is incorrect. Check it and try again.' });
      }
      if (await findUserByEmail(normalizedEmail)) {
        memorySignupVerifications.delete(normalizedEmail);
        return response.status(409).json({ error: 'An account with this email already exists' });
      }
      user = { id: nextMemoryUserId++, name: pending.name, email: normalizedEmail, password_hash: pending.password_hash, role: 'user', is_active: true, payment_done: false, referral_code: referralCode, referral_rewarded: false, referred_by_user_id: pending.referred_by_user_id, terms_accepted_at: pending.terms_accepted_at || new Date() };
      memoryUsers.push(user);
      memorySignupVerifications.delete(normalizedEmail);
    }
    await issueSession(response, user);
    response.status(201).json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

app.post('/api/auth/login', loginIpLimiter, loginLimiter, async (request, response, next) => {
  const { email, password } = request.body;
  if (typeof email !== 'string' || typeof password !== 'string') return response.status(400).json({ error: 'Email and password are required' });
  try {
    const user = await findUserByEmail(email.trim().toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return response.status(401).json({ error: 'Email or password is incorrect' });
    if (!user.is_active) return response.status(403).json({ error: 'This account is inactive. Contact an administrator.' });
    if (pool) await pool.query('UPDATE app_users SET login_count = login_count + 1, last_login_at = NOW() WHERE id = $1', [user.id]);
    else user.login_count = Number(user.login_count || 0) + 1;
    await issueSession(response, user);
    response.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

app.post('/api/auth/forgot-password', passwordResetRequestLimiter, async (request, response, next) => {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return response.status(400).json({ error: 'Enter a valid email address' });
  }
  const requestStartedAt = Date.now();
  try {
    const account = await findUserByEmail(email);
    if (!account?.is_active) return response.status(404).json({ error: 'Account or email is invalid. Check the email address and try again.' });
    const code = String(randomInt(100000, 1000000));
    const otpHash = await storePasswordResetCode(email, code);
    if (otpHash) void sendPasswordResetCode(email, code, otpHash).catch(() => {});
    const remainingDelay = 300 - (Date.now() - requestStartedAt);
    if (remainingDelay > 0) await new Promise((resolve) => setTimeout(resolve, remainingDelay));
    response.status(202).json({ message: 'A verification code will arrive shortly.' });
  } catch (error) { next(error); }
});

app.post('/api/auth/reset-password', passwordResetVerifyLimiter, async (request, response, next) => {
  const { code, newPassword } = request.body || {};
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return response.status(400).json({ error: 'Enter a valid email address' });
  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) return response.status(400).json({ error: 'Enter the 6-digit email code' });
  if (!isStrongPassword(newPassword)) return response.status(400).json({ error: 'Use at least 8 characters with uppercase, lowercase, a number, and a special character' });
  const suppliedHash = passwordResetCodeHash(email, code.trim());
  try {
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await client.query('SELECT otp_hash, expires_at, attempts FROM password_reset_verifications WHERE email = $1 FOR UPDATE', [email]);
        const reset = result.rows[0];
        if (!reset) {
          await client.query('ROLLBACK');
          return response.status(400).json({ error: 'The code is invalid or expired. Request a new one.' });
        }
        if (new Date(reset.expires_at).getTime() <= Date.now()) {
          await client.query('DELETE FROM password_reset_verifications WHERE email = $1', [email]);
          await client.query('COMMIT');
          return response.status(400).json({ error: 'The code is invalid or expired. Request a new one.' });
        }
        if (reset.attempts >= maxSignupCodeAttempts) {
          await client.query('COMMIT');
          return response.status(400).json({ error: 'The code is invalid or expired. Request a new one.' });
        }
        if (!hashesMatch(reset.otp_hash, suppliedHash)) {
          await client.query('UPDATE password_reset_verifications SET attempts = attempts + 1 WHERE email = $1', [email]);
          await client.query('COMMIT');
          return response.status(400).json({ error: 'The code is invalid or expired. Request a new one.' });
        }
        const accountResult = await client.query('SELECT id, password_hash, is_active FROM app_users WHERE email = $1 FOR UPDATE', [email]);
        const account = accountResult.rows[0];
        if (!account?.is_active) {
          await client.query('DELETE FROM password_reset_verifications WHERE email = $1', [email]);
          await client.query('COMMIT');
          return response.status(400).json({ error: 'The code is invalid or expired. Request a new one.' });
        }
        if (await bcrypt.compare(newPassword, account.password_hash)) {
          await client.query('COMMIT');
          return response.status(400).json({ error: 'Choose a password different from your current password' });
        }
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await client.query('UPDATE app_users SET password_hash = $1 WHERE id = $2', [passwordHash, account.id]);
        await client.query('DELETE FROM password_reset_verifications WHERE email = $1', [email]);
        await client.query('DELETE FROM auth_sessions WHERE user_id = $1', [account.id]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    } else {
      const reset = memoryPasswordResets.get(email);
      if (!reset) return response.status(400).json({ error: 'The code is invalid or expired. Request a new one.' });
      if (new Date(reset.expires_at).getTime() <= Date.now()) {
        memoryPasswordResets.delete(email);
        return response.status(400).json({ error: 'The code is invalid or expired. Request a new one.' });
      }
      if (reset.attempts >= maxSignupCodeAttempts) return response.status(400).json({ error: 'The code is invalid or expired. Request a new one.' });
      if (!hashesMatch(reset.otp_hash, suppliedHash)) {
        reset.attempts += 1;
        return response.status(400).json({ error: 'The code is invalid or expired. Request a new one.' });
      }
      const account = memoryUsers.find((user) => user.email === email && user.is_active);
      if (!account) {
        memoryPasswordResets.delete(email);
        return response.status(400).json({ error: 'The code is invalid or expired. Request a new one.' });
      }
      if (await bcrypt.compare(newPassword, account.password_hash)) return response.status(400).json({ error: 'Choose a password different from your current password' });
      account.password_hash = await bcrypt.hash(newPassword, 12);
      memoryPasswordResets.delete(email);
      for (const [tokenHash, session] of memorySessions) {
        if (String(session.userId) === String(account.id)) memorySessions.delete(tokenHash);
      }
    }
    response.clearCookie(cookieName, sessionCookieOptions);
    response.json({ ok: true, message: 'Password updated. Sign in with your new password.' });
  } catch (error) { next(error); }
});

app.post('/api/auth/logout', async (request, response, next) => {
  const token = request.cookies[cookieName];
  if (token) {
    const tokenHash = sessionTokenHash(token);
    try {
      if (pool) await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash]);
      else memorySessions.delete(tokenHash);
    } catch (error) { return next(error); }
  }
  response.clearCookie(cookieName, sessionCookieOptions);
  response.status(204).end();
});

app.get('/api/auth/me', requireAuth, (request, response) => response.json({ user: publicUser(request.user), demo: !pool }));

app.post('/api/auth/heartbeat', requireAuth, (_request, response) => response.status(204).end());

app.post('/api/feedback', requireAuth, async (request, response, next) => {
  const { rating, comment = '' } = request.body;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return response.status(400).json({ error: 'Choose a rating from 1 to 5' });
  if (typeof comment !== 'string' || comment.length > 1000) return response.status(400).json({ error: 'Feedback must be shorter than 1000 characters' });
  try {
    if (pool) await pool.query('INSERT INTO experience_feedback (user_id, rating, comment) VALUES ($1, $2, $3)', [request.user.id, rating, comment.trim()]);
    else memoryFeedback.push({ userId: request.user.id, rating, comment: comment.trim(), createdAt: new Date().toISOString() });
    response.status(201).json({ saved: true });
  } catch (error) { next(error); }
});

app.get('/api/referrals/me', requireAuth, async (request, response, next) => {
  try { response.json({ referral: await getReferralStats(request.user.id) }); }
  catch (error) { next(error); }
});

app.post('/api/referrals/claim', requireAuth, async (request, response, next) => {
  if (request.user.role !== 'user') return response.status(403).json({ error: 'Referral rewards are available to reader accounts only.' });
  if (request.user.referral_rewarded) return response.status(409).json({ error: 'Your referral reward has already been granted.' });
  try {
    let account;
    if (pool) {
    const result = await pool.query(`UPDATE app_users AS owner SET referral_rewarded = TRUE, referral_rewarded_at = NOW()
        WHERE owner.id = $1 AND owner.role = 'user' AND owner.referral_rewarded = FALSE
          AND (SELECT COUNT(*) FROM app_users AS referred WHERE referred.referred_by_user_id = owner.id AND referred.role = 'user' AND referred.payment_done = TRUE) >= 2
        RETURNING id, name, email, role, is_active, payment_done, referral_code, referral_rewarded`, [request.user.id]);
      account = result.rows[0];
    } else {
      account = memoryUsers.find((user) => String(user.id) === String(request.user.id));
      if (account && !account.referral_rewarded && await getReferralEligibility(request.user.id)) {
        account.referral_rewarded = true;
        account.referral_rewarded_at = new Date();
      } else account = null;
    }
    if (!account) return (await getReferralEligibility(request.user.id))
      ? response.status(409).json({ error: 'Your referral reward has already been granted.' })
      : response.status(400).json({ error: 'Refer two learners and wait for both payments to be confirmed before claiming your reward.' });
    try {
      await sendReferralRewardEmail(account);
      response.json({ user: publicUser(account), emailSent: true, message: 'Reward granted. All modules are now unlocked.' });
    } catch (emailError) {
      console.error('Referral reward email delivery failed:', emailError.statusCode || 'unavailable');
      response.json({ user: publicUser(account), emailSent: false, message: 'Reward granted and all modules unlocked, but the email could not be sent. Contact an administrator to retry.' });
    }
  } catch (error) { next(error); }
});

app.patch('/api/profile', requireAuth, async (request, response, next) => {
  const { name } = request.body;
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) return response.status(400).json({ error: 'Name must be between 2 and 100 characters' });
  try {
    if (pool) {
      const result = await pool.query('UPDATE app_users SET name = $1 WHERE id = $2 RETURNING id, name, email, role, is_active, payment_done, referral_code, referral_rewarded', [name.trim(), request.user.id]);
      return response.json({ user: publicUser(result.rows[0]) });
    }
    request.user.name = name.trim();
    response.json({ user: publicUser(request.user) });
  } catch (error) { next(error); }
});

app.patch('/api/profile/password', requireAuth, async (request, response, next) => {
  const { currentPassword, newPassword } = request.body;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') return response.status(400).json({ error: 'Enter your current and new password' });
  if (!isStrongPassword(newPassword)) return response.status(400).json({ error: 'Use at least 8 characters with uppercase, lowercase, a number, and a special character' });
  try {
    const user = pool ? await findUserByEmail(request.user.email) : request.user;
    if (!(await bcrypt.compare(currentPassword, user.password_hash))) return response.status(403).json({ error: 'Current password is incorrect' });
    if (await bcrypt.compare(newPassword, user.password_hash)) return response.status(400).json({ error: 'New password must be different from your current password' });
    const passwordHash = await bcrypt.hash(newPassword, 12);
    if (pool) {
      await pool.query('UPDATE app_users SET password_hash = $1 WHERE id = $2', [passwordHash, request.user.id]);
      await pool.query('DELETE FROM auth_sessions WHERE user_id = $1', [request.user.id]);
    }
    else request.user.password_hash = passwordHash;
    await issueSession(response, request.user);
    response.json({ ok: true });
  } catch (error) { next(error); }
});

async function listSections() {
  if (pool) {
    const result = await pool.query(`SELECT c.id, c.slug, c.name, c.color, c.sort_order,
        d.id AS document_id, d.title AS document_title, d.source_name, d.kind
      FROM categories c LEFT JOIN content_documents d ON d.section_id = c.id
      ORDER BY c.sort_order, d.sort_order, d.title`);
    const sections = new Map();
    for (const row of result.rows) {
      if (!sections.has(row.slug)) sections.set(row.slug, { id: row.id, slug: row.slug, name: row.name, color: row.color, icon: categories.find((item) => item.slug === row.slug)?.icon || 'book', documents: [] });
      if (row.document_id) sections.get(row.slug).documents.push({ id: row.document_id, title: row.document_title, sourceName: row.source_name, kind: row.kind });
    }
    return [...sections.values()];
  }
  return categories.map((category) => ({
    ...category,
    documents: allDocuments.filter((document) => document.sectionSlug === category.slug).map(({ id, title, sourceName, kind }) => ({ id, title, sourceName, kind })),
  }));
}

async function getDocument(id) {
  if (pool) {
    const result = await pool.query(`SELECT d.id, d.title, d.source_name AS "sourceName", d.kind, d.content, c.slug AS "sectionSlug"
      FROM content_documents d JOIN categories c ON c.id = d.section_id WHERE d.id = $1`, [id]);
    return result.rows[0] || null;
  }
  return findDocument(id) || null;
}

async function canAccessDocument(user, document) {
  if (user.role === 'admin' || user.payment_done || user.referral_rewarded) return true;
  const sections = await listSections();
  return sections[0]?.slug === document.sectionSlug;
}

function makeSlug(value) {
  return value.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
}

function validateSectionInput(request, response) {
  const { name } = request.body;
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
    response.status(400).json({ error: 'Module name must be between 2 and 80 characters' });
    return null;
  }
  const slug = makeSlug(name);
  if (!slug) {
    response.status(400).json({ error: 'Module name must include letters or numbers' });
    return null;
  }
  return { name: name.trim(), slug };
}

function validateDocumentInput(request, response) {
  const { title, content, sourceName = '', kind = 'document' } = request.body;
  if (typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 180) {
    response.status(400).json({ error: 'Title must be between 2 and 180 characters' });
    return null;
  }
  if (typeof content !== 'string' || content.length > 4_000_000) {
    response.status(400).json({ error: 'Content must be text shorter than 4 MB' });
    return null;
  }
  if (typeof sourceName !== 'string' || sourceName.length > 180 || !['document', 'diagram'].includes(kind)) {
    response.status(400).json({ error: 'Invalid source name or content type' });
    return null;
  }
  return { title: title.trim(), content, sourceName: sourceName.trim(), kind };
}

app.get('/api/content/sections', requireAuth, async (_request, response, next) => {
  try {
    response.json({ sections: await listSections() });
  } catch (error) { next(error); }
});

app.get('/api/content/:id', requireAuth, async (request, response, next) => {
  const document = await getDocument(request.params.id).catch(next);
  if (!document) return response.status(404).json({ error: 'Content not found' });
  if (!(await canAccessDocument(request.user, document))) return response.status(403).json({ error: 'Complete payment to access all modules' });
  try {
    if (document.kind === 'diagram') {
      response.type('image/svg+xml').send(document.content);
      return;
    }
    const text = await readCorrectedText(document);
    response.json({ id: document.id, title: document.title, sourceName: document.sourceName, text });
  } catch (error) { next(error); }
});

app.get('/api/content/:id/source', requireAuth, async (request, response, next) => {
  const document = await getDocument(request.params.id).catch(next);
  if (!document) return response.status(404).json({ error: 'Content not found' });
  if (!(await canAccessDocument(request.user, document))) return response.status(403).json({ error: 'Complete payment to access all modules' });
  try {
    if (document.kind !== 'diagram') {
      const text = await readCorrectedText(document);
      response.type('text/plain').attachment(`${makeSlug(document.title) || 'content'}.txt`).send(text);
      return;
    }
    response.type('image/svg+xml').attachment(`${makeSlug(document.title) || 'diagram'}.svg`).send(document.content);
  } catch (error) { next(error); }
});

app.get('/api/admin/content', requireAuth, requireAdmin, async (_request, response, next) => {
  try {
    const sections = await listSections();
    if (!pool) return response.json({ sections, documents: allDocuments });
    const result = await pool.query(`SELECT d.id, c.slug AS "sectionSlug", d.title, d.source_name AS "sourceName", d.kind, d.content
      FROM content_documents d JOIN categories c ON c.id = d.section_id ORDER BY c.sort_order, d.sort_order, d.title`);
    response.json({ sections, documents: result.rows });
  } catch (error) { next(error); }
});

app.post('/api/admin/sections', requireAuth, requireAdmin, async (request, response, next) => {
  const value = validateSectionInput(request, response);
  if (!value) return;
  try {
    if (pool) {
      const result = await pool.query(`INSERT INTO categories (slug, name, color, sort_order) VALUES ($1, $2, 'blue', 99)
        RETURNING id, slug, name, color`, [value.slug, value.name]);
      return response.status(201).json({ section: result.rows[0] });
    }
    if (categories.some((section) => section.slug === value.slug)) return response.status(409).json({ error: 'A module with this name already exists' });
    const section = { ...value, icon: 'book', color: 'blue' };
    categories.push(section);
    contentBySection[section.slug] = [];
    response.status(201).json({ section });
  } catch (error) { next(error); }
});

app.patch('/api/admin/sections/:slug', requireAuth, requireAdmin, async (request, response, next) => {
  const value = validateSectionInput(request, response);
  if (!value) return;
  try {
    if (pool) {
      const result = await pool.query('UPDATE categories SET name = $1, slug = $2 WHERE slug = $3 RETURNING id, slug, name, color', [value.name, value.slug, request.params.slug]);
      if (!result.rowCount) return response.status(404).json({ error: 'Module not found' });
      return response.json({ section: result.rows[0] });
    }
    const section = categories.find((item) => item.slug === request.params.slug);
    if (!section) return response.status(404).json({ error: 'Module not found' });
    if (categories.some((item) => item.slug === value.slug && item !== section)) return response.status(409).json({ error: 'A module with this name already exists' });
    const oldSlug = section.slug;
    Object.assign(section, value);
    allDocuments.filter((document) => document.sectionSlug === oldSlug).forEach((document) => { document.sectionSlug = value.slug; });
    contentBySection[value.slug] = contentBySection[oldSlug] || [];
    delete contentBySection[oldSlug];
    response.json({ section });
  } catch (error) { next(error); }
});

app.delete('/api/admin/sections/:slug', requireAuth, requireAdmin, async (request, response, next) => {
  try {
    if (pool) {
      const result = await pool.query('DELETE FROM categories WHERE slug = $1 RETURNING slug', [request.params.slug]);
      if (!result.rowCount) return response.status(404).json({ error: 'Module not found' });
    } else {
      const index = categories.findIndex((section) => section.slug === request.params.slug);
      if (index < 0) return response.status(404).json({ error: 'Module not found' });
      categories.splice(index, 1);
      allDocuments = allDocuments.filter((document) => document.sectionSlug !== request.params.slug);
      delete contentBySection[request.params.slug];
    }
    response.status(204).end();
  } catch (error) { next(error); }
});

app.get('/api/admin/documents/:id', requireAuth, requireAdmin, async (request, response, next) => {
  try {
    const document = await getDocument(request.params.id);
    if (!document) return response.status(404).json({ error: 'Content not found' });
    response.json({ document });
  } catch (error) { next(error); }
});

app.post('/api/admin/sections/:slug/documents', requireAuth, requireAdmin, async (request, response, next) => {
  const value = validateDocumentInput(request, response);
  if (!value) return;
  try {
    const id = randomUUID();
    if (pool) {
      const result = await pool.query(`INSERT INTO content_documents (id, section_id, title, source_name, kind, content, sort_order)
        SELECT $1, id, $3, $4, $5, $6, 99 FROM categories WHERE slug = $2
        RETURNING id, title, source_name AS "sourceName", kind, content`, [id, request.params.slug, value.title, value.sourceName, value.kind, value.content]);
      if (!result.rowCount) return response.status(404).json({ error: 'Module not found' });
      return response.status(201).json({ document: { ...result.rows[0], sectionSlug: request.params.slug } });
    }
    if (!categories.some((section) => section.slug === request.params.slug)) return response.status(404).json({ error: 'Module not found' });
    const document = { id, sectionSlug: request.params.slug, ...value };
    allDocuments.push(document);
    contentBySection[request.params.slug].push(document);
    response.status(201).json({ document });
  } catch (error) { next(error); }
});

app.patch('/api/admin/documents/:id', requireAuth, requireAdmin, async (request, response, next) => {
  const value = validateDocumentInput(request, response);
  if (!value) return;
  const { sectionSlug } = request.body;
  if (sectionSlug !== undefined && (typeof sectionSlug !== 'string' || !pool && !categories.some((item) => item.slug === sectionSlug))) {
    return response.status(400).json({ error: 'Choose a valid module' });
  }
  try {
    if (pool) {
      const result = await pool.query(`UPDATE content_documents d SET section_id = c.id, title = $1, source_name = $2,
          kind = $3, content = $4, updated_at = NOW()
        FROM categories c WHERE d.id = $5 AND c.slug = COALESCE($6, (SELECT current.slug FROM categories current WHERE current.id = d.section_id))
        RETURNING d.id, c.slug AS "sectionSlug", d.title, d.source_name AS "sourceName", d.kind, d.content`,
      [value.title, value.sourceName, value.kind, value.content, request.params.id, sectionSlug || null]);
      if (!result.rowCount) return response.status(404).json({ error: 'Content or module not found' });
      return response.json({ document: result.rows[0] });
    }
    const document = findDocument(request.params.id);
    if (!document) return response.status(404).json({ error: 'Content not found' });
    const oldSection = document.sectionSlug;
    Object.assign(document, value, { sectionSlug: sectionSlug || oldSection });
    if (oldSection !== document.sectionSlug) {
      contentBySection[oldSection] = contentBySection[oldSection].filter((item) => item.id !== document.id);
      contentBySection[document.sectionSlug].push(document);
    }
    response.json({ document });
  } catch (error) { next(error); }
});

app.delete('/api/admin/documents/:id', requireAuth, requireAdmin, async (request, response, next) => {
  try {
    if (pool) {
      const result = await pool.query('DELETE FROM content_documents WHERE id = $1 RETURNING id', [request.params.id]);
      if (!result.rowCount) return response.status(404).json({ error: 'Content not found' });
    } else {
      const document = findDocument(request.params.id);
      if (!document) return response.status(404).json({ error: 'Content not found' });
      allDocuments = allDocuments.filter((item) => item.id !== document.id);
      contentBySection[document.sectionSlug] = contentBySection[document.sectionSlug].filter((item) => item.id !== document.id);
    }
    response.status(204).end();
  } catch (error) { next(error); }
});

app.get('/api/content/:id', requireAuth, async (request, response, next) => {
  const document = await getDocument(request.params.id).catch(next);
  if (!document) return response.status(404).json({ error: 'Content not found' });
  try {
    if (document.kind === 'diagram') return response.type('image/svg+xml').send(document.content);
    response.json({ id: document.id, title: document.title, sourceName: document.sourceName, text: await readCorrectedText(document) });
  } catch (error) { next(error); }
});

app.get('/api/content/:id/source', requireAuth, async (request, response, next) => {
  const document = await getDocument(request.params.id).catch(next);
  if (!document) return response.status(404).json({ error: 'Content not found' });
  try {
    if (document.kind !== 'diagram') return response.type('text/plain').attachment(`${makeSlug(document.title) || 'content'}.txt`).send(await readCorrectedText(document));
    response.type('image/svg+xml').attachment(`${makeSlug(document.title) || 'diagram'}.svg`).send(document.content);
  } catch (error) { next(error); }
});
app.get('/api/admin/users', requireAuth, requireAdmin, async (request, response, next) => {
  try {
    const now = Date.now();
    const memoryOnlineIds = new Set([...memorySessions.values()]
      .filter((session) => new Date(session.expiresAt).getTime() > now && now - new Date(session.lastSeenAt || 0).getTime() < onlinePresenceWindowMs)
      .map((session) => String(session.userId)));
    const [result, referralSummary] = await Promise.all([
      pool
        ? pool.query(`SELECT account.id, account.name, account.email, account.role, account.is_active, account.payment_done,
            account.referral_rewarded, account.created_at,
            EXISTS (SELECT 1 FROM auth_sessions active_session
              WHERE active_session.user_id = account.id AND active_session.expires_at > NOW()
                AND active_session.last_seen_at > NOW() - INTERVAL '5 minutes') AS is_online
          FROM app_users account ORDER BY account.created_at, account.id`)
        : Promise.resolve({ rows: memoryUsers.map(({ password_hash: _hash, ...user }) => ({ ...user, is_online: Boolean(user.is_active && memoryOnlineIds.has(String(user.id))) })) }),
      getAdminReferralSummary(request.user.id),
    ]);
    response.json({
      users: result.rows.map((row) => ({ ...publicUser(row), isOnline: Boolean(row.is_active && (row.is_online || String(row.id) === String(request.user.id))), createdAt: row.created_at || row.createdAt })),
      ...referralSummary,
    });
  } catch (error) { next(error); }
});

app.patch('/api/admin/users/:id/payment', requireAuth, requireAdmin, async (request, response, next) => {
  const { paymentDone } = request.body;
  if (typeof paymentDone !== 'boolean') return response.status(400).json({ error: 'paymentDone must be true or false' });
  try {
    let account;
    let referralRewardGrantedTo = null;
    if (pool) {
      const result = await pool.query('UPDATE app_users SET payment_done = $1 WHERE id = $2 RETURNING id, name, email, role, is_active, payment_done, referral_rewarded, referral_code, referred_by_user_id', [paymentDone, request.params.id]);
      if (!result.rowCount) return response.status(404).json({ error: 'User not found' });
      account = result.rows[0];
    } else {
      account = memoryUsers.find((item) => String(item.id) === String(request.params.id));
      if (!account) return response.status(404).json({ error: 'User not found' });
      account.payment_done = paymentDone;
    }
    if (paymentDone) {
      if (account.referred_by_user_id && await getReferralEligibility(account.referred_by_user_id)) {
        const referrer = await findUserById(account.referred_by_user_id);
        if (referrer && !referrer.referral_rewarded) referralRewardGrantedTo = { id: referrer.id, name: referrer.name, email: referrer.email, rewardEligible: true };
      }
    }
    if (!paymentDone) return response.json({ user: publicUser(account), emailSent: false, referralRewardGrantedTo });
    try {
      await sendPaymentConfirmation(account);
      response.json({ user: publicUser(account), emailSent: true, referralRewardGrantedTo });
    } catch (emailError) {
      console.error('Payment confirmation email delivery failed:', emailError.statusCode || 'unavailable');
      response.json({
        user: publicUser(account),
        emailSent: false,
        referralRewardGrantedTo,
      message: 'Payment was marked complete, but the confirmation email could not be sent. Please retry later.',
      });
    }
  } catch (error) { next(error); }
});

app.patch('/api/admin/users/:id/active', requireAuth, requireAdmin, async (request, response, next) => {
  const { isActive } = request.body;
  if (typeof isActive !== 'boolean') return response.status(400).json({ error: 'isActive must be true or false' });
  if (!isActive && String(request.params.id) === String(request.user.id)) return response.status(400).json({ error: 'You cannot deactivate your own account' });
  try {
    if (pool) {
      const target = await pool.query('SELECT role, is_active FROM app_users WHERE id = $1', [request.params.id]);
      if (!target.rowCount) return response.status(404).json({ error: 'User not found' });
      if (!isActive && target.rows[0].role === 'admin' && target.rows[0].is_active) {
        const admins = await pool.query("SELECT COUNT(*)::int AS count FROM app_users WHERE role = 'admin' AND is_active = TRUE");
        if (admins.rows[0].count <= 1) return response.status(409).json({ error: 'At least one active admin account must remain' });
      }
      const result = await pool.query('UPDATE app_users SET is_active = $1 WHERE id = $2 RETURNING id, name, email, role, is_active', [isActive, request.params.id]);
      return response.json({ user: publicUser(result.rows[0]) });
    }
    const target = memoryUsers.find((item) => String(item.id) === String(request.params.id));
    if (!target) return response.status(404).json({ error: 'User not found' });
    if (!isActive && target.role === 'admin' && target.is_active && memoryUsers.filter((item) => item.role === 'admin' && item.is_active).length <= 1) return response.status(409).json({ error: 'At least one active admin account must remain' });
    target.is_active = isActive;
    response.json({ user: publicUser(target) });
  } catch (error) { next(error); }
});

app.patch('/api/admin/users/:id/role', requireAuth, requireAdmin, async (request, response, next) => {
  const { role } = request.body;
  if (!['admin', 'user'].includes(role)) return response.status(400).json({ error: 'Role must be admin or user' });
  if (String(request.params.id) === String(request.user.id)) return response.status(400).json({ error: 'You cannot change your own role' });
  try {
    let user;
    if (pool) {
      const currentResult = await pool.query('SELECT id, role FROM app_users WHERE id = $1', [request.params.id]);
      const current = currentResult.rows[0];
      if (!current) return response.status(404).json({ error: 'User not found' });
      if (current.role === 'admin' && role === 'user') {
        const admins = await pool.query("SELECT COUNT(*)::int AS count FROM app_users WHERE role = 'admin' AND is_active = TRUE");
        if (admins.rows[0].count <= 1) return response.status(409).json({ error: 'At least one active admin account must remain' });
      }
      const result = await pool.query('UPDATE app_users SET role = $1 WHERE id = $2 RETURNING id, name, email, role', [role, request.params.id]);
      user = result.rows[0];
      if (!user) return response.status(404).json({ error: 'User not found' });
    } else {
      user = memoryUsers.find((item) => String(item.id) === String(request.params.id));
      if (!user) return response.status(404).json({ error: 'User not found' });
      if (user.role === 'admin' && role === 'user' && memoryUsers.filter((item) => item.role === 'admin').length <= 1) {
        return response.status(409).json({ error: 'At least one admin account must remain' });
      }
      user.role = role;
    }
    response.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

app.patch('/api/admin/users/:id', requireAuth, requireAdmin, async (request, response, next) => {
  const { name, email } = request.body;
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) return response.status(400).json({ error: 'Name must be between 2 and 100 characters' });
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return response.status(400).json({ error: 'Enter a valid email address' });
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (pool) {
      const result = await pool.query('UPDATE app_users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, role, is_active, payment_done', [name.trim(), normalizedEmail, request.params.id]);
      if (!result.rowCount) return response.status(404).json({ error: 'User not found' });
      return response.json({ user: publicUser(result.rows[0]) });
    }
    const user = memoryUsers.find((item) => String(item.id) === String(request.params.id));
    if (!user) return response.status(404).json({ error: 'User not found' });
    if (memoryUsers.some((item) => item.email === normalizedEmail && item.id !== user.id)) return response.status(409).json({ error: 'An account with this email already exists' });
    user.name = name.trim();
    user.email = normalizedEmail;
    response.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (request, response, next) => {
  if (String(request.params.id) === String(request.user.id)) return response.status(400).json({ error: 'You cannot delete your own account' });
  try {
    if (pool) {
      const target = await pool.query('SELECT role FROM app_users WHERE id = $1', [request.params.id]);
      if (!target.rowCount) return response.status(404).json({ error: 'User not found' });
      if (target.rows[0].role === 'admin') {
        const admins = await pool.query("SELECT COUNT(*)::int AS count FROM app_users WHERE role = 'admin'");
        if (admins.rows[0].count <= 1) return response.status(409).json({ error: 'At least one admin account must remain' });
      }
      await pool.query('DELETE FROM app_users WHERE id = $1', [request.params.id]);
    } else {
      const index = memoryUsers.findIndex((item) => String(item.id) === String(request.params.id));
      if (index < 0) return response.status(404).json({ error: 'User not found' });
      if (memoryUsers[index].role === 'admin' && memoryUsers.filter((item) => item.role === 'admin').length <= 1) return response.status(409).json({ error: 'At least one admin account must remain' });
      memoryUsers.splice(index, 1);
    }
    response.status(204).end();
  } catch (error) { next(error); }
});

app.post('/api/admin/users', requireAuth, requireAdmin, async (request, response, next) => {
  const { name, email, password } = request.body;
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) return response.status(400).json({ error: 'Name must be between 2 and 100 characters' });
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return response.status(400).json({ error: 'Enter a valid email address' });
  if (!isStrongPassword(password)) return response.status(400).json({ error: 'Use at least 8 characters with uppercase, lowercase, a number, and a special character' });
  const normalizedEmail = email.trim().toLowerCase();
  try {
    if (await findUserByEmail(normalizedEmail)) return response.status(409).json({ error: 'An account with this email already exists' });
    const passwordHash = await bcrypt.hash(password, 12);
    const referralCode = await createReferralCode();
    let account;
    if (pool) {
      const result = await pool.query(`INSERT INTO app_users (name, email, password_hash, role, is_active, payment_done, referral_code)
        VALUES ($1, $2, $3, 'user', FALSE, FALSE, $4)
        RETURNING id, name, email, role, is_active, payment_done, referral_code, referral_rewarded, created_at`, [name.trim(), normalizedEmail, passwordHash, referralCode]);
      account = result.rows[0];
    } else {
      account = { id: nextMemoryUserId++, name: name.trim(), email: normalizedEmail, password_hash: passwordHash, role: 'user', is_active: false, payment_done: false, referral_code: referralCode, referral_rewarded: false, created_at: new Date().toISOString() };
      memoryUsers.push(account);
    }
    response.status(201).json({ user: publicUser(account) });
  } catch (error) { next(error); }
});

app.use((error, _request, response, _next) => {
  if (error.code === '23505') return response.status(409).json({ error: 'An account with this email already exists' });
  if (error.statusCode) {
    const statusCode = Number(error.statusCode);
    if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) return response.status(500).json({ error: 'Something went wrong. Please try again later.' });
    if (statusCode >= 500) return response.status(503).json({ error: 'Service temporarily unavailable. Please try again later.' });
    return response.status(statusCode).json({ error: error.message });
  }
  console.error(error);
  response.status(500).json({ error: 'Something went wrong. Please try again later.' });
});

async function start() {
  const production = process.env.NODE_ENV === 'production';
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || '';
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) throw new Error('Set a real, valid ADMIN_EMAIL');
  if (!isStrongPassword(adminPassword)) throw new Error('Set a strong ADMIN_PASSWORD with uppercase, lowercase, a number, and a special character');
  if (production) {
    const required = ['DATABASE_URL', 'JWT_SECRET', 'APP_URL', 'BREVO_SMTP_HOST', 'BREVO_SMTP_PORT', 'BREVO_SMTP_USER', 'BREVO_SMTP_PASS', 'MAIL_FROM'];
    const missing = required.filter((key) => !process.env[key]?.trim());
    if (missing.length) throw new Error(`Missing required production environment variable(s): ${missing.join(', ')}`);
    if (process.env.JWT_SECRET.length < 64) throw new Error('JWT_SECRET must contain at least 64 characters in production');
    let appUrl;
    try { appUrl = new URL(process.env.APP_URL); } catch { throw new Error('APP_URL must be the public HTTPS origin of the client'); }
    if (appUrl.protocol !== 'https:' || appUrl.pathname !== '/' || appUrl.search || appUrl.hash) throw new Error('APP_URL must be the public HTTPS origin of the client, without a path');
    if (!hasEmailSettings()) throw new Error('Email delivery configuration is incomplete');
  }
  if (production && !databaseUrl) throw new Error('DATABASE_URL is required in production; in-memory storage is only for local preview');
  validateDatabaseUrl(databaseUrl);
  if (pool) {
    await pool.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
    for (const [index, category] of categories.entries()) {
      await pool.query(`INSERT INTO categories (slug, name, color, sort_order) VALUES ($1, $2, 'blue', $3)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order`, [category.slug, category.name, index + 1]);
    }
    await initializeContent();
    const adminResult = await ensureConfiguredAdministrator({ pool, email: adminEmail, password: adminPassword });
    await backfillReferralCodes();
    if (adminResult === 'updated') console.log(`Updated administrator account email: ${adminEmail}`);
    if (adminResult === 'created') console.log(`Created initial administrator account: ${adminEmail}`);
  } else {
    await initializeContent();
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    memoryUsers.push({ id: nextMemoryUserId++, name: 'Site Administrator', email: adminEmail, password_hash: passwordHash, role: 'admin', is_active: true, payment_done: false, referral_code: await createReferralCode(), referral_rewarded: false });
    console.warn('PostgreSQL is not configured. Accounts use temporary in-memory storage for local preview.');
  }

app.get('/api/health', async (_request, response) => {
    response.status(200).send("Server is healthy!"); 
});

  const server = app.listen(port, '0.0.0.0', () => console.log(`Fieldnotes API listening on http://0.0.0.0:${port}`));
  server.on('error', async (error) => {
    if (error.code === 'EADDRINUSE') {
      // Reuse only an API instance that already has the current referral route.
      // An older dev process may answer /api/auth/me while still returning 404
      // for newer routes, which leaves the browser pointed at stale code.
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/referrals/me`, { signal: AbortSignal.timeout(1500) });
        if (response.status === 401) {
          console.info(`Current Fieldnotes API is already running on port ${port}; keeping the existing server.`);
          return;
        }
      } catch {
        // Report the original bind error below with the configured port.
      }
      console.error(`Port ${port} is in use by an older or unrelated process. Stop that process, then restart the API, or start this API with a different PORT.`);
      process.exitCode = 1;
      return;
    }
    console.error(`Could not start the API on port ${port}: ${error.message}`);
    process.exitCode = 1;
  });
}

start().catch((error) => {
  console.error('API startup failed:', error.message);
  process.exitCode = 1;
});
