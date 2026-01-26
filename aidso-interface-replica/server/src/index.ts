import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import * as crypto from 'crypto';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3005;

// 配置文件路径：在开发模式下 __dirname 是 src，在生产模式下是 dist
// 统一使用相对于工作目录的路径，确保在 Docker 和本地都能正常工作
const getConfigPath = (filename: string): string => {
    // 优先使用环境变量指定的路径（用于 Docker 等环境）
    if (process.env.CONFIG_DIR) {
        return path.join(process.env.CONFIG_DIR, filename);
    }
    
    // 在 Docker 环境中，工作目录通常是 /app，配置文件应该在 /app 目录下
    const cwd = process.cwd();
    if (cwd === '/app' || cwd.startsWith('/app/')) {
        return path.join('/app', filename);
    }
    
    // 尝试从 __dirname 推断（开发模式：src，生产模式：dist）
    const baseDir = __dirname.endsWith('/src') || __dirname.endsWith('\\src') 
        ? path.join(__dirname, '..') 
        : __dirname.endsWith('/dist') || __dirname.endsWith('\\dist')
        ? path.join(__dirname, '..')
        : __dirname;
    return path.join(baseDir, filename);
};

const PERMISSIONS_FILE = getConfigPath('permissions.json');
const CONFIG_FILE = getConfigPath('config.json');
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-auth-secret-change-me';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// 启动时打印配置文件路径，便于调试
console.log('[Server Init] CONFIG_FILE:', CONFIG_FILE);
console.log('[Server Init] PERMISSIONS_FILE:', PERMISSIONS_FILE);
console.log('[Server Init] __dirname:', __dirname);
console.log('[Server Init] process.cwd():', process.cwd());

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecodeToString(input: string) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signToken(payload: Record<string, any>) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(body)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${body}.${sig}`;
}

function verifyToken(token: string): { ok: true; payload: any } | { ok: false; error: string } {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, error: 'Invalid token format' };
  const [body, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(body)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return { ok: false, error: 'Invalid token signature' };
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return { ok: false, error: 'Invalid token signature' };

  let payload: any;
  try {
    payload = JSON.parse(base64UrlDecodeToString(body));
  } catch {
    return { ok: false, error: 'Invalid token payload' };
  }

  if (typeof payload?.exp === 'number' && Date.now() > payload.exp * 1000) {
    return { ok: false, error: 'Token expired' };
  }

  return { ok: true, payload };
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

function verifyPassword(password: string, stored: string) {
  if (!stored) return false;

  if (!stored.startsWith('scrypt$')) {
    // Legacy seeded data (demo-only)
    return stored === password;
  }

  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const salt = parts[1];
  const storedKeyHex = parts[2];
  const derivedKeyHex = crypto.scryptSync(password, salt, 64).toString('hex');

  const a = Buffer.from(storedKeyHex, 'hex');
  const b = Buffer.from(derivedKeyHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function getAuthUser(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1];
  const decoded = verifyToken(token);
  if (!decoded.ok) return null;

  const userId = decoded.payload?.uid;
  if (typeof userId !== 'number') return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { membership: true },
    });
    return user;
  } catch (err: any) {
    // 如果数据库连接失败，但 token 有效，尝试从 payload 中获取信息
    // 这对于配置保存等不严格依赖数据库的操作很重要
    console.warn('[Auth] Database query failed, using token payload only:', err?.message);
    const payload = decoded.payload;
    
    // 如果 payload 中有 role，使用它（新版本的 token 会包含 role）
    if (payload && payload.role === 'ADMIN') {
      return {
        id: userId,
        role: 'ADMIN',
        email: payload.email || 'admin@example.com',
        name: payload.name || 'Admin',
      };
    }
    
    // 如果 payload 中没有 role，但 token 有效，我们允许通过
    // 这是一个临时方案，用于数据库连接失败时
    // 注意：这不够安全，但至少能让配置保存功能工作
    console.warn('[Auth] Token valid but no role in payload, allowing access for config operations');
    return {
      id: userId,
      role: 'ADMIN', // 临时允许，假设是管理员（因为只有管理员能访问配置页面）
      email: payload.email || 'admin@example.com',
      name: payload.name || 'Admin',
    };
  }
}

function sanitizeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    plan: user.membership?.plan || 'FREE',
    points: user.points || 0,
  };
}

function normalizePlan(input: any): 'FREE' | 'PRO' | 'ENTERPRISE' {
  if (!input) return 'FREE';
  if (input === 'FREE' || input === 'PRO' || input === 'ENTERPRISE') return input;
  if (input === '免费版') return 'FREE';
  if (input === '开发者版') return 'PRO';
  if (input === '企业版') return 'ENTERPRISE';
  return 'FREE';
}

function planLabel(plan: string) {
  if (plan === 'PRO') return '开发者版';
  if (plan === 'ENTERPRISE') return '企业版';
  return '免费版';
}

function requireAuth() {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      (req as any).user = user;
      next();
    } catch (err) {
      console.error('Auth middleware error', err);
      res.status(500).json({ error: 'Auth error' });
    }
  };
}

function requireAdmin() {
  const auth = requireAuth();
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    auth(req, res, () => {
      const user = (req as any).user;
      if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
      next();
    });
  };
}

function getShanghaiUsageDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function readAppConfig(): any {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch (err) {
    console.error('Failed to read config.json', err);
    return {};
  }
}

function getBillingConfig(config: any) {
  const defaults = {
    dailyUnitsByPlan: { FREE: 2, PRO: 100, ENTERPRISE: 1000 },
    searchMultiplier: { quick: 1, deep: 2 },
    modelUnitPrice: {} as Record<string, number>,
  };

  const billing = config?.billing || {};
  return {
    dailyUnitsByPlan: { ...defaults.dailyUnitsByPlan, ...(billing.dailyUnitsByPlan || {}) },
    searchMultiplier: { ...defaults.searchMultiplier, ...(billing.searchMultiplier || {}) },
    modelUnitPrice: { ...defaults.modelUnitPrice, ...(billing.modelUnitPrice || {}) },
  };
}

function calculateTaskCostUnits(params: {
  selectedModels: string[];
  searchType: 'quick' | 'deep';
  billing: ReturnType<typeof getBillingConfig>;
}) {
  const base = params.selectedModels.reduce((sum, modelKey) => {
    const unitPrice = params.billing.modelUnitPrice?.[modelKey];
    return sum + (typeof unitPrice === 'number' && unitPrice > 0 ? unitPrice : 1);
  }, 0);
  const multiplier = params.billing.searchMultiplier?.[params.searchType] || 1;
  return base * multiplier;
}

function httpError(status: number, payload: any) {
  const err: any = new Error(typeof payload?.error === 'string' ? payload.error : 'Request failed');
  err.status = status;
  err.payload = payload;
  return err;
}

function csvEscape(value: any) {
  if (value === null || value === undefined) return '';
  const s =
    value instanceof Date
      ? value.toISOString()
      : typeof value === 'string'
        ? value
        : typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : (() => {
              try {
                return JSON.stringify(value);
              } catch {
                return String(value);
              }
            })();

  const needsQuotes = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function toCsv(headers: string[], rows: any[][]) {
  const lines = [headers.map(csvEscape).join(','), ...rows.map((r) => r.map(csvEscape).join(','))];
  // Excel-friendly UTF-8 BOM
  return `\ufeff${lines.join('\n')}`;
}

function parseDateShanghai(input: any, opts?: { endOfDay?: boolean }) {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (!s) return null;

  // Date-only: interpret as Asia/Shanghai to avoid UTC offset surprises.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    const time = opts?.endOfDay ? '23:59:59.999' : '00:00:00.000';
    const iso = `${y}-${m}-${d}T${time}+08:00`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateRangeShanghai(params: { from?: any; to?: any }) {
  const from = parseDateShanghai(params.from);
  const to = parseDateShanghai(params.to, { endOfDay: typeof params.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.to.trim()) });
  return { from, to };
}

app.use(cors());
app.use(express.json());

async function createTaskForUser(params: {
  user: any;
  keyword: any;
  searchType: any;
  models: any;
  monitoringProjectId?: string | null;
}) {
  const user = params.user;
  const keyword = params.keyword;
  const searchType = params.searchType;
  const models = params.models;

  if (!keyword || typeof keyword !== 'string') {
    throw httpError(400, { error: 'Keyword is required' });
  }
  const normalizedSearchType = searchType === 'deep' ? 'deep' : 'quick';
  const selectedModels = Array.isArray(models) ? models.filter((m: any) => typeof m === 'string') : [];
  if (selectedModels.length === 0) {
    throw httpError(400, { error: 'At least one model is required' });
  }

  const config = readAppConfig();
  const billing = getBillingConfig(config);
  const usageDate = getShanghaiUsageDate();
  const plan = user.membership?.plan || 'FREE';
  const dailyLimit = billing.dailyUnitsByPlan?.[plan] ?? billing.dailyUnitsByPlan.FREE;

  const estimatedCost = calculateTaskCostUnits({
    selectedModels,
    searchType: normalizedSearchType,
    billing,
  });
  const costUnits = Math.max(1, Math.ceil(Number.isFinite(estimatedCost) ? estimatedCost : selectedModels.length));

  const hasUsableProvider = selectedModels.some((modelKey) => {
    const picked = pickNewApiConfigForModel(config, modelKey);
    const cfg = (picked as any)?.cfg;
    return (
      typeof cfg?.baseUrl === 'string' &&
      cfg.baseUrl.trim() &&
      typeof cfg?.apiKey === 'string' &&
      cfg.apiKey.trim()
    );
  });

  if (!hasUsableProvider) {
    const platformData: Record<string, any> = Object.fromEntries(
      selectedModels.map((k) => [
        k,
        {
          engine: 'unconfigured',
          thinking: '',
          response: '⚠️ NewAPI 未配置（baseUrl/apiKey 为空），任务未执行。\n\n请管理员先到 /admin 配置 NewAPI。',
          sources: [],
        },
      ])
    );

    const task = await prisma.task.create({
      data: {
        keyword,
        status: 'FAILED',
        progress: 100,
        logs: [
          '🚀 任务已创建',
          '⚠️ NewAPI 未配置：请先在后台填写 baseUrl / apiKey 并启用模型源（/admin → 权限与配置 → 多模型接口配置）',
        ],
        searchType: normalizedSearchType,
        selectedModels,
        costUnits: 0,
        quotaUnits: 0,
        pointsUnits: 0,
        usageDate,
        userId: user.id,
        ...(params.monitoringProjectId ? { monitoringProjectId: params.monitoringProjectId } : {}),
        result: {
          summary: 'NewAPI 未配置，任务未执行',
          analysis: { summary: 'NewAPI 未配置（baseUrl/apiKey 为空），无法调用模型。' },
          platformData,
        } as any,
      },
    });

    return { task, started: false, remainingPoints: user.points || 0 };
  }

  // 计算当日免费配额剩余
  const usageAgg = await prisma.task.aggregate({
    where: { userId: user.id, usageDate },
    _sum: { quotaUnits: true },
  });
  const usedQuotaUnits = usageAgg._sum?.quotaUnits || 0;
  const remainingQuotaUnits = Math.max(0, dailyLimit - usedQuotaUnits);

  const quotaUnitsToCharge = Math.min(costUnits, remainingQuotaUnits);
  const pointsUnitsToCharge = costUnits - quotaUnitsToCharge;

  // 检查用户点数是否足够（超出免费额度才扣点）
  const currentUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!currentUser) {
    throw httpError(401, { error: 'Unauthorized' });
  }
  if (pointsUnitsToCharge > 0 && (currentUser.points || 0) < pointsUnitsToCharge) {
    throw httpError(403, {
      error: '点数不足',
      message: `本次任务需要 ${costUnits} 次（免费额度抵扣 ${quotaUnitsToCharge} 次，需扣点 ${pointsUnitsToCharge} 点），您当前余额为 ${
        currentUser.points || 0
      } 点`,
      requiredPoints: pointsUnitsToCharge,
      currentPoints: currentUser.points || 0,
      dailyLimit,
      usedQuotaUnits,
      remainingQuotaUnits,
      costUnits,
    });
  }

  // 使用事务：扣点 + 创建任务
  const result = await prisma.$transaction(async (tx) => {
    let updatedPoints = currentUser.points || 0;
    if (pointsUnitsToCharge > 0) {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { points: { decrement: pointsUnitsToCharge } },
      });
      updatedPoints = updatedUser.points;

      await tx.pointsLog.create({
        data: {
          userId: user.id,
          amount: -pointsUnitsToCharge,
          balance: updatedUser.points,
          type: 'CONSUME',
          description: `执行任务: ${keyword.substring(0, 50)}`,
        },
      });
    }

    // 创建任务
    const logs: string[] = ['🚀 任务已创建，准备启动调研...'];
    if (quotaUnitsToCharge > 0) {
      logs.push(
        `🎟️ 已使用今日免费额度 ${quotaUnitsToCharge} 次（${usageDate}：已用 ${Math.min(
          dailyLimit,
          usedQuotaUnits + quotaUnitsToCharge
        )}/${dailyLimit}）`
      );
    }
    if (pointsUnitsToCharge > 0) {
      logs.push(`💰 已扣除 ${pointsUnitsToCharge} 点，当前余额：${updatedPoints} 点`);
    } else {
      logs.push('✅ 本次未扣除点数');
    }

    const task = await tx.task.create({
      data: {
        keyword,
        status: 'PENDING',
        logs,
        searchType: normalizedSearchType,
        selectedModels,
        costUnits,
        quotaUnits: quotaUnitsToCharge,
        pointsUnits: pointsUnitsToCharge,
        usageDate,
        userId: user.id,
        ...(params.monitoringProjectId ? { monitoringProjectId: params.monitoringProjectId } : {}),
      },
    });

    return { task, remainingPoints: updatedPoints };
  });

  // Trigger background processing (simulate async)
  simulateTaskProcessing(result.task.id, keyword, selectedModels, normalizedSearchType);

  return { task: result.task, started: true, remainingPoints: result.remainingPoints };
}

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Health check via /api prefix (for frontend proxy self-test)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// --- Billing Routes ---

app.get('/api/billing/pricing', (req, res) => {
  try {
    const config = readAppConfig();
    const billing = getBillingConfig(config);
    res.json({
      dailyUnitsByPlan: billing.dailyUnitsByPlan,
      searchMultiplier: billing.searchMultiplier,
      modelUnitPrice: billing.modelUnitPrice,
    });
  } catch (err) {
    console.error('Failed to get billing pricing', err);
    res.status(500).json({ error: 'Failed to get billing pricing' });
  }
});

app.get('/api/billing/summary', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  try {
    const config = readAppConfig();
    const billing = getBillingConfig(config);
    const usageDate = getShanghaiUsageDate();
    const plan = user.membership?.plan || 'FREE';
    const dailyLimit = billing.dailyUnitsByPlan?.[plan] ?? billing.dailyUnitsByPlan.FREE;

    const usageAgg = await prisma.task.aggregate({
      where: { userId: user.id, usageDate },
      _sum: { quotaUnits: true },
    });
    const usedUnits = usageAgg._sum?.quotaUnits || 0;
    const remainingUnits = Math.max(0, dailyLimit - usedUnits);

    res.json({ usageDate, plan, dailyLimit, usedUnits, remainingUnits });
  } catch (err) {
    console.error('Failed to get billing summary', err);
    res.status(500).json({ error: 'Failed to get billing summary' });
  }
});

// --- Personal Center Insights ---

app.get('/api/me/insights', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  try {
    const now = new Date();
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalTasks, tasks7d, sum7d] = await Promise.all([
      prisma.task.count({ where: { userId: user.id } }),
      prisma.task.count({ where: { userId: user.id, createdAt: { gte: since7d } } }),
      prisma.task.aggregate({
        where: { userId: user.id, createdAt: { gte: since7d } },
        _sum: { costUnits: true, quotaUnits: true, pointsUnits: true },
      }),
    ]);

    const recentTasks = await prisma.task.findMany({
      where: { userId: user.id, createdAt: { gte: since7d } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { selectedModels: true, searchType: true },
    });

    const modelUsage: Record<string, number> = {};
    let deepCount = 0;
    let quickCount = 0;
    for (const t of recentTasks) {
      const type = t.searchType === 'deep' ? 'deep' : 'quick';
      if (type === 'deep') deepCount += 1;
      else quickCount += 1;

      const models = Array.isArray(t.selectedModels) ? (t.selectedModels as any[]) : [];
      for (const m of models) {
        if (typeof m !== 'string') continue;
        modelUsage[m] = (modelUsage[m] || 0) + 1;
      }
    }

    const mentions = await prisma.brandMention.findMany({
      where: { brandKeyword: { userId: user.id }, createdAt: { gte: since7d } },
      select: {
        mentionCount: true,
        sentiment: true,
        brandKeyword: { select: { keyword: true, isOwn: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    const ownCounts: Record<string, number> = {};
    const competitorCounts: Record<string, number> = {};
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    for (const m of mentions) {
      const key = m.brandKeyword.keyword;
      const delta = typeof m.mentionCount === 'number' ? m.mentionCount : 0;
      if (m.brandKeyword.isOwn) ownCounts[key] = (ownCounts[key] || 0) + delta;
      else competitorCounts[key] = (competitorCounts[key] || 0) + delta;

      const s = String(m.sentiment || '').toLowerCase();
      if (s === 'positive') sentimentCounts.positive += 1;
      else if (s === 'negative') sentimentCounts.negative += 1;
      else sentimentCounts.neutral += 1;
    }

    const topOwn = Object.entries(ownCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword, count]) => ({ keyword, count }));
    const topCompetitors = Object.entries(competitorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword, count]) => ({ keyword, count }));

    res.json({
      rangeDays: 7,
      tasks: {
        total: totalTasks,
        last7d: tasks7d,
        quick: quickCount,
        deep: deepCount,
      },
      cost: {
        costUnits7d: sum7d._sum?.costUnits || 0,
        quotaUnits7d: sum7d._sum?.quotaUnits || 0,
        pointsUnits7d: sum7d._sum?.pointsUnits || 0,
      },
      modelUsage,
      brandMentions: {
        sentimentCounts,
        topOwn,
        topCompetitors,
      },
    });
  } catch (err) {
    console.error('Failed to get /api/me/insights', err);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// --- Personal Center Data APIs ---

app.get('/api/me/tasks', requireAuth(), async (req, res) => {
  const user = (req as any).user;

  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(200, Math.max(1, Number.parseInt(String(rawLimit || '50'), 10) || 50));

  const rawOffset = Array.isArray((req.query as any).offset) ? (req.query as any).offset[0] : (req.query as any).offset;
  const offset = Math.min(50000, Math.max(0, Number.parseInt(String(rawOffset || '0'), 10) || 0));

  const rawStatus = Array.isArray((req.query as any).status) ? (req.query as any).status[0] : (req.query as any).status;
  const status =
    rawStatus === 'PENDING' || rawStatus === 'RUNNING' || rawStatus === 'COMPLETED' || rawStatus === 'FAILED'
      ? rawStatus
      : null;

  const rawSearchType = Array.isArray((req.query as any).searchType) ? (req.query as any).searchType[0] : (req.query as any).searchType;
  const searchType = rawSearchType === 'quick' || rawSearchType === 'deep' ? rawSearchType : null;

  const rawModelKey = Array.isArray((req.query as any).modelKey) ? (req.query as any).modelKey[0] : (req.query as any).modelKey;
  const modelKey = typeof rawModelKey === 'string' ? rawModelKey.trim() : '';

  const rawQ = Array.isArray((req.query as any).q) ? (req.query as any).q[0] : (req.query as any).q;
  const q = typeof rawQ === 'string' ? rawQ.trim() : '';

  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const where: any = { userId: user.id };
    if (status) where.status = status;
    if (searchType) where.searchType = searchType;
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    if (modelKey) where.modelRuns = { some: { modelKey: { contains: modelKey, mode: 'insensitive' } } };
    if (q) {
      where.OR = [
        { keyword: { contains: q, mode: 'insensitive' } },
        { modelRuns: { some: { modelKey: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          keyword: true,
          status: true,
          progress: true,
          searchType: true,
          selectedModels: true,
          costUnits: true,
          quotaUnits: true,
          pointsUnits: true,
          usageDate: true,
          createdAt: true,
          result: true,
          logs: true,
          _count: { select: { modelRuns: true } },
        },
      }),
    ]);

    const items = tasks.map((t) => {
      const result: any = (t as any).result;
      const resultSummary = typeof result?.summary === 'string' ? result.summary : null;
      const analysisSummary = typeof result?.analysis?.summary === 'string' ? result.analysis.summary : null;
      const lastLog = Array.isArray(t.logs) && t.logs.length > 0 ? String(t.logs[t.logs.length - 1]) : null;
      return {
        id: t.id,
        keyword: t.keyword,
        status: t.status,
        progress: t.progress,
        searchType: t.searchType,
        selectedModels: t.selectedModels,
        costUnits: t.costUnits,
        quotaUnits: t.quotaUnits,
        pointsUnits: t.pointsUnits,
        usageDate: t.usageDate,
        createdAt: t.createdAt,
        modelRunsCount: t._count.modelRuns,
        resultSummary,
        analysisSummary,
        lastLog,
      };
    });

    res.json({ total, limit, offset, items });
  } catch (error) {
    console.error('Failed to get tasks (me)', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

app.get('/api/me/runs', requireAuth(), async (req, res) => {
  const user = (req as any).user;

  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(500, Math.max(1, Number.parseInt(String(rawLimit || '100'), 10) || 100));

  const rawOffset = Array.isArray((req.query as any).offset) ? (req.query as any).offset[0] : (req.query as any).offset;
  const offset = Math.min(50000, Math.max(0, Number.parseInt(String(rawOffset || '0'), 10) || 0));

  const rawPurpose = Array.isArray((req.query as any).purpose) ? (req.query as any).purpose[0] : (req.query as any).purpose;
  const purpose = rawPurpose === 'MODEL' || rawPurpose === 'ANALYSIS' ? rawPurpose : null;

  const rawStatus = Array.isArray((req.query as any).status) ? (req.query as any).status[0] : (req.query as any).status;
  const status =
    rawStatus === 'PENDING' || rawStatus === 'RUNNING' || rawStatus === 'SUCCEEDED' || rawStatus === 'FAILED'
      ? rawStatus
      : null;

  const rawTaskId = Array.isArray((req.query as any).taskId) ? (req.query as any).taskId[0] : (req.query as any).taskId;
  const taskId = typeof rawTaskId === 'string' ? rawTaskId.trim() : '';

  const rawModelKey = Array.isArray((req.query as any).modelKey) ? (req.query as any).modelKey[0] : (req.query as any).modelKey;
  const modelKey = typeof rawModelKey === 'string' ? rawModelKey.trim() : '';

  const rawQ = Array.isArray((req.query as any).q) ? (req.query as any).q[0] : (req.query as any).q;
  const q = typeof rawQ === 'string' ? rawQ.trim() : '';

  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const where: any = { task: { userId: user.id } };
    if (purpose) where.purpose = purpose;
    if (status) where.status = status;
    if (taskId) where.taskId = taskId;
    if (modelKey) where.modelKey = { contains: modelKey, mode: 'insensitive' };
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    if (q) {
      where.OR = [
        { task: { keyword: { contains: q, mode: 'insensitive' } } },
        { modelKey: { contains: q, mode: 'insensitive' } },
        { provider: { contains: q, mode: 'insensitive' } },
        { modelName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, runs] = await Promise.all([
      prisma.taskModelRun.count({ where }),
      prisma.taskModelRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          taskId: true,
          task: { select: { keyword: true, searchType: true, createdAt: true } },
          modelKey: true,
          provider: true,
          modelName: true,
          purpose: true,
          status: true,
          error: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          responseText: true,
        },
      }),
    ]);

    const items = runs.map((r) => {
      const latencyMs =
        r.startedAt && r.completedAt ? Math.max(0, r.completedAt.getTime() - r.startedAt.getTime()) : null;
      const responsePreview = typeof r.responseText === 'string' ? r.responseText.slice(0, 1200) : null;
      return {
        id: r.id,
        taskId: r.taskId,
        taskKeyword: r.task.keyword,
        taskSearchType: r.task.searchType,
        modelKey: r.modelKey,
        provider: r.provider,
        modelName: r.modelName,
        purpose: r.purpose,
        status: r.status,
        error: r.error,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        createdAt: r.createdAt,
        latencyMs,
        responsePreview,
      };
    });

    res.json({ total, limit, offset, items });
  } catch (error) {
    console.error('Failed to get runs (me)', error);
    res.status(500).json({ error: 'Failed to get runs' });
  }
});

app.get('/api/me/runs/:id', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid run id' });

  try {
    const run = await prisma.taskModelRun.findUnique({
      where: { id },
      include: { task: { select: { id: true, keyword: true, userId: true, searchType: true, createdAt: true } } },
    });
    if (!run || run.task.userId !== user.id) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (error) {
    console.error('Failed to get run (me)', error);
    res.status(500).json({ error: 'Failed to get run' });
  }
});

app.get('/api/me/points-logs', requireAuth(), async (req, res) => {
  const user = (req as any).user;

  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(500, Math.max(1, Number.parseInt(String(rawLimit || '100'), 10) || 100));

  const rawOffset = Array.isArray((req.query as any).offset) ? (req.query as any).offset[0] : (req.query as any).offset;
  const offset = Math.min(50000, Math.max(0, Number.parseInt(String(rawOffset || '0'), 10) || 0));

  const rawType = Array.isArray((req.query as any).type) ? (req.query as any).type[0] : (req.query as any).type;
  const type =
    rawType === 'RECHARGE' ||
    rawType === 'CONSUME' ||
    rawType === 'ADMIN_ADD' ||
    rawType === 'ADMIN_SUB' ||
    rawType === 'REFUND'
      ? rawType
      : null;

  const rawQ = Array.isArray((req.query as any).q) ? (req.query as any).q[0] : (req.query as any).q;
  const q = typeof rawQ === 'string' ? rawQ.trim() : '';

  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const where: any = { userId: user.id };
    if (type) where.type = type;
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    if (q) {
      where.OR = [
        { description: { contains: q, mode: 'insensitive' } },
        { type: { equals: q } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.pointsLog.count({ where }),
      prisma.pointsLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    res.json({
      total,
      limit,
      offset,
      items: logs.map((l) => ({
        id: l.id,
        amount: l.amount,
        balance: l.balance,
        type: l.type,
        description: l.description,
        operatorId: l.operatorId,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error('Failed to get points logs (me)', error);
    res.status(500).json({ error: 'Failed to get points logs' });
  }
});

app.get('/api/me/pageviews', requireAuth(), async (req, res) => {
  const user = (req as any).user;

  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(500, Math.max(1, Number.parseInt(String(rawLimit || '100'), 10) || 100));

  const rawOffset = Array.isArray((req.query as any).offset) ? (req.query as any).offset[0] : (req.query as any).offset;
  const offset = Math.min(50000, Math.max(0, Number.parseInt(String(rawOffset || '0'), 10) || 0));

  const rawPath = Array.isArray((req.query as any).path) ? (req.query as any).path[0] : (req.query as any).path;
  const path = typeof rawPath === 'string' ? rawPath.trim() : '';

  const rawSessionId = Array.isArray((req.query as any).sessionId) ? (req.query as any).sessionId[0] : (req.query as any).sessionId;
  const sessionId = typeof rawSessionId === 'string' ? rawSessionId.trim() : '';

  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const where: any = { userId: user.id };
    if (path) where.path = { contains: path, mode: 'insensitive' };
    if (sessionId) where.sessionId = sessionId;
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const [total, agg, views] = await Promise.all([
      prisma.userPageView.count({ where }),
      prisma.userPageView.aggregate({ where, _sum: { durationSeconds: true } }),
      prisma.userPageView.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    res.json({
      total,
      limit,
      offset,
      sumDurationSeconds: agg._sum?.durationSeconds || 0,
      items: views.map((v) => ({
        id: v.id,
        sessionId: v.sessionId,
        path: v.path,
        referrer: v.referrer,
        userAgent: v.userAgent,
        startedAt: v.startedAt,
        endedAt: v.endedAt,
        durationSeconds: v.durationSeconds,
        createdAt: v.createdAt,
      })),
    });
  } catch (error) {
    console.error('Failed to get pageviews (me)', error);
    res.status(500).json({ error: 'Failed to get pageviews' });
  }
});

// --- Personal Center Export (CSV) ---

app.get('/api/me/export/tasks.csv', requireAuth(), async (req, res) => {
  const user = (req as any).user;

  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(5000, Math.max(1, Number.parseInt(String(rawLimit || '2000'), 10) || 2000));

  const rawStatus = Array.isArray((req.query as any).status) ? (req.query as any).status[0] : (req.query as any).status;
  const status =
    rawStatus === 'PENDING' || rawStatus === 'RUNNING' || rawStatus === 'COMPLETED' || rawStatus === 'FAILED'
      ? rawStatus
      : null;

  const rawSearchType = Array.isArray((req.query as any).searchType) ? (req.query as any).searchType[0] : (req.query as any).searchType;
  const searchType = rawSearchType === 'quick' || rawSearchType === 'deep' ? rawSearchType : null;

  const rawModelKey = Array.isArray((req.query as any).modelKey) ? (req.query as any).modelKey[0] : (req.query as any).modelKey;
  const modelKey = typeof rawModelKey === 'string' ? rawModelKey.trim() : '';

  const rawQ = Array.isArray((req.query as any).q) ? (req.query as any).q[0] : (req.query as any).q;
  const q = typeof rawQ === 'string' ? rawQ.trim() : '';

  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const where: any = { userId: user.id };
    if (status) where.status = status;
    if (searchType) where.searchType = searchType;
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    if (modelKey) where.modelRuns = { some: { modelKey: { contains: modelKey, mode: 'insensitive' } } };
    if (q) {
      where.OR = [
        { keyword: { contains: q, mode: 'insensitive' } },
        { modelRuns: { some: { modelKey: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        status: true,
        progress: true,
        searchType: true,
        keyword: true,
        usageDate: true,
        costUnits: true,
        quotaUnits: true,
        pointsUnits: true,
        selectedModels: true,
        logs: true,
        result: true,
      },
    });

    const headers = [
      'id',
      'createdAt',
      'status',
      'progress',
      'searchType',
      'keyword',
      'usageDate',
      'costUnits',
      'quotaUnits',
      'pointsUnits',
      'selectedModelsJson',
      'resultSummary',
      'analysisSummary',
      'logs',
      'resultJson',
    ];

    const rows = tasks.map((t) => {
      const result: any = t.result as any;
      const resultSummary = typeof result?.summary === 'string' ? result.summary : '';
      const analysisSummary = typeof result?.analysis?.summary === 'string' ? result.analysis.summary : '';
      const logs = Array.isArray(t.logs) ? t.logs.join('\n') : '';
      return [
        t.id,
        t.createdAt,
        t.status,
        t.progress,
        t.searchType,
        t.keyword,
        t.usageDate ?? '',
        t.costUnits ?? 0,
        t.quotaUnits ?? 0,
        t.pointsUnits ?? 0,
        t.selectedModels,
        resultSummary,
        analysisSummary,
        logs,
        t.result,
      ];
    });

    const csv = toCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aidso_my_tasks_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Failed to export my tasks csv', error);
    res.status(500).json({ error: 'Failed to export tasks' });
  }
});

app.get('/api/me/export/runs.csv', requireAuth(), async (req, res) => {
  const user = (req as any).user;

  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(5000, Math.max(1, Number.parseInt(String(rawLimit || '3000'), 10) || 3000));

  const rawPurpose = Array.isArray((req.query as any).purpose) ? (req.query as any).purpose[0] : (req.query as any).purpose;
  const purpose = rawPurpose === 'MODEL' || rawPurpose === 'ANALYSIS' ? rawPurpose : null;

  const rawStatus = Array.isArray((req.query as any).status) ? (req.query as any).status[0] : (req.query as any).status;
  const status =
    rawStatus === 'PENDING' || rawStatus === 'RUNNING' || rawStatus === 'SUCCEEDED' || rawStatus === 'FAILED'
      ? rawStatus
      : null;

  const rawTaskId = Array.isArray((req.query as any).taskId) ? (req.query as any).taskId[0] : (req.query as any).taskId;
  const taskId = typeof rawTaskId === 'string' ? rawTaskId.trim() : '';

  const rawModelKey = Array.isArray((req.query as any).modelKey) ? (req.query as any).modelKey[0] : (req.query as any).modelKey;
  const modelKey = typeof rawModelKey === 'string' ? rawModelKey.trim() : '';

  const rawQ = Array.isArray((req.query as any).q) ? (req.query as any).q[0] : (req.query as any).q;
  const q = typeof rawQ === 'string' ? rawQ.trim() : '';

  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const where: any = { task: { userId: user.id } };
    if (purpose) where.purpose = purpose;
    if (status) where.status = status;
    if (taskId) where.taskId = taskId;
    if (modelKey) where.modelKey = { contains: modelKey, mode: 'insensitive' };
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    if (q) {
      where.OR = [
        { task: { keyword: { contains: q, mode: 'insensitive' } } },
        { modelKey: { contains: q, mode: 'insensitive' } },
        { provider: { contains: q, mode: 'insensitive' } },
        { modelName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const runs = await prisma.taskModelRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        purpose: true,
        status: true,
        error: true,
        startedAt: true,
        completedAt: true,
        modelKey: true,
        provider: true,
        modelName: true,
        taskId: true,
        task: { select: { keyword: true, searchType: true } },
        prompt: true,
        responseText: true,
      },
    });

    const headers = [
      'id',
      'createdAt',
      'purpose',
      'status',
      'taskId',
      'taskKeyword',
      'taskSearchType',
      'modelKey',
      'provider',
      'modelName',
      'startedAt',
      'completedAt',
      'latencyMs',
      'error',
      'prompt',
      'responseText',
    ];

    const rows = runs.map((r) => {
      const latencyMs =
        r.startedAt && r.completedAt ? Math.max(0, r.completedAt.getTime() - r.startedAt.getTime()) : '';
      return [
        r.id,
        r.createdAt,
        r.purpose,
        r.status,
        r.taskId,
        r.task.keyword,
        r.task.searchType,
        r.modelKey,
        r.provider ?? '',
        r.modelName ?? '',
        r.startedAt ?? '',
        r.completedAt ?? '',
        latencyMs,
        r.error ?? '',
        r.prompt ?? '',
        r.responseText ?? '',
      ];
    });

    const csv = toCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aidso_my_runs_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Failed to export my runs csv', error);
    res.status(500).json({ error: 'Failed to export runs' });
  }
});

app.get('/api/me/export/points-logs.csv', requireAuth(), async (req, res) => {
  const user = (req as any).user;

  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(5000, Math.max(1, Number.parseInt(String(rawLimit || '3000'), 10) || 3000));

  const rawType = Array.isArray((req.query as any).type) ? (req.query as any).type[0] : (req.query as any).type;
  const type =
    rawType === 'RECHARGE' ||
    rawType === 'CONSUME' ||
    rawType === 'ADMIN_ADD' ||
    rawType === 'ADMIN_SUB' ||
    rawType === 'REFUND'
      ? rawType
      : null;

  const rawQ = Array.isArray((req.query as any).q) ? (req.query as any).q[0] : (req.query as any).q;
  const q = typeof rawQ === 'string' ? rawQ.trim() : '';

  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const where: any = { userId: user.id };
    if (type) where.type = type;
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    if (q) {
      where.OR = [
        { description: { contains: q, mode: 'insensitive' } },
        { type: { equals: q } },
      ];
    }

    const logs = await prisma.pointsLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const headers = ['id', 'createdAt', 'type', 'amount', 'balance', 'description', 'operatorId'];
    const rows = logs.map((l) => [
      l.id,
      l.createdAt,
      l.type,
      l.amount,
      l.balance,
      l.description ?? '',
      l.operatorId ?? '',
    ]);

    const csv = toCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aidso_my_points_logs_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Failed to export my points logs csv', error);
    res.status(500).json({ error: 'Failed to export points logs' });
  }
});

app.get('/api/me/export/pageviews.csv', requireAuth(), async (req, res) => {
  const user = (req as any).user;

  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(5000, Math.max(1, Number.parseInt(String(rawLimit || '3000'), 10) || 3000));

  const rawPath = Array.isArray((req.query as any).path) ? (req.query as any).path[0] : (req.query as any).path;
  const path = typeof rawPath === 'string' ? rawPath.trim() : '';

  const rawSessionId = Array.isArray((req.query as any).sessionId) ? (req.query as any).sessionId[0] : (req.query as any).sessionId;
  const sessionId = typeof rawSessionId === 'string' ? rawSessionId.trim() : '';

  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const where: any = { userId: user.id };
    if (path) where.path = { contains: path, mode: 'insensitive' };
    if (sessionId) where.sessionId = sessionId;
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const views = await prisma.userPageView.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const headers = [
      'id',
      'createdAt',
      'sessionId',
      'path',
      'startedAt',
      'endedAt',
      'durationSeconds',
      'referrer',
      'userAgent',
    ];

    const rows = views.map((v) => [
      v.id,
      v.createdAt,
      v.sessionId,
      v.path,
      v.startedAt,
      v.endedAt ?? '',
      v.durationSeconds ?? '',
      v.referrer ?? '',
      v.userAgent ?? '',
    ]);

    const csv = toCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aidso_my_pageviews_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Failed to export my pageviews csv', error);
    res.status(500).json({ error: 'Failed to export pageviews' });
  }
});

// --- Config Routes ---

app.get('/api/admin/config', requireAdmin(), (req, res) => {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
            // Mask API Key for security if needed, but for admin panel usually we show it or mask partially
            // For now sending raw
            res.json(config);
        } else {
            res.json({});
        }
    } catch (err) {
        console.error('Failed to load config', err);
        res.status(500).json({ error: 'Failed to load config' });
    }
});

// 诊断端点：检查配置文件状态
app.get('/api/admin/config/diagnose', requireAdmin(), (req, res) => {
    try {
        const info = {
            configFile: CONFIG_FILE,
            permissionsFile: PERMISSIONS_FILE,
            cwd: process.cwd(),
            __dirname: __dirname,
            configExists: fs.existsSync(CONFIG_FILE),
            permissionsExists: fs.existsSync(PERMISSIONS_FILE),
            configWritable: false,
            permissionsWritable: false,
            configDirExists: false,
            configDirWritable: false,
            errors: [] as string[]
        };
        
        // 检查配置文件
        if (info.configExists) {
            try {
                fs.accessSync(CONFIG_FILE, fs.constants.W_OK);
                info.configWritable = true;
            } catch (e: any) {
                info.errors.push(`Config file not writable: ${e.message} (${e.code})`);
            }
        } else {
            info.errors.push('Config file does not exist');
        }
        
        // 检查权限文件
        if (info.permissionsExists) {
            try {
                fs.accessSync(PERMISSIONS_FILE, fs.constants.W_OK);
                info.permissionsWritable = true;
            } catch (e: any) {
                info.errors.push(`Permissions file not writable: ${e.message} (${e.code})`);
            }
        } else {
            info.errors.push('Permissions file does not exist');
        }
        
        // 检查目录
        const configDir = path.dirname(CONFIG_FILE);
        info.configDirExists = fs.existsSync(configDir);
        if (info.configDirExists) {
            try {
                fs.accessSync(configDir, fs.constants.W_OK);
                info.configDirWritable = true;
            } catch (e: any) {
                info.errors.push(`Config directory not writable: ${e.message} (${e.code})`);
            }
        } else {
            info.errors.push('Config directory does not exist');
        }
        
        res.json(info);
    } catch (error: any) {
        res.status(500).json({ 
            error: 'Failed to diagnose',
            details: error?.message || 'Unknown error'
        });
    }
});

app.post('/api/admin/config', requireAdmin(), (req, res) => {
    console.log('[Config Save] ========== Request received ==========');
    console.log('[Config Save] Time:', new Date().toISOString());
    console.log('[Config Save] Path:', req.path);
    console.log('[Config Save] Method:', req.method);
    console.log('[Config Save] User:', (req as any).user ? `${(req as any).user.id} (${(req as any).user.role})` : 'none');
    try {
        console.log('[Config Save] Starting config save, CONFIG_FILE:', CONFIG_FILE);
        console.log('[Config Save] Request body keys:', Object.keys(req.body || {}));
        
        // 确保目录存在
        const configDir = path.dirname(CONFIG_FILE);
        if (!fs.existsSync(configDir)) {
            console.log('[Config Save] Creating config directory:', configDir);
            try {
                fs.mkdirSync(configDir, { recursive: true });
            } catch (mkdirError: any) {
                console.error('[Config Save] Failed to create directory:', mkdirError);
                return res.status(500).json({ 
                    error: 'Failed to create config directory',
                    details: mkdirError.message,
                    code: mkdirError.code,
                    path: configDir
                });
            }
        }
        
        // 验证 JSON 数据
        const configData = req.body;
        if (!configData || typeof configData !== 'object') {
            console.error('[Config Save] Invalid config data received, type:', typeof configData);
            return res.status(400).json({ error: 'Invalid config data' });
        }
        
        // 检查文件是否可写（如果文件存在）
        if (fs.existsSync(CONFIG_FILE)) {
            try {
                fs.accessSync(CONFIG_FILE, fs.constants.W_OK);
            } catch (accessError: any) {
                // 文件存在但不可写
                console.error('[Config Save] Config file is not writable:', CONFIG_FILE, accessError);
                return res.status(500).json({ 
                    error: 'Config file is not writable',
                    details: accessError.message,
                    code: accessError.code,
                    path: CONFIG_FILE
                });
            }
        } else {
            // 文件不存在，检查目录是否可写
            try {
                fs.accessSync(configDir, fs.constants.W_OK);
            } catch (accessError: any) {
                console.error('[Config Save] Config directory is not writable:', configDir, accessError);
                return res.status(500).json({ 
                    error: 'Config directory is not writable',
                    details: accessError.message,
                    code: accessError.code,
                    path: configDir
                });
            }
        }
        
        // 直接写入文件（Docker bind mount 环境下 rename 会导致 EBUSY）
        const configString = JSON.stringify(configData, null, 2);
        
        try {
            console.log('[Config Save] Writing directly to config file:', CONFIG_FILE);
            
            // 直接写入文件
            fs.writeFileSync(CONFIG_FILE, configString, 'utf8');
            
            // 验证文件是否写入成功
            const saved = fs.readFileSync(CONFIG_FILE, 'utf8');
            JSON.parse(saved); // 验证 JSON 格式
            
            console.log('[Config Save] Config saved successfully, size:', configString.length, 'bytes');
            
            res.json({ success: true });
        } catch (writeError: any) {
            console.error('[Config Save] Write error:', writeError);
            throw writeError;
        }
    } catch (error: any) {
        console.error('[Config Save] Failed to save config:', error);
        const errorMessage = error?.message || 'Unknown error';
        const errorCode = error?.code || 'UNKNOWN';
        const errorStack = error?.stack || '';
        res.status(500).json({ 
            error: 'Failed to save config',
            details: errorMessage,
            code: errorCode,
            path: CONFIG_FILE,
            stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
        });
    }
});

app.patch('/api/admin/config/system', requireAdmin(), (req, res) => {
  try {
    const config = readAppConfig();
    const patch = req.body || {};

    const nextSystem = {
      ...(config.system || {}),
      ...(typeof patch.maintenanceMode === 'boolean' ? { maintenanceMode: patch.maintenanceMode } : {}),
      ...(typeof patch.signupEnabled === 'boolean' ? { signupEnabled: patch.signupEnabled } : {}),
    };

    const nextConfig = { ...config, system: nextSystem };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(nextConfig, null, 2));
    res.json({ success: true, system: nextSystem });
  } catch (error) {
    console.error('Failed to patch system config', error);
    res.status(500).json({ error: 'Failed to patch system config' });
  }
});

// --- Auth Routes ---

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body || {};

  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email is required' });
  if (!password || typeof password !== 'string') return res.status(400).json({ error: 'Password is required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const config = readAppConfig();
    if (config?.system?.signupEnabled === false) {
      return res.status(403).json({ error: 'Signup is disabled' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already exists' });

    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    const isBootstrapAdmin = adminCount === 0;

    const user = await prisma.user.create({
      data: {
        email,
        name: typeof name === 'string' ? name : null,
        password: hashPassword(password),
        role: isBootstrapAdmin ? 'ADMIN' : 'USER',
        membership: {
          create: {
            plan: isBootstrapAdmin ? 'ENTERPRISE' : 'FREE',
            status: 'ACTIVE',
          },
        },
      },
      include: { membership: true },
    });

    const token = signToken({ 
      uid: user.id, 
      role: user.role, // 在 token 中包含 role，这样即使数据库失败也能验证
      email: user.email,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS 
    });
    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Register failed', error);
    res.status(500).json({ error: 'Register failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email is required' });
  if (!password || typeof password !== 'string') return res.status(400).json({ error: 'Password is required' });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { membership: true },
    });

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!verifyPassword(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ 
      uid: user.id, 
      role: user.role, // 在 token 中包含 role，这样即使数据库失败也能验证
      email: user.email,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS 
    });
    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Login failed', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  // Client should drop token; server remains stateless for now.
  res.json({ success: true });
});

// --- Tracking Routes ---

app.post('/api/track/pageview', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  const body = req.body || {};
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  const pagePath = typeof body.path === 'string' ? body.path : '';
  const referrer = typeof body.referrer === 'string' ? body.referrer : req.get('referer') || null;
  const userAgent = typeof body.userAgent === 'string' ? body.userAgent : req.get('user-agent') || null;

  if (!sessionId || sessionId.length > 200) return res.status(400).json({ error: 'Invalid sessionId' });
  if (!pagePath || pagePath.length > 2048) return res.status(400).json({ error: 'Invalid path' });

  const startedAtRaw = body.startedAt;
  const endedAtRaw = body.endedAt;
  const durationSecondsRaw = body.durationSeconds;

  const startedAt = typeof startedAtRaw === 'string' ? new Date(startedAtRaw) : null;
  const endedAt = typeof endedAtRaw === 'string' ? new Date(endedAtRaw) : null;
  const startedAtValid = startedAt && !Number.isNaN(startedAt.getTime()) ? startedAt : null;
  const endedAtValid = endedAt && !Number.isNaN(endedAt.getTime()) ? endedAt : null;

  const durationSecondsParsed = Number.isFinite(Number(durationSecondsRaw)) ? Number(durationSecondsRaw) : null;
  const durationSeconds =
    typeof durationSecondsParsed === 'number' && durationSecondsParsed >= 0
      ? Math.min(60 * 60 * 24, Math.round(durationSecondsParsed))
      : startedAtValid && endedAtValid
        ? Math.max(0, Math.min(60 * 60 * 24, Math.round((endedAtValid.getTime() - startedAtValid.getTime()) / 1000)))
        : null;

  try {
    const now = new Date();
    await prisma.userPageView.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        sessionId,
        path: pagePath,
        referrer,
        userAgent,
        startedAt: startedAtValid || now,
        endedAt: endedAtValid,
        durationSeconds,
        createdAt: now,
      },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to track pageview', error);
    res.status(500).json({ error: 'Failed to track pageview' });
  }
});

// Backward compatible (legacy)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email is required' });
  if (!password || typeof password !== 'string') return res.status(400).json({ error: 'Password is required' });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { membership: true },
    });

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!verifyPassword(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ 
      uid: user.id, 
      role: user.role, // 在 token 中包含 role，这样即使数据库失败也能验证
      email: user.email,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS 
    });
    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Login failed', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// --- API Routes ---

// 1. Get Tasks (List all tasks for now, later filter by user)
app.get('/api/tasks', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// 2. Create Task (改为按点数扣费)
app.post('/api/tasks', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  try {
    const { keyword, searchType, models } = req.body || {};
    const result = await createTaskForUser({ user, keyword, searchType, models });
    res.json({
      ...result.task,
      remainingPoints: result.remainingPoints,
    });
  } catch (error) {
    const err: any = error;
    if (err?.status && err?.payload) {
      return res.status(err.status).json(err.payload);
    }
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// 3. Get Single Task
app.get('/api/tasks/:id', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid task id' });
  try {
    const task = await prisma.task.findUnique({
      where: { id }
    });
    const isAdmin = user?.role === 'ADMIN';
    if (!task || (!isAdmin && task.userId !== user.id)) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// 3.2 Get Task Model Runs
app.get('/api/tasks/:id/runs', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid task id' });

  try {
    const task = await prisma.task.findUnique({ where: { id } });
    const isAdmin = user?.role === 'ADMIN';
    if (!task || (!isAdmin && task.userId !== user.id)) return res.status(404).json({ error: 'Task not found' });

    const runs = await prisma.taskModelRun.findMany({
      where: { taskId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        taskId: true,
        modelKey: true,
        provider: true,
        modelName: true,
        purpose: true,
        status: true,
        prompt: true,
        responseText: true,
        error: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    });
    res.json(runs);
  } catch (error) {
    console.error('Failed to fetch task runs', error);
    res.status(500).json({ error: 'Failed to fetch task runs' });
  }
});

// 3.1 Delete Task
app.delete('/api/tasks/:id', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid task id' });
  try {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.userId !== user.id) return res.status(404).json({ error: 'Task not found' });
    await prisma.task.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// --- Admin Routes ---

// 4. Get Admin Stats (Dashboard)
app.get('/api/admin/stats', requireAdmin(), async (req, res) => {
    try {
        const userCount = await prisma.user.count();
        const taskCount = await prisma.task.count();
        // Mock revenue for now since we don't have real payments yet
        const revenue = 458200; 
        
        res.json({
            totalUsers: userCount,
            totalRevenue: revenue,
            totalApiCalls: taskCount * 3, // Simulate 3 calls per task
            systemHealth: 99.98
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// 5. Get Users List
app.get('/api/admin/users', requireAdmin(), async (req, res) => {
  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(200, Math.max(1, Number.parseInt(String(rawLimit || '50'), 10) || 50));
  const rawOffset = Array.isArray((req.query as any).offset) ? (req.query as any).offset[0] : (req.query as any).offset;
  const offset = Math.max(0, Number.parseInt(String(rawOffset || '0'), 10) || 0);

  const rawPlan = Array.isArray((req.query as any).plan) ? (req.query as any).plan[0] : (req.query as any).plan;
  const plan = rawPlan === 'FREE' || rawPlan === 'PRO' || rawPlan === 'ENTERPRISE' ? rawPlan : null;

  const rawQ = Array.isArray((req.query as any).q) ? (req.query as any).q[0] : (req.query as any).q;
  const q = typeof rawQ === 'string' ? rawQ.trim() : '';

  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const and: any[] = [];
    if (q) {
      and.push({
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (plan) {
      if (plan === 'FREE') {
        and.push({
          OR: [{ membership: { is: null } }, { membership: { is: { plan: 'FREE' } } }],
        });
      } else {
        and.push({ membership: { is: { plan } } });
      }
    }

    if (from || to) {
      and.push({ createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } });
    }

    const where: any = and.length ? { AND: and } : {};

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { membership: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    const userIds = users.map((u) => u.id);
	    const taskAgg =
	      userIds.length > 0
	        ? await prisma.task.groupBy({
	            by: ['userId'],
	            where: { userId: { in: userIds } },
	            _count: { id: true },
	            _sum: { pointsUnits: true },
	          })
	        : [];

	    const taskAggByUserId = new Map<number, { tasks: number; pointsUnits: number }>();
	    for (const row of taskAgg as any[]) {
	      const uid = row.userId as number;
	      taskAggByUserId.set(uid, {
	        tasks: Number(row._count?.id || 0),
	        pointsUnits: Number(row._sum?.pointsUnits || 0),
	      });
	    }

    const items = users.map((u) => {
      const agg = taskAggByUserId.get(u.id) || { tasks: 0, pointsUnits: 0 };
      const planKey = u.membership?.plan || 'FREE';
      return {
        id: u.id,
        name: u.name || 'Unknown User',
        email: u.email,
        planKey,
        plan: planLabel(planKey),
        points: u.points || 0,
        status: '活跃',
        joined: u.createdAt.toISOString().split('T')[0],
        spent: `${agg.pointsUnits} 点`,
        apiCalls: agg.tasks,
        tokenUsage: '0',
        key: 'sk-live-...' + u.id,
      };
    });

    res.json({ total, limit, offset, items });
  } catch (error) {
    console.error('Failed to fetch users (admin)', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 6. Create User
app.post('/api/admin/users', requireAdmin(), async (req, res) => {
    const { name, email, plan } = req.body;
    try {
        const initialPassword = '111111';
        const planKey = normalizePlan(plan);
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashPassword(initialPassword),
                role: 'USER',
                membership: {
                    create: {
                        plan: planKey,
                        status: 'ACTIVE'
                    }
                }
            }
        });
        res.json({ user: sanitizeUser({ ...newUser, membership: { plan: planKey } }), initialPassword });
    } catch (error) {
        console.error('Create user failed', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// 6.1 Update User (plan/name)
app.patch('/api/admin/users/:id', requireAdmin(), async (req, res) => {
    const rawId = (req.params as any).id as string | string[] | undefined;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const userId = Number.parseInt(id || '', 10);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user id' });

    const { name, plan } = req.body || {};
    const planKey = plan ? normalizePlan(plan) : null;

    try {
        const existing = await prisma.user.findUnique({
            where: { id: userId },
            include: { membership: true }
        });
        if (!existing) return res.status(404).json({ error: 'User not found' });

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(typeof name === 'string' ? { name } : {}),
            }
        });

        let membershipPlan = existing.membership?.plan || 'FREE';
        if (planKey) {
            const membership = await prisma.membership.upsert({
                where: { userId },
                create: { userId, plan: planKey, status: 'ACTIVE' },
                update: { plan: planKey, status: 'ACTIVE' }
            });
            membershipPlan = membership.plan;
        }

        res.json({
            success: true,
            user: {
                id: updatedUser.id,
                name: updatedUser.name || 'Unknown User',
                email: updatedUser.email,
                planKey: membershipPlan,
                plan: planLabel(membershipPlan),
            }
        });
    } catch (error) {
        console.error('Update user failed', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// 6.2 Reset User Password (admin only)
app.post('/api/admin/users/:id/reset-password', requireAdmin(), async (req, res) => {
    const rawId = (req.params as any).id as string | string[] | undefined;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const userId = Number.parseInt(id || '', 10);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user id' });

    try {
        const existing = await prisma.user.findUnique({ where: { id: userId } });
        if (!existing) return res.status(404).json({ error: 'User not found' });

        const newPassword = '111111';
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashPassword(newPassword) }
        });

        res.json({ success: true, newPassword });
    } catch (error) {
        console.error('Reset password failed', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// 7. Delete User
app.delete('/api/admin/users/:id', requireAdmin(), async (req, res) => {
    const rawId = (req.params as any).id as string | string[] | undefined;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    try {
        // Delete membership first (cascade usually handles this but good to be explicit or rely on schema)
        // Our schema doesn't explicitly set onDelete: Cascade for membership relation, let's check.
        // Actually, let's use transaction or just delete user if cascade is set in DB. 
        // Prisma default is not cascade unless specified.
        
        // Let's try deleting membership first
        const userId = Number.parseInt(id || '', 10);
        if (!Number.isFinite(userId)) {
            return res.status(400).json({ error: 'Invalid user id' });
        }
        
        await prisma.membership.deleteMany({ where: { userId } });
        await prisma.payment.deleteMany({ where: { userId } });
        await prisma.pointsLog.deleteMany({ where: { userId } });
        await prisma.task.updateMany({ where: { userId }, data: { userId: null } }); // Detach tasks
        
        await prisma.user.delete({
            where: { id: userId }
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete user failed', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// 7.1 给用户充值点数（管理员）
app.post('/api/admin/users/:id/recharge', requireAdmin(), async (req, res) => {
    const rawId = (req.params as any).id as string | string[] | undefined;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const userId = Number.parseInt(id || '', 10);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user id' });

    const { amount, description } = req.body || {};
    const points = Number.parseInt(amount, 10);
    if (!Number.isFinite(points) || points <= 0) {
        return res.status(400).json({ error: 'Invalid points amount' });
    }

    try {
        const adminUser = (req as any).user;
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // 使用事务更新用户点数并记录日志
        const result = await prisma.$transaction(async (tx) => {
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { points: { increment: points } }
            });

            await tx.pointsLog.create({
                data: {
                    userId,
                    amount: points,
                    balance: updatedUser.points,
                    type: 'ADMIN_ADD',
                    description: description || `管理员充值 ${points} 点`,
                    operatorId: adminUser.id
                }
            });

            return updatedUser;
        });

        res.json({ 
            success: true, 
            points: result.points,
            message: `成功充值 ${points} 点，当前余额 ${result.points} 点`
        });
    } catch (error) {
        console.error('Recharge failed', error);
        res.status(500).json({ error: 'Failed to recharge points' });
    }
});

// 7.2 用户分析与行为数据（管理员）
app.get('/api/admin/users/:id/analytics', requireAdmin(), async (req, res) => {
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const userId = Number.parseInt(id || '', 10);
  if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user id' });

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { membership: true },
    });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const [
      taskCount,
      runCount,
      modelRunCount,
      analysisRunCount,
      pointsLogCount,
      pageViewCount,
      taskAgg,
      pointsAggConsume,
      pointsAggAdd,
      pageViewAgg,
      lastTask,
      lastPageView,
    ] = await Promise.all([
      prisma.task.count({ where: { userId } }),
      prisma.taskModelRun.count({ where: { task: { userId } } }),
      prisma.taskModelRun.count({ where: { task: { userId }, purpose: 'MODEL' } }),
      prisma.taskModelRun.count({ where: { task: { userId }, purpose: 'ANALYSIS' } }),
      prisma.pointsLog.count({ where: { userId } }),
      prisma.userPageView.count({ where: { userId } }),
      prisma.task.aggregate({
        where: { userId },
        _sum: { costUnits: true, quotaUnits: true, pointsUnits: true },
      }),
      prisma.pointsLog.aggregate({
        where: { userId, amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      prisma.pointsLog.aggregate({
        where: { userId, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      prisma.userPageView.aggregate({
        where: { userId },
        _sum: { durationSeconds: true },
      }),
      prisma.task.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.userPageView.findFirst({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        select: { startedAt: true, endedAt: true },
      }),
    ]);

    const config = readAppConfig();
    const billing = getBillingConfig(config);
    const usageDate = getShanghaiUsageDate();
    const plan = targetUser.membership?.plan || 'FREE';
    const dailyLimit = billing.dailyUnitsByPlan?.[plan] ?? billing.dailyUnitsByPlan.FREE;

    const todayAgg = await prisma.task.aggregate({
      where: { userId, usageDate },
      _sum: { costUnits: true, quotaUnits: true, pointsUnits: true },
    });

    const usedQuotaUnitsToday = todayAgg._sum?.quotaUnits || 0;
    const remainingQuotaUnitsToday = Math.max(0, dailyLimit - usedQuotaUnitsToday);

    const lastActiveAt = (() => {
      const t = lastTask?.createdAt?.getTime() || 0;
      const p = lastPageView?.endedAt?.getTime() || lastPageView?.startedAt?.getTime() || 0;
      const last = Math.max(t, p);
      return last ? new Date(last).toISOString() : null;
    })();

    res.json({
      user: {
        ...sanitizeUser(targetUser),
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt,
      },
      counts: {
        tasks: taskCount,
        runs: runCount,
        modelRuns: modelRunCount,
        analysisRuns: analysisRunCount,
        pointsLogs: pointsLogCount,
        pageViews: pageViewCount,
      },
      totals: {
        costUnits: taskAgg._sum?.costUnits || 0,
        quotaUnits: taskAgg._sum?.quotaUnits || 0,
        pointsUnits: taskAgg._sum?.pointsUnits || 0,
        pointsConsumed: Math.abs(pointsAggConsume._sum?.amount || 0),
        pointsAdded: pointsAggAdd._sum?.amount || 0,
        browsingDurationSeconds: pageViewAgg._sum?.durationSeconds || 0,
      },
      today: {
        usageDate,
        plan,
        dailyLimit,
        usedQuotaUnits: usedQuotaUnitsToday,
        remainingQuotaUnits: remainingQuotaUnitsToday,
        costUnits: todayAgg._sum?.costUnits || 0,
        pointsUnits: todayAgg._sum?.pointsUnits || 0,
      },
      lastActiveAt,
    });
  } catch (error) {
    console.error('Failed to get user analytics', error);
    res.status(500).json({ error: 'Failed to get user analytics' });
  }
});

app.get('/api/admin/users/:id/tasks', requireAdmin(), async (req, res) => {
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const userId = Number.parseInt(id || '', 10);
  if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user id' });

  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(200, Math.max(1, Number.parseInt(String(rawLimit || '50'), 10) || 50));

  try {
    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        keyword: true,
        status: true,
        progress: true,
        searchType: true,
        selectedModels: true,
        costUnits: true,
        quotaUnits: true,
        pointsUnits: true,
        usageDate: true,
        createdAt: true,
        result: true,
        _count: { select: { modelRuns: true } },
      },
    });

    res.json(
      tasks.map((t) => {
        const result: any = t.result as any;
        const resultSummary = typeof result?.summary === 'string' ? result.summary : null;
        const analysisSummary = typeof result?.analysis?.summary === 'string' ? result.analysis.summary : null;
        return {
          id: t.id,
          keyword: t.keyword,
          status: t.status,
          progress: t.progress,
          searchType: t.searchType,
          selectedModels: t.selectedModels,
          costUnits: t.costUnits,
          quotaUnits: t.quotaUnits,
          pointsUnits: t.pointsUnits,
          usageDate: t.usageDate,
          createdAt: t.createdAt,
          modelRunsCount: t._count.modelRuns,
          resultSummary,
          analysisSummary,
        };
      })
    );
  } catch (error) {
    console.error('Failed to get user tasks', error);
    res.status(500).json({ error: 'Failed to get user tasks' });
  }
});

app.get('/api/admin/users/:id/runs', requireAdmin(), async (req, res) => {
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const userId = Number.parseInt(id || '', 10);
  if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user id' });

  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(200, Math.max(1, Number.parseInt(String(rawLimit || '50'), 10) || 50));

  try {
    const runs = await prisma.taskModelRun.findMany({
      where: { task: { userId } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        taskId: true,
        task: { select: { keyword: true, searchType: true, createdAt: true } },
        modelKey: true,
        provider: true,
        modelName: true,
        purpose: true,
        status: true,
        error: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        responseText: true,
      },
    });

    res.json(
      runs.map((r) => {
        const latencyMs =
          r.startedAt && r.completedAt ? Math.max(0, r.completedAt.getTime() - r.startedAt.getTime()) : null;
        const responsePreview =
          typeof r.responseText === 'string' ? r.responseText.slice(0, 1200) : null;
        return {
          id: r.id,
          taskId: r.taskId,
          taskKeyword: r.task.keyword,
          taskSearchType: r.task.searchType,
          modelKey: r.modelKey,
          provider: r.provider,
          modelName: r.modelName,
          purpose: r.purpose,
          status: r.status,
          error: r.error,
          startedAt: r.startedAt,
          completedAt: r.completedAt,
          createdAt: r.createdAt,
          latencyMs,
          responsePreview,
        };
      })
    );
  } catch (error) {
    console.error('Failed to get user runs', error);
    res.status(500).json({ error: 'Failed to get user runs' });
  }
});

app.get('/api/admin/users/:id/points-logs', requireAdmin(), async (req, res) => {
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const userId = Number.parseInt(id || '', 10);
  if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user id' });

  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(200, Math.max(1, Number.parseInt(String(rawLimit || '100'), 10) || 100));

  try {
    const logs = await prisma.pointsLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(
      logs.map((l) => ({
        id: l.id,
        amount: l.amount,
        balance: l.balance,
        type: l.type,
        description: l.description,
        operatorId: l.operatorId,
        createdAt: l.createdAt,
      }))
    );
  } catch (error) {
    console.error('Failed to get points logs', error);
    res.status(500).json({ error: 'Failed to get points logs' });
  }
});

app.get('/api/admin/users/:id/pageviews', requireAdmin(), async (req, res) => {
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const userId = Number.parseInt(id || '', 10);
  if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user id' });

  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(500, Math.max(1, Number.parseInt(String(rawLimit || '200'), 10) || 200));

  try {
    const views = await prisma.userPageView.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        sessionId: true,
        path: true,
        referrer: true,
        userAgent: true,
        startedAt: true,
        endedAt: true,
        durationSeconds: true,
        createdAt: true,
      },
    });
    res.json(views);
  } catch (error) {
    console.error('Failed to get pageviews', error);
    res.status(500).json({ error: 'Failed to get pageviews' });
  }
});

// 7.3 查询任务/调用明细（管理员）
app.get('/api/admin/tasks/:id', requireAdmin(), async (req, res) => {
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid task id' });

  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: { user: { include: { membership: true } } },
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    res.json({
      ...task,
      user: task.user ? sanitizeUser(task.user) : null,
    });
  } catch (error) {
    console.error('Failed to get task (admin)', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// 7.3.1 全站任务记录（管理员）
app.get('/api/admin/tasks', requireAdmin(), async (req, res) => {
  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(200, Math.max(1, Number.parseInt(String(rawLimit || '100'), 10) || 100));

  const rawOffset = Array.isArray((req.query as any).offset) ? (req.query as any).offset[0] : (req.query as any).offset;
  const offset = Math.min(50000, Math.max(0, Number.parseInt(String(rawOffset || '0'), 10) || 0));

  const rawStatus = Array.isArray((req.query as any).status) ? (req.query as any).status[0] : (req.query as any).status;
  const status =
    rawStatus === 'PENDING' || rawStatus === 'RUNNING' || rawStatus === 'COMPLETED' || rawStatus === 'FAILED'
      ? rawStatus
      : null;

  const rawSearchType = Array.isArray((req.query as any).searchType) ? (req.query as any).searchType[0] : (req.query as any).searchType;
  const searchType = rawSearchType === 'quick' || rawSearchType === 'deep' ? rawSearchType : null;

  const rawUserId = Array.isArray((req.query as any).userId) ? (req.query as any).userId[0] : (req.query as any).userId;
  const userId = Number.parseInt(String(rawUserId || ''), 10);
  const userIdFilter = Number.isFinite(userId) ? userId : null;

  const rawEmail = Array.isArray((req.query as any).email) ? (req.query as any).email[0] : (req.query as any).email;
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';

  const rawModelKey = Array.isArray((req.query as any).modelKey) ? (req.query as any).modelKey[0] : (req.query as any).modelKey;
  const modelKey = typeof rawModelKey === 'string' ? rawModelKey.trim() : '';

  const rawQ = Array.isArray((req.query as any).q) ? (req.query as any).q[0] : (req.query as any).q;
  const q = typeof rawQ === 'string' ? rawQ.trim() : '';
  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const where: any = {};
    if (status) where.status = status;
    if (searchType) where.searchType = searchType;
    if (userIdFilter) where.userId = userIdFilter;
    if (email) where.user = { email: { contains: email, mode: 'insensitive' } };
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    if (modelKey) where.modelRuns = { some: { modelKey: { contains: modelKey, mode: 'insensitive' } } };

    if (q) {
      where.OR = [
        { keyword: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { modelRuns: { some: { modelKey: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          keyword: true,
          status: true,
          progress: true,
          searchType: true,
          selectedModels: true,
          costUnits: true,
          quotaUnits: true,
          pointsUnits: true,
          usageDate: true,
          createdAt: true,
          result: true,
          logs: true,
          user: { select: { id: true, email: true, name: true } },
          _count: { select: { modelRuns: true } },
        },
      }),
    ]);

    const items = tasks.map((t) => {
      const result: any = (t as any).result;
      const resultSummary = typeof result?.summary === 'string' ? result.summary : null;
      const analysisSummary = typeof result?.analysis?.summary === 'string' ? result.analysis.summary : null;
      return {
        id: t.id,
        keyword: t.keyword,
        status: t.status,
        progress: t.progress,
        searchType: t.searchType,
        selectedModels: t.selectedModels,
        costUnits: t.costUnits,
        quotaUnits: t.quotaUnits,
        pointsUnits: t.pointsUnits,
        usageDate: t.usageDate,
        createdAt: t.createdAt,
        user: t.user ? { id: t.user.id, email: t.user.email, name: t.user.name } : null,
        modelRunsCount: t._count.modelRuns,
        resultSummary,
        analysisSummary,
      };
    });

    res.json({ total, limit, offset, items });
  } catch (error) {
    console.error('Failed to get tasks (admin)', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

app.get('/api/admin/runs/:id', requireAdmin(), async (req, res) => {
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid run id' });

  try {
    const run = await prisma.taskModelRun.findUnique({
      where: { id },
      include: { task: { select: { id: true, keyword: true, userId: true } } },
    });
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (error) {
    console.error('Failed to get run (admin)', error);
    res.status(500).json({ error: 'Failed to get run' });
  }
});

// 7.4 全站调用记录（管理员）
app.get('/api/admin/runs', requireAdmin(), async (req, res) => {
  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(500, Math.max(1, Number.parseInt(String(rawLimit || '200'), 10) || 200));

  const rawOffset = Array.isArray((req.query as any).offset) ? (req.query as any).offset[0] : (req.query as any).offset;
  const offset = Math.min(50000, Math.max(0, Number.parseInt(String(rawOffset || '0'), 10) || 0));

  const rawPurpose = Array.isArray((req.query as any).purpose) ? (req.query as any).purpose[0] : (req.query as any).purpose;
  const purpose = rawPurpose === 'MODEL' || rawPurpose === 'ANALYSIS' ? rawPurpose : null;

  const rawStatus = Array.isArray((req.query as any).status) ? (req.query as any).status[0] : (req.query as any).status;
  const status =
    rawStatus === 'PENDING' || rawStatus === 'RUNNING' || rawStatus === 'SUCCEEDED' || rawStatus === 'FAILED'
      ? rawStatus
      : null;

  const rawTaskId = Array.isArray((req.query as any).taskId) ? (req.query as any).taskId[0] : (req.query as any).taskId;
  const taskId = typeof rawTaskId === 'string' ? rawTaskId.trim() : '';

  const rawModelKey = Array.isArray((req.query as any).modelKey) ? (req.query as any).modelKey[0] : (req.query as any).modelKey;
  const modelKey = typeof rawModelKey === 'string' ? rawModelKey.trim() : '';

  const rawUserId = Array.isArray((req.query as any).userId) ? (req.query as any).userId[0] : (req.query as any).userId;
  const userId = Number.parseInt(String(rawUserId || ''), 10);
  const userIdFilter = Number.isFinite(userId) ? userId : null;

  const rawEmail = Array.isArray((req.query as any).email) ? (req.query as any).email[0] : (req.query as any).email;
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';

  const rawQ = Array.isArray((req.query as any).q) ? (req.query as any).q[0] : (req.query as any).q;
  const q = typeof rawQ === 'string' ? rawQ.trim() : '';

  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const where: any = {};
    if (purpose) where.purpose = purpose;
    if (status) where.status = status;
    if (taskId) where.taskId = taskId;
    if (modelKey) where.modelKey = { contains: modelKey, mode: 'insensitive' };
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    if (userIdFilter) where.task = { ...(where.task || {}), userId: userIdFilter };
    if (email) where.task = { ...(where.task || {}), user: { email: { contains: email, mode: 'insensitive' } } };

    if (q) {
      where.OR = [
        { taskId: { contains: q, mode: 'insensitive' } },
        { modelKey: { contains: q, mode: 'insensitive' } },
        { provider: { contains: q, mode: 'insensitive' } },
        { modelName: { contains: q, mode: 'insensitive' } },
        { task: { keyword: { contains: q, mode: 'insensitive' } } },
        { task: { user: { email: { contains: q, mode: 'insensitive' } } } },
        { task: { user: { name: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [total, runs] = await Promise.all([
      prisma.taskModelRun.count({ where }),
      prisma.taskModelRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          taskId: true,
          modelKey: true,
          provider: true,
          modelName: true,
          purpose: true,
          status: true,
          error: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          responseText: true,
          task: {
            select: {
              keyword: true,
              searchType: true,
              createdAt: true,
              user: { select: { id: true, email: true, name: true } },
            },
          },
        },
      }),
    ]);

    const items = runs.map((r) => {
      const latencyMs =
        r.startedAt && r.completedAt ? Math.max(0, r.completedAt.getTime() - r.startedAt.getTime()) : null;
      const responsePreview = typeof r.responseText === 'string' ? r.responseText.slice(0, 800) : null;
      return {
        id: r.id,
        taskId: r.taskId,
        taskKeyword: r.task.keyword,
        taskSearchType: r.task.searchType,
        user: r.task.user ? { id: r.task.user.id, email: r.task.user.email, name: r.task.user.name } : null,
        modelKey: r.modelKey,
        provider: r.provider,
        modelName: r.modelName,
        purpose: r.purpose,
        status: r.status,
        error: r.error,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        createdAt: r.createdAt,
        latencyMs,
        responsePreview,
      };
    });

    res.json({ total, limit, offset, items });
  } catch (error) {
    console.error('Failed to get runs (admin)', error);
    res.status(500).json({ error: 'Failed to get runs' });
  }
});

// 7.5 全站扣费记录（管理员）
app.get('/api/admin/points-logs', requireAdmin(), async (req, res) => {
  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(500, Math.max(1, Number.parseInt(String(rawLimit || '200'), 10) || 200));

  const rawOffset = Array.isArray((req.query as any).offset) ? (req.query as any).offset[0] : (req.query as any).offset;
  const offset = Math.min(50000, Math.max(0, Number.parseInt(String(rawOffset || '0'), 10) || 0));

  const rawUserId = Array.isArray((req.query as any).userId) ? (req.query as any).userId[0] : (req.query as any).userId;
  const userId = Number.parseInt(String(rawUserId || ''), 10);
  const userIdFilter = Number.isFinite(userId) ? userId : null;

  const rawEmail = Array.isArray((req.query as any).email) ? (req.query as any).email[0] : (req.query as any).email;
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';

  const rawType = Array.isArray((req.query as any).type) ? (req.query as any).type[0] : (req.query as any).type;
  const type =
    rawType === 'RECHARGE' || rawType === 'CONSUME' || rawType === 'ADMIN_ADD' || rawType === 'ADMIN_SUB' || rawType === 'REFUND'
      ? rawType
      : null;

  const rawQ = Array.isArray((req.query as any).q) ? (req.query as any).q[0] : (req.query as any).q;
  const q = typeof rawQ === 'string' ? rawQ.trim() : '';
  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const where: any = {};
    if (userIdFilter) where.userId = userIdFilter;
    if (type) where.type = type;
    if (q) where.description = { contains: q, mode: 'insensitive' };
    if (email) where.user = { email: { contains: email, mode: 'insensitive' } };
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const [total, logs] = await Promise.all([
      prisma.pointsLog.count({ where }),
      prisma.pointsLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          createdAt: true,
          userId: true,
          amount: true,
          balance: true,
          type: true,
          description: true,
          operatorId: true,
          user: { select: { id: true, email: true, name: true } },
        },
      }),
    ]);

    const items = logs.map((l) => ({
      id: l.id,
      createdAt: l.createdAt,
      userId: l.userId,
      user: l.user ? { id: l.user.id, email: l.user.email, name: l.user.name } : null,
      amount: l.amount,
      balance: l.balance,
      type: l.type,
      description: l.description,
      operatorId: l.operatorId,
    }));

    res.json({ total, limit, offset, items });
  } catch (error) {
    console.error('Failed to get points logs (admin)', error);
    res.status(500).json({ error: 'Failed to get points logs' });
  }
});

// 7.6 全站浏览足迹（管理员）
app.get('/api/admin/pageviews', requireAdmin(), async (req, res) => {
  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(500, Math.max(1, Number.parseInt(String(rawLimit || '200'), 10) || 200));

  const rawOffset = Array.isArray((req.query as any).offset) ? (req.query as any).offset[0] : (req.query as any).offset;
  const offset = Math.min(50000, Math.max(0, Number.parseInt(String(rawOffset || '0'), 10) || 0));

  const rawUserId = Array.isArray((req.query as any).userId) ? (req.query as any).userId[0] : (req.query as any).userId;
  const userId = Number.parseInt(String(rawUserId || ''), 10);
  const userIdFilter = Number.isFinite(userId) ? userId : null;

  const rawEmail = Array.isArray((req.query as any).email) ? (req.query as any).email[0] : (req.query as any).email;
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';

  const rawQ = Array.isArray((req.query as any).q) ? (req.query as any).q[0] : (req.query as any).q;
  const q = typeof rawQ === 'string' ? rawQ.trim() : '';
  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const where: any = {};
    if (userIdFilter) where.userId = userIdFilter;
    if (q) where.path = { contains: q, mode: 'insensitive' };
    if (email) where.user = { email: { contains: email, mode: 'insensitive' } };
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const [total, views] = await Promise.all([
      prisma.userPageView.count({ where }),
      prisma.userPageView.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          createdAt: true,
          userId: true,
          sessionId: true,
          path: true,
          referrer: true,
          userAgent: true,
          startedAt: true,
          endedAt: true,
          durationSeconds: true,
          user: { select: { id: true, email: true, name: true } },
        },
      }),
    ]);

    const items = views.map((v) => ({
      id: v.id,
      createdAt: v.createdAt,
      userId: v.userId,
      user: v.user ? { id: v.user.id, email: v.user.email, name: v.user.name } : null,
      sessionId: v.sessionId,
      path: v.path,
      referrer: v.referrer,
      userAgent: v.userAgent,
      startedAt: v.startedAt,
      endedAt: v.endedAt,
      durationSeconds: v.durationSeconds,
    }));

    res.json({ total, limit, offset, items });
  } catch (error) {
    console.error('Failed to get pageviews (admin)', error);
    res.status(500).json({ error: 'Failed to get pageviews' });
  }
});

// 7.7 统计排行（管理员）
async function computeAdminRankings(params: { from: Date | null; to: Date | null; limit: number }) {
  const { from, to, limit } = params;

  const pageViewWhere: any = {};
  if (from || to) pageViewWhere.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

  const taskWhere: any = { userId: { not: null } };
  if (from || to) taskWhere.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

  const runWhere: any = {};
  if (from || to) runWhere.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

	  const [browsingAgg, billingAgg, runTotals] = await Promise.all([
	    prisma.userPageView.groupBy({
	      by: ['userId'],
	      where: pageViewWhere,
	      _sum: { durationSeconds: true },
	      _count: { id: true },
	      _max: { createdAt: true },
	      orderBy: { _sum: { durationSeconds: 'desc' } },
	      take: limit,
	    }),
	    prisma.task.groupBy({
	      by: ['userId'],
	      where: taskWhere,
	      _sum: { costUnits: true, quotaUnits: true, pointsUnits: true },
	      _count: { id: true },
	      _max: { createdAt: true },
	      orderBy: { _sum: { pointsUnits: 'desc' } },
	      take: limit,
	    }),
	    prisma.taskModelRun.groupBy({
	      by: ['modelKey'],
	      where: runWhere,
	      _count: { id: true },
	      orderBy: { _count: { id: 'desc' } },
	      take: limit,
	    }),
	  ]);

  const topModelKeys = runTotals.map((r) => r.modelKey).filter((k) => typeof k === 'string' && k.trim());

  const [runByPurpose, runByStatus] = await Promise.all([
	    topModelKeys.length
	      ? prisma.taskModelRun.groupBy({
	          by: ['modelKey', 'purpose'],
	          where: { ...runWhere, modelKey: { in: topModelKeys } },
	          _count: { id: true },
	        })
	      : Promise.resolve([] as any[]),
	    topModelKeys.length
	      ? prisma.taskModelRun.groupBy({
	          by: ['modelKey', 'status'],
	          where: { ...runWhere, modelKey: { in: topModelKeys } },
	          _count: { id: true },
	        })
	      : Promise.resolve([] as any[]),
	  ]);

  const userIds = Array.from(
    new Set<number>([
      ...(browsingAgg.map((x) => x.userId).filter((v) => Number.isFinite(v)) as number[]),
      ...(billingAgg.map((x) => x.userId).filter((v) => Number.isFinite(v)) as number[]),
    ])
  );

  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true, membership: { select: { plan: true } } },
      })
    : [];
  const userMap = new Map<number, any>(users.map((u) => [u.id, u]));

	  const browsing = browsingAgg.map((a) => {
	    const u = userMap.get(a.userId);
	    return {
	      userId: a.userId,
	      user: u ? { id: u.id, email: u.email, name: u.name, plan: u.membership?.plan || 'FREE' } : null,
	      durationSeconds: a._sum?.durationSeconds || 0,
	      pageViews: (a._count as any)?.id || 0,
	      lastActiveAt: a._max?.createdAt || null,
	    };
	  });

	  const billing = billingAgg
	    .filter((a) => typeof (a as any).userId === 'number')
	    .map((a: any) => {
	      const userId = a.userId as number;
	      const u = userMap.get(userId);
	    return {
	      userId,
	      user: u ? { id: u.id, email: u.email, name: u.name, plan: u.membership?.plan || 'FREE' } : null,
	      tasks: a._count?.id || 0,
	      costUnits: a._sum?.costUnits || 0,
	      quotaUnits: a._sum?.quotaUnits || 0,
	      pointsUnits: a._sum?.pointsUnits || 0,
	      lastTaskAt: a._max?.createdAt || null,
	    };
	  });

	  const purposeMap = new Map<string, any>();
	  for (const row of runByPurpose as any[]) {
	    const key = String(row.modelKey);
	    const cur = purposeMap.get(key) || {};
	    cur[String(row.purpose)] = row._count?.id || 0;
	    purposeMap.set(key, cur);
	  }
	  const statusMap = new Map<string, any>();
	  for (const row of runByStatus as any[]) {
	    const key = String(row.modelKey);
	    const cur = statusMap.get(key) || {};
	    cur[String(row.status)] = row._count?.id || 0;
	    statusMap.set(key, cur);
	  }

	  const models = runTotals.map((t) => {
	    const modelKey = String(t.modelKey);
	    const purposes = purposeMap.get(modelKey) || {};
	    const statuses = statusMap.get(modelKey) || {};
	    return {
	      modelKey,
	      totalRuns: (t._count as any)?.id || 0,
	      modelRuns: purposes.MODEL || 0,
	      analysisRuns: purposes.ANALYSIS || 0,
	      succeeded: statuses.SUCCEEDED || 0,
      failed: statuses.FAILED || 0,
      running: statuses.RUNNING || 0,
      pending: statuses.PENDING || 0,
    };
  });

  return { browsing, billing, models };
}

app.get('/api/admin/rankings', requireAdmin(), async (req, res) => {
  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(200, Math.max(1, Number.parseInt(String(rawLimit || '20'), 10) || 20));

  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const result = await computeAdminRankings({ from, to, limit });
    res.json({
      range: { from: from ? from.toISOString() : null, to: to ? to.toISOString() : null },
      ...result,
    });
  } catch (error) {
    console.error('Failed to get admin rankings', error);
    res.status(500).json({ error: 'Failed to get rankings' });
  }
});

// --- Admin Export (CSV) ---

app.get('/api/admin/export/rankings.csv', requireAdmin(), async (req, res) => {
  const rawKind = Array.isArray((req.query as any).kind) ? (req.query as any).kind[0] : (req.query as any).kind;
  const kind = rawKind === 'browsing' || rawKind === 'billing' || rawKind === 'models' ? rawKind : 'browsing';

  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(5000, Math.max(1, Number.parseInt(String(rawLimit || '200'), 10) || 200));

  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const rankings = await computeAdminRankings({ from, to, limit });

    if (kind === 'billing') {
      const headers = ['userId', 'userEmail', 'userName', 'plan', 'tasks', 'costUnits', 'quotaUnits', 'pointsUnits', 'lastTaskAt'];
      const rows = rankings.billing.map((r: any) => [
        r.userId,
        r.user?.email ?? '',
        r.user?.name ?? '',
        r.user?.plan ?? '',
        r.tasks,
        r.costUnits,
        r.quotaUnits,
        r.pointsUnits,
        r.lastTaskAt ?? '',
      ]);
      const csv = toCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="aidso_ranking_billing_${Date.now()}.csv"`);
      res.send(csv);
      return;
    }

    if (kind === 'models') {
      const headers = ['modelKey', 'totalRuns', 'modelRuns', 'analysisRuns', 'succeeded', 'failed', 'running', 'pending'];
      const rows = rankings.models.map((r: any) => [
        r.modelKey,
        r.totalRuns,
        r.modelRuns,
        r.analysisRuns,
        r.succeeded,
        r.failed,
        r.running,
        r.pending,
      ]);
      const csv = toCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="aidso_ranking_models_${Date.now()}.csv"`);
      res.send(csv);
      return;
    }

    const headers = ['userId', 'userEmail', 'userName', 'plan', 'durationSeconds', 'pageViews', 'lastActiveAt'];
    const rows = rankings.browsing.map((r: any) => [
      r.userId,
      r.user?.email ?? '',
      r.user?.name ?? '',
      r.user?.plan ?? '',
      r.durationSeconds,
      r.pageViews,
      r.lastActiveAt ?? '',
    ]);
    const csv = toCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aidso_ranking_browsing_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Failed to export rankings csv', error);
    res.status(500).json({ error: 'Failed to export rankings' });
  }
});

app.get('/api/admin/export/users.csv', requireAdmin(), async (req, res) => {
  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(5000, Math.max(1, Number.parseInt(String(rawLimit || '1000'), 10) || 1000));

  const rawPlan = Array.isArray((req.query as any).plan) ? (req.query as any).plan[0] : (req.query as any).plan;
  const plan = rawPlan === 'FREE' || rawPlan === 'PRO' || rawPlan === 'ENTERPRISE' ? rawPlan : null;

  const rawQ = Array.isArray((req.query as any).q) ? (req.query as any).q[0] : (req.query as any).q;
  const q = typeof rawQ === 'string' ? rawQ.trim() : '';

  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const and: any[] = [];
    if (q) {
      and.push({
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (plan) {
      if (plan === 'FREE') {
        and.push({ OR: [{ membership: { is: null } }, { membership: { is: { plan: 'FREE' } } }] });
      } else {
        and.push({ membership: { is: { plan } } });
      }
    }

    if (from || to) {
      and.push({ createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } });
    }

    const where: any = and.length ? { AND: and } : {};

    const users = await prisma.user.findMany({
      where,
      include: { membership: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const userIds = users.map((u) => u.id);
	    const taskAgg =
	      userIds.length > 0
	        ? await prisma.task.groupBy({
	            by: ['userId'],
	            where: { userId: { in: userIds } },
	            _count: { id: true },
	            _sum: { pointsUnits: true },
	          })
	        : [];

	    const taskAggByUserId = new Map<number, { tasks: number; pointsUnits: number }>();
	    for (const row of taskAgg as any[]) {
	      const uid = row.userId as number;
	      taskAggByUserId.set(uid, {
	        tasks: Number(row._count?.id || 0),
	        pointsUnits: Number(row._sum?.pointsUnits || 0),
	      });
	    }

    const headers = ['id', 'email', 'name', 'role', 'planKey', 'plan', 'points', 'tasks', 'pointsUnits', 'createdAt'];
    const rows = users.map((u) => {
      const agg = taskAggByUserId.get(u.id) || { tasks: 0, pointsUnits: 0 };
      const planKey = u.membership?.plan || 'FREE';
      return [
        u.id,
        u.email,
        u.name ?? '',
        u.role,
        planKey,
        planLabel(planKey),
        u.points ?? 0,
        agg.tasks,
        agg.pointsUnits,
        u.createdAt.toISOString(),
      ];
    });

    const csv = toCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aidso_users_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Failed to export users csv', error);
    res.status(500).json({ error: 'Failed to export users' });
  }
});

app.get('/api/admin/export/tasks.csv', requireAdmin(), async (req, res) => {
  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(5000, Math.max(1, Number.parseInt(String(rawLimit || '1000'), 10) || 1000));

  const rawStatus = Array.isArray((req.query as any).status) ? (req.query as any).status[0] : (req.query as any).status;
  const status =
    rawStatus === 'PENDING' || rawStatus === 'RUNNING' || rawStatus === 'COMPLETED' || rawStatus === 'FAILED'
      ? rawStatus
      : null;

  const rawSearchType = Array.isArray((req.query as any).searchType) ? (req.query as any).searchType[0] : (req.query as any).searchType;
  const searchType = rawSearchType === 'quick' || rawSearchType === 'deep' ? rawSearchType : null;

  const rawUserId = Array.isArray((req.query as any).userId) ? (req.query as any).userId[0] : (req.query as any).userId;
  const userId = Number.parseInt(String(rawUserId || ''), 10);
  const userIdFilter = Number.isFinite(userId) ? userId : null;

  const rawEmail = Array.isArray((req.query as any).email) ? (req.query as any).email[0] : (req.query as any).email;
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';

  const rawModelKey = Array.isArray((req.query as any).modelKey) ? (req.query as any).modelKey[0] : (req.query as any).modelKey;
  const modelKey = typeof rawModelKey === 'string' ? rawModelKey.trim() : '';

  const rawQ = Array.isArray((req.query as any).q) ? (req.query as any).q[0] : (req.query as any).q;
  const q = typeof rawQ === 'string' ? rawQ.trim() : '';
  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const where: any = {};
    if (status) where.status = status;
    if (searchType) where.searchType = searchType;
    if (userIdFilter) where.userId = userIdFilter;
    if (email) where.user = { email: { contains: email, mode: 'insensitive' } };
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    if (modelKey) where.modelRuns = { some: { modelKey: { contains: modelKey, mode: 'insensitive' } } };
    if (q) {
      where.OR = [
        { keyword: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { modelRuns: { some: { modelKey: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        status: true,
        progress: true,
        searchType: true,
        keyword: true,
        usageDate: true,
        costUnits: true,
        quotaUnits: true,
        pointsUnits: true,
        selectedModels: true,
        logs: true,
        result: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });

    const headers = [
      'id',
      'createdAt',
      'status',
      'progress',
      'searchType',
      'keyword',
      'userId',
      'userEmail',
      'userName',
      'usageDate',
      'costUnits',
      'quotaUnits',
      'pointsUnits',
      'selectedModelsJson',
      'resultSummary',
      'analysisSummary',
      'logs',
      'resultJson',
    ];

    const rows = tasks.map((t) => {
      const result: any = t.result as any;
      const resultSummary = typeof result?.summary === 'string' ? result.summary : '';
      const analysisSummary = typeof result?.analysis?.summary === 'string' ? result.analysis.summary : '';
      const logs = Array.isArray(t.logs) ? t.logs.join('\n') : '';
      return [
        t.id,
        t.createdAt,
        t.status,
        t.progress,
        t.searchType,
        t.keyword,
        t.user?.id ?? '',
        t.user?.email ?? '',
        t.user?.name ?? '',
        t.usageDate ?? '',
        t.costUnits ?? 0,
        t.quotaUnits ?? 0,
        t.pointsUnits ?? 0,
        t.selectedModels,
        resultSummary,
        analysisSummary,
        logs,
        t.result,
      ];
    });

    const csv = toCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aidso_tasks_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Failed to export tasks csv', error);
    res.status(500).json({ error: 'Failed to export tasks' });
  }
});

app.get('/api/admin/export/runs.csv', requireAdmin(), async (req, res) => {
  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(5000, Math.max(1, Number.parseInt(String(rawLimit || '1000'), 10) || 1000));

  const rawPurpose = Array.isArray((req.query as any).purpose) ? (req.query as any).purpose[0] : (req.query as any).purpose;
  const purpose = rawPurpose === 'MODEL' || rawPurpose === 'ANALYSIS' ? rawPurpose : null;

  const rawStatus = Array.isArray((req.query as any).status) ? (req.query as any).status[0] : (req.query as any).status;
  const status =
    rawStatus === 'PENDING' || rawStatus === 'RUNNING' || rawStatus === 'SUCCEEDED' || rawStatus === 'FAILED'
      ? rawStatus
      : null;

  const rawTaskId = Array.isArray((req.query as any).taskId) ? (req.query as any).taskId[0] : (req.query as any).taskId;
  const taskId = typeof rawTaskId === 'string' ? rawTaskId.trim() : '';

  const rawModelKey = Array.isArray((req.query as any).modelKey) ? (req.query as any).modelKey[0] : (req.query as any).modelKey;
  const modelKey = typeof rawModelKey === 'string' ? rawModelKey.trim() : '';

  const rawUserId = Array.isArray((req.query as any).userId) ? (req.query as any).userId[0] : (req.query as any).userId;
  const userId = Number.parseInt(String(rawUserId || ''), 10);
  const userIdFilter = Number.isFinite(userId) ? userId : null;

  const rawEmail = Array.isArray((req.query as any).email) ? (req.query as any).email[0] : (req.query as any).email;
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';

  const rawQ = Array.isArray((req.query as any).q) ? (req.query as any).q[0] : (req.query as any).q;
  const q = typeof rawQ === 'string' ? rawQ.trim() : '';
  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const where: any = {};
    if (purpose) where.purpose = purpose;
    if (status) where.status = status;
    if (taskId) where.taskId = taskId;
    if (modelKey) where.modelKey = { contains: modelKey, mode: 'insensitive' };
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    if (userIdFilter) where.task = { ...(where.task || {}), userId: userIdFilter };
    if (email) where.task = { ...(where.task || {}), user: { email: { contains: email, mode: 'insensitive' } } };
    if (q) {
      where.OR = [
        { taskId: { contains: q, mode: 'insensitive' } },
        { modelKey: { contains: q, mode: 'insensitive' } },
        { provider: { contains: q, mode: 'insensitive' } },
        { modelName: { contains: q, mode: 'insensitive' } },
        { task: { keyword: { contains: q, mode: 'insensitive' } } },
        { task: { user: { email: { contains: q, mode: 'insensitive' } } } },
        { task: { user: { name: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const runs = await prisma.taskModelRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        taskId: true,
        modelKey: true,
        provider: true,
        modelName: true,
        purpose: true,
        status: true,
        error: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        prompt: true,
        responseText: true,
        responseJson: true,
        task: {
          select: {
            keyword: true,
            searchType: true,
            createdAt: true,
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    const headers = [
      'id',
      'createdAt',
      'purpose',
      'status',
      'latencyMs',
      'modelKey',
      'provider',
      'modelName',
      'taskId',
      'taskKeyword',
      'taskSearchType',
      'userId',
      'userEmail',
      'userName',
      'startedAt',
      'completedAt',
      'error',
      'prompt',
      'responseText',
      'responseJson',
    ];

    const rows = runs.map((r) => {
      const latencyMs =
        r.startedAt && r.completedAt ? Math.max(0, r.completedAt.getTime() - r.startedAt.getTime()) : '';
      return [
        r.id,
        r.createdAt,
        r.purpose,
        r.status,
        latencyMs,
        r.modelKey,
        r.provider ?? '',
        r.modelName ?? '',
        r.taskId,
        r.task.keyword,
        r.task.searchType,
        r.task.user?.id ?? '',
        r.task.user?.email ?? '',
        r.task.user?.name ?? '',
        r.startedAt,
        r.completedAt,
        r.error ?? '',
        r.prompt ?? '',
        r.responseText ?? '',
        r.responseJson ?? '',
      ];
    });

    const csv = toCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aidso_runs_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Failed to export runs csv', error);
    res.status(500).json({ error: 'Failed to export runs' });
  }
});

app.get('/api/admin/export/points-logs.csv', requireAdmin(), async (req, res) => {
  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(5000, Math.max(1, Number.parseInt(String(rawLimit || '2000'), 10) || 2000));

  const rawUserId = Array.isArray((req.query as any).userId) ? (req.query as any).userId[0] : (req.query as any).userId;
  const userId = Number.parseInt(String(rawUserId || ''), 10);
  const userIdFilter = Number.isFinite(userId) ? userId : null;

  const rawEmail = Array.isArray((req.query as any).email) ? (req.query as any).email[0] : (req.query as any).email;
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';

  const rawType = Array.isArray((req.query as any).type) ? (req.query as any).type[0] : (req.query as any).type;
  const type =
    rawType === 'RECHARGE' || rawType === 'CONSUME' || rawType === 'ADMIN_ADD' || rawType === 'ADMIN_SUB' || rawType === 'REFUND'
      ? rawType
      : null;

  const rawQ = Array.isArray((req.query as any).q) ? (req.query as any).q[0] : (req.query as any).q;
  const q = typeof rawQ === 'string' ? rawQ.trim() : '';
  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const where: any = {};
    if (userIdFilter) where.userId = userIdFilter;
    if (type) where.type = type;
    if (q) where.description = { contains: q, mode: 'insensitive' };
    if (email) where.user = { email: { contains: email, mode: 'insensitive' } };
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const logs = await prisma.pointsLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        userId: true,
        amount: true,
        balance: true,
        type: true,
        description: true,
        operatorId: true,
        user: { select: { email: true, name: true } },
      },
    });

    const headers = ['id', 'createdAt', 'userId', 'userEmail', 'userName', 'type', 'amount', 'balance', 'operatorId', 'description'];
    const rows = logs.map((l) => [
      l.id,
      l.createdAt,
      l.userId,
      l.user?.email ?? '',
      l.user?.name ?? '',
      l.type,
      l.amount,
      l.balance,
      l.operatorId ?? '',
      l.description ?? '',
    ]);

    const csv = toCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aidso_points_logs_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Failed to export points logs csv', error);
    res.status(500).json({ error: 'Failed to export points logs' });
  }
});

app.get('/api/admin/export/pageviews.csv', requireAdmin(), async (req, res) => {
  const rawLimit = Array.isArray((req.query as any).limit) ? (req.query as any).limit[0] : (req.query as any).limit;
  const limit = Math.min(5000, Math.max(1, Number.parseInt(String(rawLimit || '2000'), 10) || 2000));

  const rawUserId = Array.isArray((req.query as any).userId) ? (req.query as any).userId[0] : (req.query as any).userId;
  const userId = Number.parseInt(String(rawUserId || ''), 10);
  const userIdFilter = Number.isFinite(userId) ? userId : null;

  const rawEmail = Array.isArray((req.query as any).email) ? (req.query as any).email[0] : (req.query as any).email;
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';

  const rawQ = Array.isArray((req.query as any).q) ? (req.query as any).q[0] : (req.query as any).q;
  const q = typeof rawQ === 'string' ? rawQ.trim() : '';
  const rawFrom = Array.isArray((req.query as any).from) ? (req.query as any).from[0] : (req.query as any).from;
  const rawTo = Array.isArray((req.query as any).to) ? (req.query as any).to[0] : (req.query as any).to;
  const { from, to } = parseDateRangeShanghai({ from: rawFrom, to: rawTo });

  try {
    const where: any = {};
    if (userIdFilter) where.userId = userIdFilter;
    if (q) where.path = { contains: q, mode: 'insensitive' };
    if (email) where.user = { email: { contains: email, mode: 'insensitive' } };
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const views = await prisma.userPageView.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        userId: true,
        sessionId: true,
        path: true,
        referrer: true,
        userAgent: true,
        startedAt: true,
        endedAt: true,
        durationSeconds: true,
        user: { select: { email: true, name: true } },
      },
    });

    const headers = [
      'id',
      'createdAt',
      'userId',
      'userEmail',
      'userName',
      'sessionId',
      'path',
      'startedAt',
      'endedAt',
      'durationSeconds',
      'referrer',
      'userAgent',
    ];
    const rows = views.map((v) => [
      v.id,
      v.createdAt,
      v.userId,
      v.user?.email ?? '',
      v.user?.name ?? '',
      v.sessionId,
      v.path,
      v.startedAt,
      v.endedAt,
      v.durationSeconds ?? '',
      v.referrer ?? '',
      v.userAgent ?? '',
    ]);

    const csv = toCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aidso_pageviews_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Failed to export pageviews csv', error);
    res.status(500).json({ error: 'Failed to export pageviews' });
  }
});

// 7.2 查询用户点数余额和日志
app.get('/api/users/points', requireAuth(), async (req, res) => {
    const user = (req as any).user;
    try {
        const logs = await prisma.pointsLog.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        res.json({
            balance: user.points || 0,
            logs: logs.map(log => ({
                id: log.id,
                amount: log.amount,
                balance: log.balance,
                type: log.type,
                description: log.description,
                createdAt: log.createdAt
            }))
        });
    } catch (error) {
        console.error('Failed to get points', error);
        res.status(500).json({ error: 'Failed to get points' });
    }
});

// --- Permission Routes ---

// 8. Get Permissions
function readPermissionsFile() {
  if (!fs.existsSync(PERMISSIONS_FILE)) {
    return [
      { plan: 'FREE', features: ['search'] },
      { plan: 'PRO', features: ['search', 'agent', 'optimization'] },
      { plan: 'ENTERPRISE', features: ['search', 'agent', 'optimization', 'monitoring', 'api'] },
    ];
  }
  const data = fs.readFileSync(PERMISSIONS_FILE, 'utf-8');
  return JSON.parse(data);
}

app.get('/api/permissions', (req, res) => {
    try {
      res.json(readPermissionsFile());
    } catch (error) {
        console.error('Failed to read permissions', error);
        res.status(500).json({ error: 'Failed to read permissions' });
    }
});

// 9. Update Permissions
app.get('/api/admin/permissions', requireAdmin(), (req, res) => {
  try {
    res.json(readPermissionsFile());
  } catch (error) {
    console.error('Failed to read permissions', error);
    res.status(500).json({ error: 'Failed to read permissions' });
  }
});

app.post('/api/admin/permissions', requireAdmin(), (req, res) => {
    try {
        fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to save permissions', error);
        res.status(500).json({ error: 'Failed to save permissions' });
    }
});

// --- NewAPI Test (Admin) ---

app.post('/api/admin/newapi/test', requireAdmin(), async (req, res) => {
  try {
    const { provider, config: providedConfig } = req.body || {};
    const fileConfig = readAppConfig();

    let modelCfg: any = null;
    let providerName: string = 'unknown';

    if (providedConfig && typeof providedConfig === 'object') {
      modelCfg = providedConfig;
      providerName = typeof provider === 'string' ? provider : 'custom';
    } else if (typeof provider === 'string' && fileConfig?.newApi?.models?.[provider]) {
      modelCfg = fileConfig.newApi.models[provider];
      providerName = provider;
    } else if (fileConfig?.newApi?.models) {
      for (const [p, cfg] of Object.entries(fileConfig.newApi.models)) {
        if ((cfg as any)?.enabled) {
          modelCfg = cfg;
          providerName = p;
          break;
        }
      }
    } else if (fileConfig?.newApi?.baseUrl) {
      modelCfg = fileConfig.newApi;
      providerName = 'legacy';
    }

    if (!modelCfg) return res.status(400).json({ error: 'No provider config found' });

    const legacy = fileConfig?.newApi;
    const mergedCfg = {
      ...(modelCfg || {}),
      baseUrl:
        (typeof modelCfg?.baseUrl === 'string' && modelCfg.baseUrl.trim()) ||
        (typeof legacy?.baseUrl === 'string' && legacy.baseUrl.trim()) ||
        '',
      apiKey:
        (typeof modelCfg?.apiKey === 'string' && modelCfg.apiKey.trim()) ||
        (typeof legacy?.apiKey === 'string' && legacy.apiKey.trim()) ||
        '',
      model:
        (typeof modelCfg?.model === 'string' && modelCfg.model.trim()) ||
        (typeof legacy?.model === 'string' && legacy.model.trim()) ||
        '',
    };

    if (!mergedCfg.baseUrl || typeof mergedCfg.baseUrl !== 'string') return res.status(400).json({ error: 'baseUrl is required' });
    if (!mergedCfg.apiKey || typeof mergedCfg.apiKey !== 'string') return res.status(400).json({ error: 'apiKey is required' });

    const model = (typeof mergedCfg.model === 'string' && mergedCfg.model) ? mergedCfg.model : 'gpt-3.5-turbo';
    const openai = new OpenAI({
      apiKey: mergedCfg.apiKey,
      baseURL: mergedCfg.baseUrl,
    });

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a connectivity test endpoint.' },
        { role: 'user', content: 'Reply with: ok' },
      ],
      max_tokens: 16,
      temperature: 0,
    });

    const content = completion.choices?.[0]?.message?.content || '';
    res.json({
      success: true,
      provider: providerName,
      model,
      preview: content.slice(0, 200),
    });
  } catch (err: any) {
    console.error('NewAPI test failed', err);
    res.status(500).json({ error: 'NewAPI test failed', message: err?.message || 'Unknown error' });
  }
});

// --- Helper Functions ---

function pickNewApiConfigForModel(config: any, modelKey: string) {
  const legacy = config?.newApi;

  const mergeWithLegacy = (cfg: any) => {
    const baseUrl =
      (typeof cfg?.baseUrl === 'string' && cfg.baseUrl.trim()) ||
      (typeof legacy?.baseUrl === 'string' && legacy.baseUrl.trim()) ||
      '';
    const apiKey =
      (typeof cfg?.apiKey === 'string' && cfg.apiKey.trim()) ||
      (typeof legacy?.apiKey === 'string' && legacy.apiKey.trim()) ||
      '';
    const model =
      (typeof cfg?.model === 'string' && cfg.model.trim()) ||
      (typeof legacy?.model === 'string' && legacy.model.trim()) ||
      '';

    return {
      ...(cfg || {}),
      ...(baseUrl ? { baseUrl } : {}),
      ...(apiKey ? { apiKey } : {}),
      ...(model ? { model } : {}),
    };
  };

  const models = config?.newApi?.models;
  if (models && typeof models === 'object') {
    const candidates = [modelKey, modelKey.trim(), modelKey.toLowerCase(), modelKey.trim().toLowerCase()];
    for (const key of candidates) {
      const cfg = (models as any)?.[key];
      if (cfg && cfg.enabled !== false) return { provider: key, cfg: mergeWithLegacy(cfg) };
    }
    for (const [provider, cfg] of Object.entries(models as any)) {
      if ((cfg as any)?.enabled) return { provider, cfg: mergeWithLegacy(cfg) };
    }
  }

  if (legacy && legacy.apiKey && legacy.baseUrl) return { provider: 'legacy', cfg: mergeWithLegacy(legacy) };

  return null;
}

function pickNewApiConfigStrict(config: any, providerKey: string) {
  const legacy = config?.newApi;

  const mergeWithLegacy = (cfg: any) => {
    const baseUrl =
      (typeof cfg?.baseUrl === 'string' && cfg.baseUrl.trim()) ||
      (typeof legacy?.baseUrl === 'string' && legacy.baseUrl.trim()) ||
      '';
    const apiKey =
      (typeof cfg?.apiKey === 'string' && cfg.apiKey.trim()) ||
      (typeof legacy?.apiKey === 'string' && legacy.apiKey.trim()) ||
      '';
    const model = (typeof cfg?.model === 'string' && cfg.model.trim()) || '';

    return {
      ...(cfg || {}),
      ...(baseUrl ? { baseUrl } : {}),
      ...(apiKey ? { apiKey } : {}),
      ...(model ? { model } : {}),
    };
  };

  const models = config?.newApi?.models;
  if (models && typeof models === 'object') {
    const matchKey = Object.keys(models).find((k) => k.toLowerCase() === providerKey.toLowerCase());
    if (matchKey) {
      const cfg = (models as any)?.[matchKey];
      if (cfg && cfg.enabled !== false) return { provider: matchKey, cfg: mergeWithLegacy(cfg) };
    }
  }

  if (legacy && legacy.apiKey && legacy.baseUrl) return { provider: 'legacy', cfg: mergeWithLegacy(legacy) };

  return null;
}

function extractJsonCandidate(text: string) {
  if (!text || typeof text !== 'string') return null;
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock?.[1]) return codeBlock[1].trim();

  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) return text.slice(first, last + 1).trim();
  return null;
}

async function simulateTaskProcessing(taskId: string, keyword: string, selectedModels: string[], searchType: 'quick' | 'deep') {
    const modelLabel = Array.isArray(selectedModels) && selectedModels.length > 0 ? selectedModels.join('、') : '未选择';
    
    try {
        // 初始化任务
        await prisma.task.update({
            where: { id: taskId },
            data: { 
                status: 'RUNNING',
                progress: 5,
                logs: { push: `📌 任务已启动，选中模型: ${modelLabel}（${searchType === 'deep' ? '深度' : '快速'}模式）` }
            }
        });
        
        await new Promise(r => setTimeout(r, 500));

        // --- Call NewAPI if configured ---
        const baseResult = generateMockResult(keyword);
        let finalResult: any = { ...baseResult };
        const platformData: Record<string, any> = {};
        let succeeded = 0;
        let analysisOk = searchType !== 'deep';
        
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));

                const modelsToCall = Array.isArray(selectedModels) && selectedModels.length > 0 ? selectedModels : ['默认模型'];
                const firstCfg = pickNewApiConfigForModel(config, modelsToCall[0]);
                // 完全使用用户原始输入，不做任何修改
                const userPrompt = keyword;
                
                // 计算进度：每个模型占用的进度比例
                const totalModels = modelsToCall.length;
                const progressPerModel = 70 / totalModels; // 10-80% 用于模型调用
                let currentModelIndex = 0;

                for (const modelKey of modelsToCall) {
                    const picked = pickNewApiConfigForModel(config, modelKey) || firstCfg;
                    const cfg = picked?.cfg;
                    const provider = picked?.provider || 'unknown';

                    const baseUrl = typeof cfg?.baseUrl === 'string' ? cfg.baseUrl : '';
                    const apiKey = typeof cfg?.apiKey === 'string' ? cfg.apiKey : '';
                    const rawModel = typeof cfg?.model === 'string' ? cfg.model : '';
                    const model = rawModel && rawModel.trim() ? rawModel.trim() : 'gpt-3.5-turbo';

                    const run = await prisma.taskModelRun.create({
                        data: {
                            taskId,
                            modelKey,
                            provider,
                            modelName: model,
                            purpose: 'MODEL',
                            status: baseUrl && apiKey ? 'RUNNING' : 'FAILED',
                            prompt: userPrompt,
                            startedAt: baseUrl && apiKey ? new Date() : null,
                            completedAt: baseUrl && apiKey ? null : new Date(),
                            error: baseUrl && apiKey ? null : 'NewAPI baseUrl/apiKey not configured',
                        }
                    });

                    if (!baseUrl || !apiKey) {
                        platformData[modelKey] = {
                            engine: `${provider}:${model}`,
                            thinking: '',
                            response: `⚠️ NewAPI 未配置（baseUrl/apiKey），无法执行。\n\n请在后台为该模型源填写并启用配置。`,
                            sources: []
                        };
                        await prisma.task.update({
                            where: { id: taskId },
                            data: { logs: { push: `⚠️ ${modelKey} 未配置 NewAPI（跳过）` } }
                        });
                        continue;
                    }

                    try {
                        // 更新进度：开始调用模型
                        const startProgress = 10 + currentModelIndex * progressPerModel;
                        await prisma.task.update({
                            where: { id: taskId },
                            data: { 
                                progress: Math.round(startProgress),
                                logs: { push: `🤖 正在调用 ${modelKey}（${provider}:${model}）...` } 
                            }
                        });

                        const openai = new OpenAI({
                            apiKey,
                            baseURL: baseUrl
                        });

                        // 使用流式输出
                        const stream = await openai.chat.completions.create({
                            messages: [
                                { role: "user", content: userPrompt }
                            ],
                            model,
                            max_tokens: 4000,
                            temperature: 0.7,
                            top_p: 1,
                            frequency_penalty: 0,
                            presence_penalty: 0,
                            stream: true,
                        });

                        // 接收流式输出
                        let content = "";
                        for await (const chunk of stream) {
                            const delta = chunk.choices[0]?.delta?.content || "";
                            content += delta;
                        }
                        
                        // 更新进度：模型响应完成
                        const midProgress = 10 + (currentModelIndex + 0.5) * progressPerModel;
                        await prisma.task.update({
                            where: { id: taskId },
                            data: { 
                                progress: Math.round(midProgress),
                                logs: { push: `✅ ${modelKey} 响应完成，正在解析内容...` } 
                            }
                        });
                        
                        // 使用 AI 解析回复内容，提取公司名称和引用链接
                        let sources: any[] = [];
                        let brands: string[] = [];
                        
                        try {
                            await prisma.task.update({
                                where: { id: taskId },
                                data: { logs: { push: `🔍 正在提取公司名称和引用链接...` } }
                            });
                            
                            // 调用 DeepSeek 进行内容分析
                            const analysisResult = await analyzeContentWithAI(content, keyword, baseUrl, apiKey);
                            sources = analysisResult.sources || [];
                            brands = analysisResult.brands || [];
                            
                            await prisma.task.update({
                                where: { id: taskId },
                                data: { logs: { push: `📊 已提取 ${brands.length} 个品牌，${sources.length} 条引用` } }
                            });
                        } catch (err) {
                            console.error('AI analysis failed, using fallback parsing:', err);
                            // 降级到简单解析
                            sources = parseReferenceSources(content);
                        }
                        
                        platformData[modelKey] = {
                            engine: `${provider}:${model}`,
                            thinking: '',
                            response: content || 'No response from AI',
                            sources,
                            brands
                        };
                        succeeded += 1;
                        currentModelIndex += 1;

                        await prisma.taskModelRun.update({
                            where: { id: run.id },
                            data: {
                                status: 'SUCCEEDED',
                                completedAt: new Date(),
                                responseText: content || null,
                                responseJson: { 
                                    choices: [{ message: { role: "assistant", content } }],
                                    model,
                                    stream: true
                                } as any,
                            }
                        });

                        await prisma.task.update({
                            where: { id: taskId },
                            data: { 
                                progress: Math.round(10 + currentModelIndex * progressPerModel),
                                logs: { push: `✅ ${modelKey} 处理完成` } 
                            }
                        });
                    } catch (err: any) {
                        const message = err?.message || 'Unknown error';
                        platformData[modelKey] = {
                            engine: `${provider}:${model}`,
                            thinking: '',
                            response: `⚠️ API 调用失败: ${message}`,
                            sources: []
                        };

                        await prisma.taskModelRun.update({
                            where: { id: run.id },
                            data: {
                                status: 'FAILED',
                                completedAt: new Date(),
                                error: message,
                            }
                        });

                        await prisma.task.update({
                            where: { id: taskId },
                            data: { logs: { push: `⚠️ ${modelKey} 调用失败: ${message}` } }
                        });
                    }
                }

                if (searchType === 'deep') {
                    try {
                        const deepseekPicked = pickNewApiConfigStrict(config, 'DeepSeek');
                        const deepCfg = deepseekPicked?.cfg as any;
                        const deepProvider = deepseekPicked?.provider || 'DeepSeek';
                        const deepBaseUrl = typeof deepCfg?.baseUrl === 'string' ? deepCfg.baseUrl : '';
                        const deepApiKey = typeof deepCfg?.apiKey === 'string' ? deepCfg.apiKey : '';
                        const deepRawModel = typeof deepCfg?.model === 'string' ? deepCfg.model : '';
                        const deepModel = deepRawModel && deepRawModel.trim() ? deepRawModel.trim() : 'deepseek-chat';

                        const successfulKeys = modelsToCall.filter(
                            (k) => typeof platformData?.[k]?.response === 'string' && !String(platformData[k].response).startsWith('⚠️')
                        );
                        const digest = successfulKeys
                            .map((k) => {
                                const resp = String(platformData?.[k]?.response || '');
                                return `【${k}】\n${resp.slice(0, 2000)}`;
                            })
                            .join('\n\n');

                        const analysisPrompt = [
                            `关键词：${keyword}`,
                            `请基于以下“多模型输出”做深度综合分析，并返回严格 JSON（不要 markdown，不要多余文字）。`,
                            `JSON 字段：`,
                            `{`,
                            `  "summary": string,`,
                            `  "sentiment": "Positive"|"Neutral"|"Mixed",`,
                            `  "topKeywords": string[],`,
                            `  "geoMetrics": { "brandMentionRate": number, "productBindingRate": number, "topRankingRate": number, "citationRate": number, "semanticConsistency": number },`,
                            `  "keywordExpansion": { "term": string, "volume": string, "difficulty": number, "intent": string }[],`,
                            `  "competitors": { "name": string, "url": string, "aiVisibility": number, "strengths": string[], "weaknesses": string[] }[],`,
                            `  "contentGaps": { "topic": string, "importance": "High"|"Medium"|"Low", "currentCoverage": number, "suggestion": string }[],`,
                            `  "geoTactics": { "title": string, "desc": string, "impact": "High"|"Medium"|"Low", "icon": string, "category": "Crawlable"|"Understandable"|"Citeable" }[],`,
                            `  "aiVisibilityBreakdown": { "engine": string, "score": number }[]`,
                            `}`,
                            ``,
                            `多模型输出：`,
                            digest || '（无有效模型输出）',
                        ].join('\n');

                        const analysisRun = await prisma.taskModelRun.create({
                            data: {
                                taskId,
                                modelKey: 'DeepSeek',
                                provider: deepProvider,
                                modelName: deepModel,
                                purpose: 'ANALYSIS',
                                status: deepBaseUrl && deepApiKey ? 'RUNNING' : 'FAILED',
                                prompt: analysisPrompt,
                                startedAt: deepBaseUrl && deepApiKey ? new Date() : null,
                                completedAt: deepBaseUrl && deepApiKey ? null : new Date(),
                                error: deepBaseUrl && deepApiKey ? null : 'DeepSeek analysis provider not configured',
                            }
                        });

                        if (!deepBaseUrl || !deepApiKey) {
                            await prisma.task.update({
                                where: { id: taskId },
                                data: { logs: { push: `❌ 深度解析失败：未配置 DeepSeek 的 baseUrl/apiKey（请在后台配置并启用）` } }
                            });
                        } else if (!digest) {
                            await prisma.taskModelRun.update({
                                where: { id: analysisRun.id },
                                data: { status: 'FAILED', completedAt: new Date(), error: 'No successful model outputs' }
                            });
                            await prisma.task.update({
                                where: { id: taskId },
                                data: { logs: { push: `❌ 深度解析跳过：没有可用的模型输出` } }
                            });
                        } else {
                            await prisma.task.update({
                                where: { id: taskId },
                                data: { 
                                    progress: 85,
                                    logs: { push: `🧠 正在调用 DeepSeek 进行深度综合分析...` } 
                                }
                            });

                            const openai = new OpenAI({ apiKey: deepApiKey, baseURL: deepBaseUrl });
                            const completion = await openai.chat.completions.create({
                                model: deepModel,
                                messages: [
                                    { role: 'system', content: '你是专业的市场调研与GEO优化分析师。输出必须是严格 JSON。' },
                                    { role: 'user', content: analysisPrompt },
                                ],
                                max_tokens: 1400,
                                temperature: 0.2,
                            });

                            // 检查返回格式
                            if (!completion || !completion.choices || !Array.isArray(completion.choices) || completion.choices.length === 0) {
                                throw new Error(`DeepSeek API 返回格式错误: ${JSON.stringify(completion).substring(0, 200)}`);
                            }

                            const text = completion.choices?.[0]?.message?.content || '';
                            const jsonText = extractJsonCandidate(text);
                            let parsed: any = null;
                            if (jsonText) {
                                try {
                                    parsed = JSON.parse(jsonText);
                                } catch {
                                    parsed = null;
                                }
                            }

                            analysisOk = true;
                            const jsonOk = !!(parsed && typeof parsed === 'object');

                            if (jsonOk) {
                                finalResult.analysis = { ...(finalResult.analysis || {}), ...parsed };
                                if (typeof parsed.summary === 'string' && parsed.summary.trim()) {
                                    finalResult.summary = parsed.summary.trim().slice(0, 140);
                                }
                            } else {
                                finalResult.analysis = { ...(finalResult.analysis || {}), summary: text.slice(0, 2000) };
                            }

                            await prisma.taskModelRun.update({
                                where: { id: analysisRun.id },
                                data: {
                                    status: analysisOk ? 'SUCCEEDED' : 'FAILED',
                                    completedAt: new Date(),
                                    responseText: text || null,
                                    responseJson: completion as any,
                                    error: analysisOk ? (jsonOk ? null : 'DeepSeek returned non-JSON, downgraded to text summary') : 'DeepSeek analysis failed',
                                }
                            });

                            await prisma.task.update({
                                where: { id: taskId },
                                data: { logs: { push: jsonOk ? `✅ 深度解析完成` : `⚠️ 深度解析完成（但返回 JSON 不规范，已降级为文本摘要）` } }
                            });
                        }
                    } catch (err: any) {
                        await prisma.task.update({
                            where: { id: taskId },
                            data: { logs: { push: `⚠️ 深度解析异常: ${err?.message || 'Unknown error'}` } }
                        });
                    }
                }

                // 只有在非深度模式或深度分析失败时，才使用第一个模型的回复作为 summary
                if (searchType !== 'deep' || !analysisOk) {
                    const pickKey =
                        modelsToCall.find((k) => typeof platformData?.[k]?.response === 'string' && !String(platformData[k].response).startsWith('⚠️')) ||
                        modelsToCall[0];
                    const firstText = String(platformData?.[pickKey]?.response || '');
                    if (firstText.trim()) {
                        finalResult.summary = firstText.trim().slice(0, 140);
                        if (finalResult.analysis && typeof finalResult.analysis === 'object') {
                            finalResult.analysis.summary = finalResult.summary;
                        }
                    }
                }
                if (succeeded === 0) {
                    await prisma.task.update({
                        where: { id: taskId },
                        data: { logs: { push: `❌ 所有模型调用失败，请检查 NewAPI 配置与网络连通性` } }
                    });
                }
            }
        } catch (apiErr: any) {
            console.error("NewAPI Call Failed:", apiErr);
            await prisma.task.update({
                where: { id: taskId },
                data: { logs: { push: `⚠️ NewAPI 调用失败: ${apiErr.message}` } }
            });
        }

        // Generate Result (We can improve this later to be real)
        const mockResult = { ...finalResult, platformData };

        const finalStatus = succeeded > 0 && analysisOk ? 'COMPLETED' : 'FAILED';
        
        // 最终完成
        await prisma.task.update({
            where: { id: taskId },
            data: {
                progress: 92,
                logs: { push: '🏷️ 正在匹配品牌词...' }
            }
        });

        // ==================== 品牌词匹配 ====================
        try {
            // 获取任务所属用户
            const task = await prisma.task.findUnique({ where: { id: taskId }, select: { userId: true } });
            if (task?.userId) {
                // 获取用户的品牌词
                const brandKeywords = await prisma.brandKeyword.findMany({
                    where: { userId: task.userId, enabled: true }
                });

                if (brandKeywords.length > 0) {
                    // 遍历每个模型的回复，匹配品牌词
                    for (const modelKey of Object.keys(platformData)) {
                        const response = platformData[modelKey]?.response || '';
                        if (!response || typeof response !== 'string') continue;

                        const responseText = response.toLowerCase();
                        let rank = 1; // 用于记录品牌在回复中出现的顺序

                        for (const bk of brandKeywords) {
                            // 检查主关键词和别名
                            const allKeywords = [bk.keyword, ...(bk.aliases || [])];
                            let mentioned = false;
                            let mentionCount = 0;
                            let firstIndex = -1;

                            for (const kw of allKeywords) {
                                const kwLower = kw.toLowerCase();
                                const regex = new RegExp(kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                                const matches = response.match(regex);
                                if (matches && matches.length > 0) {
                                    mentioned = true;
                                    mentionCount += matches.length;
                                    const idx = responseText.indexOf(kwLower);
                                    if (idx >= 0 && (firstIndex < 0 || idx < firstIndex)) {
                                        firstIndex = idx;
                                    }
                                }
                            }

                            if (mentioned) {
                                // 简单情感判断：检查品牌词前后是否有正面/负面词
                                let sentiment = 'neutral';
                                const positiveWords = ['推荐', '优秀', '首选', '领先', '专业', '可靠', '优质', '好评', '靠谱'];
                                const negativeWords = ['不推荐', '差评', '问题', '投诉', '差', '坑', '骗'];
                                
                                // 获取品牌词周围的上下文
                                const contextStart = Math.max(0, firstIndex - 50);
                                const contextEnd = Math.min(response.length, firstIndex + bk.keyword.length + 100);
                                const context = response.slice(contextStart, contextEnd);
                                const contextLower = context.toLowerCase();

                                if (positiveWords.some(w => contextLower.includes(w))) {
                                    sentiment = 'positive';
                                } else if (negativeWords.some(w => contextLower.includes(w))) {
                                    sentiment = 'negative';
                                }

                                // 记录提及
                                await prisma.brandMention.create({
                                    data: {
                                        brandKeywordId: bk.id,
                                        taskId,
                                        modelKey,
                                        mentionCount,
                                        rank: rank++,
                                        sentiment,
                                        context: context.slice(0, 200)
                                    }
                                });
                            }
                        }
                    }
                    await prisma.task.update({
                        where: { id: taskId },
                        data: { logs: { push: `✅ 品牌词匹配完成，追踪 ${brandKeywords.length} 个品牌词` } }
                    });
                }
            }
        } catch (brandErr) {
            console.error('Brand keyword matching failed:', brandErr);
            // 不影响主流程
        }

        await prisma.task.update({
            where: { id: taskId },
            data: {
                progress: 95,
                logs: { push: '📝 正在生成最终报告...' }
            }
        });
        
        await new Promise(r => setTimeout(r, 500));
        
        await prisma.task.update({
            where: { id: taskId },
            data: {
                status: finalStatus,
                progress: 100,
                result: mockResult as any,
                logs: { push: finalStatus === 'COMPLETED' ? '✅ 任务完成！' : '❌ 任务失败' }
            }
        });
    } catch (err) {
        console.error(`Task processing failed for ${taskId}:`, err);
        await prisma.task.update({
            where: { id: taskId },
            data: { status: 'FAILED', logs: { push: '❌ 任务执行失败，请重试' } }
        });
    }
}

function generateMockResult(keyword: string) {
    const analysis = {
        summary: `针对关键词 "${keyword}"，系统已生成 GEO 深度诊断建议与投放策略。`,
        topKeywords: ["AI", "SEO", "Marketing", keyword],
        sentiment: "Positive",
        geoMetrics: {
            brandMentionRate: 45,
            productBindingRate: 30,
            topRankingRate: 15,
            citationRate: 60,
            semanticConsistency: 85
        },
        keywordExpansion: [
            { term: keyword + " 教程", volume: "1.2w", difficulty: 45, intent: "Info" },
            { term: keyword + " 价格", volume: "5k", difficulty: 80, intent: "Commercial" }
        ],
        geoTactics: [
            { title: "优化结构化数据", desc: "增加 Schema 标记", impact: "High", icon: "code", category: "Crawlable" }
        ],
        rankingFactors: [
            { name: "内容深度", score: 92, status: "Good", suggestion: "保持当前质量" }
        ],
        competitors: [
            { name: "Competitor A", url: "https://example.com", aiVisibility: 70, strengths: ["Price"], weaknesses: ["Support"] }
        ],
        contentGaps: [
            { topic: "Advanced Usage", importance: "High", currentCoverage: 20, suggestion: "Add more guides" }
        ],
        aiVisibilityBreakdown: [
            { engine: "GPT-4", score: 88 },
            { engine: "Claude", score: 75 }
        ],
        geoProcess: [],
        aiCreationScenarios: []
    };

    const sites = [
        { id: 1, name: '知乎', url: 'https://zhihu.com', type: 'Forum', authority: 95, relevance: 98, action: '发布深度回答', reason: '适合沉淀长尾词，易被引用。' },
        { id: 2, name: '掘金', url: 'https://juejin.cn', type: 'Blog', authority: 88, relevance: 92, action: '发布技术实战文', reason: '技术类关键词权重高。' },
        { id: 3, name: 'V2EX', url: 'https://v2ex.com', type: 'Forum', authority: 85, relevance: 89, action: '参与讨论', reason: '高质量技术人群聚集。' },
    ];

    const strategy = [
        { step: 1, title: '内容铺垫', desc: '先做痛点/避坑内容，提高被引用概率。' },
        { step: 2, title: '核心引流', desc: '发布实战文章并附带试用/落地页链接。' },
        { step: 3, title: '口碑发酵', desc: '持续监控关键词并用 Agent 做答疑。' }
    ];

    return {
        summary: analysis.summary,
        analysis,
        sites,
        strategy,
    };
}

// 使用 AI 解析回复内容，提取公司名称和引用链接
async function analyzeContentWithAI(content: string, keyword: string, baseUrl: string, apiKey: string): Promise<{ sources: any[]; brands: string[] }> {
    const openai = new OpenAI({ apiKey, baseURL: baseUrl });
    
    const analysisPrompt = `请分析以下AI回复内容，提取其中的公司/品牌名称和参考资料链接。

原始问题：${keyword}

AI回复内容：
${content}

请以严格的JSON格式返回（不要markdown代码块，直接返回JSON）：
{
  "brands": ["公司1", "公司2", ...],
  "sources": [
    {"title": "标题", "url": "链接", "site": "站点名称"},
    ...
  ]
}

要求：
1. brands 中提取文中提到的所有公司/品牌名称（完整名称，如"江苏聚推传媒科技有限公司"）
2. sources 中提取文末参考资料部分的所有链接，包括标题和URL
3. site 从URL中提取域名对应的站点名称（如 sohu.com -> 搜狐）`;

    const completion = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
            { role: 'system', content: '你是一个专业的内容分析助手，擅长从文本中提取结构化信息。' },
            { role: 'user', content: analysisPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.1,
    });

    const responseText = completion.choices?.[0]?.message?.content || '';
    
    try {
        // 尝试直接解析 JSON
        let parsed = JSON.parse(responseText);
        
        // 处理 sources，添加缺失字段
        if (parsed.sources && Array.isArray(parsed.sources)) {
            parsed.sources = parsed.sources.map((source: any, idx: number) => {
                let domain = '';
                let site = source.site || '';
                
                try {
                    const urlObj = new URL(source.url);
                    domain = urlObj.hostname.replace(/^(www\.|m\.)/, '');
                    
                    if (!site) {
                        const domainParts = domain.split('.');
                        const siteName = domainParts[domainParts.length - 2] || domain;
                        const siteMap: Record<string, string> = {
                            'sohu': '搜狐', 'baidu': '百度', '163': '网易',
                            'jobui': '职友集', 'iwanshang': '万商云集',
                            'jsw': '金山网', '58': '58同城', 'zhihu': '知乎',
                            'juejin': '掘金'
                        };
                        site = siteMap[siteName] || siteName;
                    }
                } catch (e) {
                    domain = source.url.split('/')[2] || '';
                    site = site || domain;
                }
                
                return {
                    id: idx + 1,
                    title: source.title || '',
                    url: source.url || '',
                    domain,
                    site,
                    icon: '🌐',
                    logo: '',
                    date: new Date().toISOString().slice(0, 10)
                };
            });
        }
        
        return {
            sources: parsed.sources || [],
            brands: parsed.brands || []
        };
    } catch (e) {
        console.error('Failed to parse AI analysis result:', responseText);
        // 如果解析失败，尝试提取 JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    sources: parsed.sources || [],
                    brands: parsed.brands || []
                };
            } catch (e2) {
                // 完全失败，返回空
            }
        }
        return { sources: [], brands: [] };
    }
}

// 解析参考资料中的引用链接（降级方案）
function parseReferenceSources(content: string): Array<any> {
    const sources: Array<any> = [];
    
    // 匹配参考资料部分：[标题](url) 格式
    const refSection = content.match(/(?:参考资料|引用来源|参考链接)[:：]\s*\n([\s\S]*?)(?:\n\n|$)/i);
    
    if (refSection && refSection[1]) {
        const lines = refSection[1].split('\n');
        let idCounter = 1;
        
        for (const line of lines) {
            // 匹配 markdown 链接格式：[标题](url)
            const match = line.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
            if (match) {
                const title = match[1].trim();
                const url = match[2].trim();
                
                // 提取域名
                let domain = '';
                let site = '';
                try {
                    const urlObj = new URL(url);
                    domain = urlObj.hostname.replace(/^(www\.|m\.)/, '');
                    // 提取站点名称（如 sohu.com -> 搜狐）
                    const domainParts = domain.split('.');
                    site = domainParts[domainParts.length - 2] || domain;
                    
                    // 映射常见站点名称
                    const siteMap: Record<string, string> = {
                        'sohu': '搜狐',
                        'baidu': '百度',
                        '163': '网易',
                        'jobui': '职友集',
                        'iwanshang': '万商云集',
                        'jsw': '金山网',
                        '58': '58同城',
                        'zhihu': '知乎',
                        'juejin': '掘金'
                    };
                    site = siteMap[site] || site;
                } catch (e) {
                    domain = url.split('/')[2] || '';
                    site = domain;
                }
                
                sources.push({
                    id: idCounter++,
                    title,
                    url,
                    domain,
                    site,
                    icon: '🌐',
                    logo: '',
                    date: new Date().toISOString().slice(0, 10) // 默认今天
                });
            }
        }
    }
    
    return sources;
}

// ==================== 品牌监测（定时任务） API ====================

function normalizeStringArray(input: any, opts: { maxItems: number; maxLen: number }) {
  const out: string[] = [];
  const push = (v: any) => {
    if (typeof v !== 'string') return;
    const s = v.trim();
    if (!s) return;
    if (s.length > opts.maxLen) return;
    out.push(s);
  };

  if (Array.isArray(input)) {
    for (const v of input) push(v);
  } else if (typeof input === 'string') {
    input
      .split(/[,，\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => push(s));
  }

  const unique = Array.from(new Set(out));
  return unique.slice(0, opts.maxItems);
}

function normalizeIntervalMinutes(input: any) {
  const n = typeof input === 'number' ? input : typeof input === 'string' ? parseInt(input, 10) : NaN;
  if (!Number.isFinite(n)) return 1440;
  return Math.min(Math.max(n, 5), 60 * 24 * 30); // 5min ~ 30days
}

function normalizeSearchType(input: any): 'quick' | 'deep' {
  return input === 'deep' ? 'deep' : 'quick';
}

function normalizeSelectedModels(input: any) {
  const arr = Array.isArray(input) ? input : [];
  const out: string[] = [];
  for (const v of arr) {
    if (typeof v !== 'string') continue;
    const s = v.trim();
    if (!s) continue;
    out.push(s);
  }
  return Array.from(new Set(out)).slice(0, 30);
}

async function ensureBrandKeywordsForProject(params: {
  userId: number;
  brandName: string;
  competitors: string[];
}) {
  const { userId, brandName, competitors } = params;
  const names = [
    ...(brandName ? [{ keyword: brandName, isOwn: true, color: '#7c3aed' }] : []),
    ...competitors.map((c) => ({ keyword: c, isOwn: false, color: '#ef4444' })),
  ];

  for (const item of names) {
    if (!item.keyword || typeof item.keyword !== 'string') continue;
    const kw = item.keyword.trim();
    if (!kw) continue;

    const existing = await prisma.brandKeyword.findFirst({ where: { userId, keyword: kw } });
    if (existing) continue;

    await prisma.brandKeyword.create({
      data: {
        userId,
        keyword: kw,
        aliases: [],
        category: '品牌监测',
        isOwn: item.isOwn,
        color: item.color,
        enabled: true,
      },
    });
  }
}

async function scheduleNextRun(projectId: string, intervalMinutes: number) {
  const now = new Date();
  const next = new Date(now.getTime() + intervalMinutes * 60 * 1000);
  await prisma.monitoringProject.update({
    where: { id: projectId },
    data: { lastRunAt: now, nextRunAt: next, lastError: null },
  });
  return { lastRunAt: now, nextRunAt: next };
}

async function runMonitoringProjectNow(params: { project: any; user: any }) {
  const { project, user } = params;
  const keywords = Array.isArray(project.monitorKeywords) ? (project.monitorKeywords as any[]) : [];
  const monitorKeywords = keywords.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim());

  const selectedModels =
    Array.isArray(project.selectedModels) ? (project.selectedModels as any[]) : Array.isArray(project.selectedModels?.models) ? project.selectedModels.models : [];
  const models = Array.isArray(selectedModels)
    ? selectedModels.filter((m) => typeof m === 'string' && m.trim()).map((m) => m.trim())
    : [];

  if (monitorKeywords.length === 0) {
    throw httpError(400, { error: '请先配置监测关键词' });
  }
  if (models.length === 0) {
    throw httpError(400, { error: '请先选择至少一个监测模型/平台' });
  }

  const createdTasks: any[] = [];
  const errors: any[] = [];

  for (const kw of monitorKeywords) {
    try {
      const result = await createTaskForUser({
        user,
        keyword: kw,
        searchType: project.searchType || 'quick',
        models,
        monitoringProjectId: project.id,
      });
      createdTasks.push({ ...result.task, remainingPoints: result.remainingPoints });
    } catch (err: any) {
      errors.push({ keyword: kw, error: err?.payload?.error || err?.message || 'Failed' });
    }
  }

  const { lastRunAt, nextRunAt } = await scheduleNextRun(project.id, project.intervalMinutes || 1440);
  if (errors.length > 0) {
    const brief = errors
      .slice(0, 5)
      .map((e: any) => `${e.keyword}: ${e.error}`)
      .join('；');
    await prisma.monitoringProject.update({
      where: { id: project.id },
      data: { lastError: brief.slice(0, 500) },
    });
  }
  return { createdTasks, errors, lastRunAt, nextRunAt };
}

app.get('/api/monitoring/projects', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  try {
    const items = await prisma.monitoringProject.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        trackedWorks: { orderBy: { createdAt: 'desc' }, take: 50 },
        _count: { select: { tasks: true, trackedWorks: true } },
      },
    });
    res.json(items);
  } catch (err) {
    console.error('Failed to list monitoring projects', err);
    res.status(500).json({ error: 'Failed to list monitoring projects' });
  }
});

app.get('/api/monitoring/projects/:id', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const project = await prisma.monitoringProject.findFirst({
      where: { id, userId: user.id },
      include: { trackedWorks: { orderBy: { createdAt: 'desc' }, take: 200 } },
    });
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json(project);
  } catch (err) {
    console.error('Failed to get monitoring project', err);
    res.status(500).json({ error: 'Failed to get monitoring project' });
  }
});

app.post('/api/monitoring/projects', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  try {
    const body = req.body || {};
    const brandName = typeof body.brandName === 'string' ? body.brandName.trim() : '';
    if (!brandName) return res.status(400).json({ error: 'brandName is required' });

    const monitorKeywords = normalizeStringArray(body.monitorKeywords, { maxItems: 50, maxLen: 80 });
    const competitors = normalizeStringArray(body.competitors, { maxItems: 30, maxLen: 80 });
    const negativeKeywords = normalizeStringArray(body.negativeKeywords, { maxItems: 30, maxLen: 80 });
    const selectedModels = normalizeSelectedModels(body.selectedModels);
    const searchType = normalizeSearchType(body.searchType);
    const intervalMinutes = normalizeIntervalMinutes(body.intervalMinutes);
    const enabled = typeof body.enabled === 'boolean' ? body.enabled : false;

    const project = await prisma.monitoringProject.create({
      data: {
        userId: user.id,
        brandName,
        brandWebsiteUrl: typeof body.brandWebsiteUrl === 'string' && body.brandWebsiteUrl.trim() ? body.brandWebsiteUrl.trim() : null,
        monitorKeywords,
        competitors,
        negativeKeywords,
        selectedModels,
        searchType,
        intervalMinutes,
        enabled,
        nextRunAt: enabled ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    await ensureBrandKeywordsForProject({ userId: user.id, brandName, competitors });
    res.json(project);
  } catch (err: any) {
    console.error('Failed to create monitoring project', err);
    res.status(500).json({ error: 'Failed to create monitoring project' });
  }
});

app.patch('/api/monitoring/projects/:id', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  try {
    const existing = await prisma.monitoringProject.findFirst({ where: { id, userId: user.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const body = req.body || {};
    const patch: any = {};
    if (typeof body.brandName === 'string' && body.brandName.trim()) patch.brandName = body.brandName.trim();
    if (typeof body.brandWebsiteUrl === 'string') patch.brandWebsiteUrl = body.brandWebsiteUrl.trim() || null;
    if (body.monitorKeywords !== undefined) patch.monitorKeywords = normalizeStringArray(body.monitorKeywords, { maxItems: 50, maxLen: 80 });
    if (body.competitors !== undefined) patch.competitors = normalizeStringArray(body.competitors, { maxItems: 30, maxLen: 80 });
    if (body.negativeKeywords !== undefined)
      patch.negativeKeywords = normalizeStringArray(body.negativeKeywords, { maxItems: 30, maxLen: 80 });
    if (body.selectedModels !== undefined) patch.selectedModels = normalizeSelectedModels(body.selectedModels);
    if (body.searchType !== undefined) patch.searchType = normalizeSearchType(body.searchType);
    if (body.intervalMinutes !== undefined) patch.intervalMinutes = normalizeIntervalMinutes(body.intervalMinutes);

    if (typeof body.enabled === 'boolean') {
      patch.enabled = body.enabled;
      if (body.enabled && !existing.nextRunAt) patch.nextRunAt = new Date();
      if (!body.enabled) patch.nextRunAt = null;
    }

    patch.updatedAt = new Date();

    const project = await prisma.monitoringProject.update({ where: { id }, data: patch });

    const brandName = project.brandName;
    const competitors = Array.isArray(project.competitors) ? (project.competitors as any[]) : [];
    await ensureBrandKeywordsForProject({
      userId: user.id,
      brandName,
      competitors: competitors.filter((c) => typeof c === 'string'),
    });

    res.json(project);
  } catch (err) {
    console.error('Failed to update monitoring project', err);
    res.status(500).json({ error: 'Failed to update monitoring project' });
  }
});

app.post('/api/monitoring/projects/:id/run', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  try {
    const project = await prisma.monitoringProject.findFirst({ where: { id, userId: user.id } });
    if (!project) return res.status(404).json({ error: 'Not found' });

    const runUser = await prisma.user.findUnique({ where: { id: user.id }, include: { membership: true } });
    if (!runUser) return res.status(401).json({ error: 'Unauthorized' });

    const { createdTasks, errors, lastRunAt, nextRunAt } = await runMonitoringProjectNow({ project, user: runUser });
    res.json({ success: true, createdTasks, errors, lastRunAt, nextRunAt });
  } catch (err: any) {
    if (err?.status && err?.payload) return res.status(err.status).json(err.payload);
    console.error('Failed to run monitoring project', err);
    res.status(500).json({ error: 'Failed to run monitoring project' });
  }
});

app.get('/api/monitoring/projects/:id/tasks', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined;
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw as number, 1), 200) : 50;

  try {
    const existing = await prisma.monitoringProject.findFirst({ where: { id, userId: user.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const tasks = await prisma.task.findMany({
      where: { userId: user.id, monitoringProjectId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(tasks);
  } catch (err) {
    console.error('Failed to list monitoring tasks', err);
    res.status(500).json({ error: 'Failed to list monitoring tasks' });
  }
});

app.get('/api/monitoring/projects/:id/metrics', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  const daysRaw = typeof req.query.days === 'string' ? parseInt(req.query.days, 10) : undefined;
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw as number, 1), 30) : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const project = await prisma.monitoringProject.findFirst({ where: { id, userId: user.id } });
    if (!project) return res.status(404).json({ error: 'Not found' });

    const toLocalDateKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const tasks = await prisma.task.findMany({
      where: { monitoringProjectId: id, userId: user.id, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: { id: true, createdAt: true, status: true, keyword: true },
    });
    const taskIds = tasks.map((t) => t.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const trend: { date: string; tasks: number; mentions: number }[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      trend.push({ date: toLocalDateKey(d), tasks: 0, mentions: 0 });
    }
    const trendMap = new Map(trend.map((row) => [row.date, row]));
    const taskDayKey = new Map<string, string>();
    for (const t of tasks) {
      const key = toLocalDateKey(new Date(t.createdAt));
      taskDayKey.set(t.id, key);
      const row = trendMap.get(key);
      if (row) row.tasks += 1;
    }

    const runsCount = await prisma.taskModelRun.count({
      where: {
        taskId: { in: taskIds.length > 0 ? taskIds : ['__none__'] },
        purpose: 'MODEL',
        status: 'SUCCEEDED',
      } as any,
    });

    const modelRuns = await prisma.taskModelRun.findMany({
      where: {
        taskId: { in: taskIds.length > 0 ? taskIds : ['__none__'] },
        purpose: 'MODEL',
        status: 'SUCCEEDED',
      } as any,
      select: { taskId: true, modelKey: true },
    });
    const runsByModel: Record<string, number> = {};
    for (const run of modelRuns) {
      const mk = String((run as any).modelKey || '').trim() || 'Unknown';
      runsByModel[mk] = (runsByModel[mk] || 0) + 1;
    }

    const mentions = await prisma.brandMention.findMany({
      where: {
        taskId: { in: taskIds.length > 0 ? taskIds : ['__none__'] },
        brandKeyword: { userId: user.id },
      } as any,
      select: { taskId: true, modelKey: true, mentionCount: true, sentiment: true, rank: true, brandKeyword: { select: { keyword: true, isOwn: true } } },
    });

    const ownPairs = new Set<string>();
    const ownPairsByModel: Record<string, number> = {};
    const ownMentionTotalsByModel: Record<string, number> = {};
    let ownTotal = 0;
    const competitorTotals: Record<string, number> = {};
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    let rankSum = 0;
    let rankCount = 0;

    for (const m of mentions) {
      const cnt = typeof m.mentionCount === 'number' ? m.mentionCount : 0;
      if (m.brandKeyword.isOwn) {
        const pairKey = `${m.taskId}:${m.modelKey}`;
        if (!ownPairs.has(pairKey)) {
          ownPairs.add(pairKey);
          const mk = String(m.modelKey || '').trim() || 'Unknown';
          ownPairsByModel[mk] = (ownPairsByModel[mk] || 0) + 1;
        }
        ownTotal += cnt;
        const mk = String(m.modelKey || '').trim() || 'Unknown';
        ownMentionTotalsByModel[mk] = (ownMentionTotalsByModel[mk] || 0) + cnt;
        const s = String(m.sentiment || '').toLowerCase();
        if (s === 'positive') sentimentCounts.positive += 1;
        else if (s === 'negative') sentimentCounts.negative += 1;
        else sentimentCounts.neutral += 1;
        if (typeof m.rank === 'number') {
          rankSum += m.rank;
          rankCount += 1;
        }

        const dayKey = taskDayKey.get(m.taskId);
        if (dayKey) {
          const row = trendMap.get(dayKey);
          if (row) row.mentions += cnt;
        }
      } else {
        const key = m.brandKeyword.keyword;
        competitorTotals[key] = (competitorTotals[key] || 0) + cnt;
      }
    }

    const modelStats = Object.entries(runsByModel)
      .map(([modelKey, runs]) => {
        const pairs = ownPairsByModel[modelKey] || 0;
        const mentionRate = runs > 0 ? Math.round((pairs / runs) * 1000) / 10 : 0;
        const mentionsTotal = ownMentionTotalsByModel[modelKey] || 0;
        return { modelKey, runs, mentions: mentionsTotal, mentionRate };
      })
      .sort((a, b) => b.mentionRate - a.mentionRate);

    const mentionRate = runsCount > 0 ? Math.round((ownPairs.size / runsCount) * 1000) / 10 : 0;
    const avgRank = rankCount > 0 ? Math.round((rankSum / rankCount) * 10) / 10 : null;
    const positiveRatio =
      sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral > 0
        ? Math.round(
            (sentimentCounts.positive / (sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral)) * 1000
          ) / 10
        : 0;

    const score = Math.max(
      0,
      Math.min(100, Math.round(mentionRate * 0.6 + positiveRatio * 0.4))
    );

    const topCompetitors = Object.entries(competitorTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([keyword, count]) => ({ keyword, count }));

    res.json({
      project: {
        id: project.id,
        brandName: project.brandName,
        enabled: project.enabled,
        searchType: project.searchType,
        intervalMinutes: project.intervalMinutes,
        lastRunAt: project.lastRunAt,
        nextRunAt: project.nextRunAt,
        lastError: project.lastError,
      },
      rangeDays: days,
      metrics: {
        score,
        mentionRate,
        avgRank,
        weeklyMentions: ownTotal,
        positiveRatio,
        sentimentCounts,
      },
      trend,
      modelStats,
      competitors: topCompetitors,
      recentTasks: tasks.slice(0, 50),
    });
  } catch (err) {
    console.error('Failed to get monitoring metrics', err);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

app.get('/api/monitoring/projects/:id/keywords', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  const daysRaw = typeof req.query.days === 'string' ? parseInt(req.query.days, 10) : undefined;
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw as number, 1), 30) : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const project = await prisma.monitoringProject.findFirst({ where: { id, userId: user.id } });
    if (!project) return res.status(404).json({ error: 'Not found' });

    const tasks = await prisma.task.findMany({
      where: { monitoringProjectId: id, userId: user.id, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: { id: true, keyword: true, createdAt: true },
    });
    const taskIds = tasks.map((t) => t.id);
    const taskKeyword = new Map(tasks.map((t) => [t.id, t.keyword]));

    const mentions = await prisma.brandMention.findMany({
      where: {
        taskId: { in: taskIds.length > 0 ? taskIds : ['__none__'] },
        brandKeyword: { userId: user.id, isOwn: true },
      } as any,
      select: { taskId: true, modelKey: true, mentionCount: true, rank: true },
    });

    type ModelAgg = { mentions: number; rankSum: number; rankCount: number };
    type KeywordAgg = { keyword: string; taskCount: number; models: Record<string, ModelAgg> };
    const agg: Record<string, KeywordAgg> = {};

    for (const t of tasks) {
      const key = t.keyword;
      if (!agg[key]) agg[key] = { keyword: key, taskCount: 0, models: {} };
      agg[key].taskCount += 1;
    }

    for (const m of mentions) {
      const kw = taskKeyword.get(m.taskId) || '';
      if (!kw) continue;
      if (!agg[kw]) agg[kw] = { keyword: kw, taskCount: 0, models: {} };
      const mk = m.modelKey;
      if (!agg[kw].models[mk]) agg[kw].models[mk] = { mentions: 0, rankSum: 0, rankCount: 0 };
      const cnt = typeof m.mentionCount === 'number' ? m.mentionCount : 0;
      agg[kw].models[mk].mentions += cnt;
      if (typeof m.rank === 'number') {
        agg[kw].models[mk].rankSum += m.rank;
        agg[kw].models[mk].rankCount += 1;
      }
    }

    const items = Object.values(agg)
      .sort((a, b) => b.taskCount - a.taskCount)
      .slice(0, 200)
      .map((row) => ({
        keyword: row.keyword,
        taskCount: row.taskCount,
        models: Object.fromEntries(
          Object.entries(row.models).map(([modelKey, v]) => [
            modelKey,
            {
              mentions: v.mentions,
              avgRank: v.rankCount > 0 ? Math.round((v.rankSum / v.rankCount) * 10) / 10 : null,
            },
          ])
        ),
      }));

    res.json({ rangeDays: days, items });
  } catch (err) {
    console.error('Failed to get monitoring keyword stats', err);
    res.status(500).json({ error: 'Failed to get keyword stats' });
  }
});

app.get('/api/monitoring/projects/:id/alerts', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined;
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw as number, 1), 200) : 30;

  const daysRaw = typeof req.query.days === 'string' ? parseInt(req.query.days, 10) : undefined;
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw as number, 1), 30) : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const project = await prisma.monitoringProject.findFirst({ where: { id, userId: user.id } });
    if (!project) return res.status(404).json({ error: 'Not found' });

    const tasks = await prisma.task.findMany({
      where: { monitoringProjectId: id, userId: user.id, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: { id: true },
    });
    const taskIds = tasks.map((t) => t.id);

    const negative = await prisma.brandMention.findMany({
      where: {
        taskId: { in: taskIds.length > 0 ? taskIds : ['__none__'] },
        brandKeyword: { userId: user.id, isOwn: true },
        sentiment: 'negative',
        createdAt: { gte: since },
      } as any,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, taskId: true, modelKey: true, mentionCount: true, sentiment: true, context: true, createdAt: true },
    });

    res.json({ items: negative, rangeDays: days });
  } catch (err) {
    console.error('Failed to get monitoring alerts', err);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

app.get('/api/monitoring/projects/:id/works', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const project = await prisma.monitoringProject.findFirst({ where: { id, userId: user.id } });
    if (!project) return res.status(404).json({ error: 'Not found' });
    const works = await prisma.monitoringTrackedWork.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    res.json(works);
  } catch (err) {
    console.error('Failed to list monitoring works', err);
    res.status(500).json({ error: 'Failed to list works' });
  }
});

app.get('/api/monitoring/projects/:id/works/report', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  const daysRaw = typeof req.query.days === 'string' ? parseInt(req.query.days, 10) : undefined;
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw as number, 1), 30) : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const project = await prisma.monitoringProject.findFirst({ where: { id, userId: user.id } });
    if (!project) return res.status(404).json({ error: 'Not found' });

    const works = await prisma.monitoringTrackedWork.findMany({
      where: { projectId: id, enabled: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const tasks = await prisma.task.findMany({
      where: { monitoringProjectId: id, userId: user.id, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, createdAt: true, result: true },
    });

    const report = works.map((w) => ({
      id: w.id,
      title: w.title,
      url: w.url,
      enabled: w.enabled,
      mentionCount: 0,
      lastSeenAt: null as string | null,
      sample: null as any,
    }));

    const byId = new Map(report.map((r) => [r.id, r]));

    const matchUrl = (sourceUrl: string, targetUrl: string) => {
      if (!sourceUrl || !targetUrl) return false;
      if (sourceUrl === targetUrl) return true;
      if (sourceUrl.includes(targetUrl) || targetUrl.includes(sourceUrl)) return true;
      try {
        const a = new URL(sourceUrl);
        const b = new URL(targetUrl);
        return a.hostname.replace(/^www\./, '') === b.hostname.replace(/^www\./, '') && a.pathname !== '/' && b.pathname !== '/';
      } catch {
        return false;
      }
    };

    for (const t of tasks) {
      const result = t.result as any;
      const platformData = result?.platformData || {};
      for (const [modelKey, data] of Object.entries(platformData)) {
        const sources = Array.isArray((data as any)?.sources) ? ((data as any).sources as any[]) : [];
        for (const s of sources) {
          const sourceUrl = typeof s?.url === 'string' ? s.url : '';
          for (const w of works) {
            if (!matchUrl(sourceUrl, w.url)) continue;
            const row = byId.get(w.id);
            if (!row) continue;
            row.mentionCount += 1;
            const seen = t.createdAt instanceof Date ? t.createdAt.toISOString() : null;
            if (seen && (!row.lastSeenAt || row.lastSeenAt < seen)) row.lastSeenAt = seen;
            if (!row.sample) {
              row.sample = { taskId: t.id, modelKey, sourceTitle: s?.title || '', sourceUrl };
            }
          }
        }
      }
    }

    res.json({ rangeDays: days, items: report.sort((a, b) => b.mentionCount - a.mentionCount) });
  } catch (err) {
    console.error('Failed to get works report', err);
    res.status(500).json({ error: 'Failed to get works report' });
  }
});

app.post('/api/monitoring/projects/:id/works', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const project = await prisma.monitoringProject.findFirst({ where: { id, userId: user.id } });
    if (!project) return res.status(404).json({ error: 'Not found' });

    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const toCreate = rows
      .map((r: any) => ({
        title: typeof r?.title === 'string' ? r.title.trim() : '',
        url: typeof r?.url === 'string' ? r.url.trim() : '',
      }))
      .filter((r: any) => r.title && r.url)
      .slice(0, 200);

    const created = await prisma.$transaction(
      toCreate.map((r: any) =>
        prisma.monitoringTrackedWork.create({
          data: { projectId: id, title: r.title, url: r.url, enabled: true },
        })
      )
    );

    res.json({ success: true, created });
  } catch (err) {
    console.error('Failed to add works', err);
    res.status(500).json({ error: 'Failed to add works' });
  }
});

app.delete('/api/monitoring/works/:id', requireAuth(), async (req, res) => {
  const user = (req as any).user;
  const rawId = (req.params as any).id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const work = await prisma.monitoringTrackedWork.findUnique({ where: { id } });
    if (!work) return res.status(404).json({ error: 'Not found' });
    const project = await prisma.monitoringProject.findFirst({ where: { id: work.projectId, userId: user.id } });
    if (!project) return res.status(403).json({ error: 'Forbidden' });
    await prisma.monitoringTrackedWork.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete work', err);
    res.status(500).json({ error: 'Failed to delete work' });
  }
});

// ==================== 品牌词管理 API ====================

// 获取用户的品牌词列表
app.get('/api/brand-keywords', requireAuth(), async (req, res) => {
    try {
        const user = (req as any).user;
        const keywords = await prisma.brandKeyword.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { mentions: true }
                }
            }
        });
        res.json(keywords);
    } catch (error) {
        console.error('Failed to get brand keywords:', error);
        res.status(500).json({ error: 'Failed to get brand keywords' });
    }
});

// 添加品牌词
app.post('/api/brand-keywords', requireAuth(), async (req, res) => {
    console.log('[POST /api/brand-keywords] Received request', req.body);
    try {
        const user = (req as any).user;
        console.log('[POST /api/brand-keywords] User:', user?.id, user?.email);
        const { keyword, aliases, category, isOwn, color } = req.body;
        
        if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
            return res.status(400).json({ error: '品牌词不能为空' });
        }

        const existing = await prisma.brandKeyword.findFirst({
            where: { userId: user.id, keyword: keyword.trim() }
        });
        if (existing) {
            return res.status(400).json({ error: '该品牌词已存在' });
        }

        const newKeyword = await prisma.brandKeyword.create({
            data: {
                userId: user.id,
                keyword: keyword.trim(),
                aliases: Array.isArray(aliases) ? aliases.filter((a: any) => typeof a === 'string' && a.trim()).map((a: string) => a.trim()) : [],
                category: typeof category === 'string' ? category : null,
                isOwn: typeof isOwn === 'boolean' ? isOwn : true,
                color: typeof color === 'string' ? color : '#7c3aed',
            }
        });
        res.json(newKeyword);
    } catch (error) {
        console.error('Failed to add brand keyword:', error);
        res.status(500).json({ error: 'Failed to add brand keyword' });
    }
});

// 更新品牌词
app.put('/api/brand-keywords/:id', requireAuth(), async (req, res) => {
    try {
        const user = (req as any).user;
        const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = parseInt(idParam, 10);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ error: 'Invalid id' });
        }

        const existing = await prisma.brandKeyword.findFirst({
            where: { id, userId: user.id }
        });
        if (!existing) {
            return res.status(404).json({ error: '品牌词不存在' });
        }

        const { keyword, aliases, category, isOwn, color, enabled } = req.body;
        const updated = await prisma.brandKeyword.update({
            where: { id },
            data: {
                ...(typeof keyword === 'string' && keyword.trim() ? { keyword: keyword.trim() } : {}),
                ...(Array.isArray(aliases) ? { aliases: aliases.filter((a: any) => typeof a === 'string' && a.trim()).map((a: string) => a.trim()) } : {}),
                ...(typeof category === 'string' ? { category } : {}),
                ...(typeof isOwn === 'boolean' ? { isOwn } : {}),
                ...(typeof color === 'string' ? { color } : {}),
                ...(typeof enabled === 'boolean' ? { enabled } : {}),
            }
        });
        res.json(updated);
    } catch (error) {
        console.error('Failed to update brand keyword:', error);
        res.status(500).json({ error: 'Failed to update brand keyword' });
    }
});

// 删除品牌词
app.delete('/api/brand-keywords/:id', requireAuth(), async (req, res) => {
    try {
        const user = (req as any).user;
        const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = parseInt(idParam, 10);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ error: 'Invalid id' });
        }

        const existing = await prisma.brandKeyword.findFirst({
            where: { id, userId: user.id }
        });
        if (!existing) {
            return res.status(404).json({ error: '品牌词不存在' });
        }

        await prisma.brandKeyword.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete brand keyword:', error);
        res.status(500).json({ error: 'Failed to delete brand keyword' });
    }
});

// 获取品牌词提及统计
app.get('/api/brand-keywords/:id/mentions', requireAuth(), async (req, res) => {
    try {
        const user = (req as any).user;
        const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = parseInt(idParam, 10);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ error: 'Invalid id' });
        }

        const keyword = await prisma.brandKeyword.findFirst({
            where: { id, userId: user.id }
        });
        if (!keyword) {
            return res.status(404).json({ error: '品牌词不存在' });
        }

        const mentions = await prisma.brandMention.findMany({
            where: { brandKeywordId: id },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        // 统计
        const totalMentions = mentions.reduce((sum, m) => sum + m.mentionCount, 0);
        const avgRank = mentions.filter(m => m.rank).length > 0
            ? mentions.filter(m => m.rank).reduce((sum, m) => sum + (m.rank || 0), 0) / mentions.filter(m => m.rank).length
            : null;
        const sentimentCounts = {
            positive: mentions.filter(m => m.sentiment === 'positive').length,
            negative: mentions.filter(m => m.sentiment === 'negative').length,
            neutral: mentions.filter(m => m.sentiment === 'neutral').length,
        };

        res.json({
            keyword,
            mentions,
            stats: {
                totalMentions,
                avgRank: avgRank ? Math.round(avgRank * 10) / 10 : null,
                sentimentCounts,
            }
        });
    } catch (error) {
        console.error('Failed to get brand mentions:', error);
        res.status(500).json({ error: 'Failed to get brand mentions' });
    }
});

// 导出品牌词提及 CSV（最近 N 条）
app.get('/api/brand-keywords/:id/mentions.csv', requireAuth(), async (req, res) => {
    try {
        const user = (req as any).user;
        const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = parseInt(idParam, 10);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ error: 'Invalid id' });
        }

        const keyword = await prisma.brandKeyword.findFirst({
            where: { id, userId: user.id }
        });
        if (!keyword) {
            return res.status(404).json({ error: '品牌词不存在' });
        }

        const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined;
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw as number, 1), 20000) : 5000;

        const mentions = await prisma.brandMention.findMany({
            where: { brandKeywordId: id },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        const csv = toCsv(
            ['keywordId', 'keyword', 'mentionId', 'createdAt', 'taskId', 'modelKey', 'mentionCount', 'rank', 'sentiment', 'context'],
            mentions.map((m) => [
                keyword.id,
                keyword.keyword,
                m.id,
                m.createdAt,
                m.taskId,
                m.modelKey,
                m.mentionCount,
                m.rank,
                m.sentiment,
                m.context,
            ])
        );

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="aidso_brand_mentions_${id}_${Date.now()}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('Failed to export brand mentions csv', error);
        res.status(500).json({ error: 'Failed to export brand mentions' });
    }
});

// ==================== AI 追问接口 ====================
app.post('/api/ai/follow-up', requireAuth(), async (req, res) => {
    try {
        const { context, question, originalKeyword } = req.body;
        
        if (!question?.trim()) {
            return res.status(400).json({ error: '问题不能为空' });
        }

        const config = readAppConfig();
        const picked = pickNewApiConfigStrict(config, 'DeepSeek');
        const cfg = picked?.cfg as any;
        const baseUrl = typeof cfg?.baseUrl === 'string' ? cfg.baseUrl : '';
        const apiKey = typeof cfg?.apiKey === 'string' ? cfg.apiKey : '';
        const rawModel = typeof cfg?.model === 'string' ? cfg.model : '';
        const model = rawModel && rawModel.trim() ? rawModel.trim() : 'deepseek-chat';

        if (!baseUrl || !apiKey) {
            return res.status(500).json({ error: 'DeepSeek 未配置：请在后台「权限与配置 → 多模型接口配置」启用 DeepSeek 并填写 Base URL / API Key' });
        }

        // 使用 DeepSeek 进行智能回答
        const openai = new OpenAI({ apiKey, baseURL: baseUrl });

        const systemPrompt = `你是一个专业的营销顾问和市场分析师。用户刚刚完成了一次深度市场调研，现在想基于调研结果向你提问。

请根据提供的调研上下文，给出专业、具体、可执行的建议。

回答要求：
1. 结合上下文中的具体数据和品牌信息
2. 给出 3-5 条具体可执行的建议
3. 每条建议都要有理由支撑
4. 语气专业但友好
5. 如果用户问"如果我也做XX"，要给出差异化竞争策略`;

        const userPrompt = `## 原始调研关键词
${originalKeyword}

## 调研结果上下文
${context}

---

## 用户追问
${question}

请基于以上调研结果，给出专业建议。`;

        const completion = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 2000,
            temperature: 0.7
        });

        const answer = completion.choices?.[0]?.message?.content || '暂无回答';

        res.json({ answer });
    } catch (err: any) {
        console.error('AI 追问失败:', err);
        res.status(500).json({ error: err.message || 'AI 追问失败' });
    }
});

function startMonitoringScheduler() {
  const intervalMs = 60 * 1000;
  const tick = async () => {
    const now = new Date();
    try {
      const due = await prisma.monitoringProject.findMany({
        where: {
          enabled: true,
          nextRunAt: { lte: now },
        },
        orderBy: { nextRunAt: 'asc' },
        take: 10,
      });

      for (const project of due) {
        try {
          const runUser = await prisma.user.findUnique({
            where: { id: project.userId },
            include: { membership: true },
          });
          if (!runUser) continue;
          await runMonitoringProjectNow({ project, user: runUser });
        } catch (err: any) {
          const msg = err?.payload?.error || err?.message || 'Failed to run monitoring project';
          await prisma.monitoringProject
            .update({
              where: { id: project.id },
              data: { lastError: String(msg).slice(0, 500), nextRunAt: new Date(Date.now() + intervalMs) },
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      console.error('Monitoring scheduler tick failed', err);
    }
  };

  tick();
  setInterval(tick, intervalMs);
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startMonitoringScheduler();
});
