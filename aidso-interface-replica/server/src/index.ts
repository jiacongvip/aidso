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
const PERMISSIONS_FILE = path.join(__dirname, '../permissions.json');
const CONFIG_FILE = path.join(__dirname, '../config.json');
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-auth-secret-change-me';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { membership: true },
  });
  return user;
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

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
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
      _sum: { costUnits: true },
    });
    const usedUnits = usageAgg._sum?.costUnits || 0;
    const remainingUnits = Math.max(0, dailyLimit - usedUnits);

    res.json({ usageDate, plan, dailyLimit, usedUnits, remainingUnits });
  } catch (err) {
    console.error('Failed to get billing summary', err);
    res.status(500).json({ error: 'Failed to get billing summary' });
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

app.post('/api/admin/config', requireAdmin(), (req, res) => {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to save config', error);
        res.status(500).json({ error: 'Failed to save config' });
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

    const token = signToken({ uid: user.id, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS });
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

    const token = signToken({ uid: user.id, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS });
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

    const token = signToken({ uid: user.id, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS });
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
  const { keyword, searchType, models } = req.body || {};
  
  if (!keyword || typeof keyword !== 'string') {
    return res.status(400).json({ error: 'Keyword is required' });
  }
  const normalizedSearchType = searchType === 'deep' ? 'deep' : 'quick';
  const selectedModels = Array.isArray(models) ? models.filter((m: any) => typeof m === 'string') : [];
  if (selectedModels.length === 0) {
    return res.status(400).json({ error: 'At least one model is required' });
  }

  try {
    const config = readAppConfig();
    const usageDate = getShanghaiUsageDate();

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
          usageDate,
          userId: user.id,
          result: {
            summary: 'NewAPI 未配置，任务未执行',
            analysis: { summary: 'NewAPI 未配置（baseUrl/apiKey 为空），无法调用模型。' },
            platformData,
          } as any,
        },
      });

      return res.json(task);
    }

    // 改为点数扣费：每次任务消耗 1 点
    const costPoints = 1;
    
    // 检查用户点数是否足够
    const currentUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!currentUser || currentUser.points < costPoints) {
      return res.status(403).json({
        error: '点数不足',
        message: `执行此任务需要 ${costPoints} 点，您当前余额为 ${currentUser?.points || 0} 点`,
        requiredPoints: costPoints,
        currentPoints: currentUser?.points || 0
      });
    }

    // 使用事务：扣点 + 创建任务
    const result = await prisma.$transaction(async (tx) => {
      // 扣除点数
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { points: { decrement: costPoints } }
      });

      // 记录点数消费日志
      await tx.pointsLog.create({
        data: {
          userId: user.id,
          amount: -costPoints,
          balance: updatedUser.points,
          type: 'CONSUME',
          description: `执行任务: ${keyword.substring(0, 50)}`
        }
      });

      // 创建任务
      const task = await tx.task.create({
        data: {
          keyword,
          status: 'PENDING',
          logs: [
            '🚀 任务已创建，准备启动调研...',
            `💰 已扣除 ${costPoints} 点，当前余额：${updatedUser.points} 点`
          ],
          searchType: normalizedSearchType,
          selectedModels,
          costUnits: costPoints,
          usageDate,
          userId: user.id,
        }
      });

      return { task, remainingPoints: updatedUser.points };
    });
    
    // Trigger background processing (simulate async)
    simulateTaskProcessing(result.task.id, keyword, selectedModels, normalizedSearchType);
    
    res.json({
      ...result.task,
      remainingPoints: result.remainingPoints
    });
  } catch (error) {
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
    if (!task || task.userId !== user.id) return res.status(404).json({ error: 'Task not found' });
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
    if (!task || task.userId !== user.id) return res.status(404).json({ error: 'Task not found' });

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
    try {
        const users = await prisma.user.findMany({
            include: { membership: true },
            orderBy: { createdAt: 'desc' }
        });
        
        // Transform to match frontend format
        const formattedUsers = users.map(u => ({
            id: u.id,
            name: u.name || 'Unknown User',
            email: u.email,
            planKey: u.membership?.plan || 'FREE',
            plan: planLabel(u.membership?.plan || 'FREE'),
            points: u.points || 0,
            status: '活跃', // Default active
            joined: u.createdAt.toISOString().split('T')[0],
            spent: '¥0', // Placeholder
            apiCalls: 0, // Placeholder
            tokenUsage: '0', // Placeholder
            key: 'sk-live-...' + u.id // Placeholder
        }));
        
        res.json(formattedUsers);
    } catch (error) {
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

// ==================== AI 追问接口 ====================
app.post('/api/ai/follow-up', requireAuth, async (req, res) => {
    try {
        const { context, question, originalKeyword } = req.body;
        
        if (!question?.trim()) {
            return res.status(400).json({ error: '问题不能为空' });
        }

        // 从 config.json 中读取配置
        const configPath = path.join(__dirname, '..', 'config.json');
        let apiKey = '';
        let baseUrl = 'https://api.newapi.com/v1';

        try {
            const configData = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configData);
            apiKey = config.newapi?.api_key || '';
            baseUrl = config.newapi?.base_url || baseUrl;
        } catch (err) {
            console.error('读取配置文件失败:', err);
            return res.status(500).json({ error: '配置文件读取失败' });
        }

        if (!apiKey) {
            return res.status(500).json({ error: 'API Key 未配置' });
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
            model: 'deepseek-chat',
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
