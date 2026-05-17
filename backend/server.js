import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import crypto from 'crypto';

// 超大小说系统导入
import { registerMegaNovelRoutes } from './mega-routes.js';
import { MegaContextBuilder } from './mega-context-builder.js';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DATA_DIR = join(__dirname, 'data');
const PROJECTS_DIR = join(DATA_DIR, 'projects');
const USERS_DIR = join(DATA_DIR, 'users');
const CHAPTERS_DIR = join(DATA_DIR, 'chapters');

// JWT 简单实现 - 使用固定密钥保证重启后token仍有效
// 从环境变量或固定文件读取，确保重启后不变
let JWT_SECRET;
const SECRET_FILE = join(DATA_DIR, '.jwt_secret');
try {
  JWT_SECRET = await fs.readFile(SECRET_FILE, 'utf-8');
} catch {
  JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
  await fs.writeFile(SECRET_FILE, JWT_SECRET);
}

// 确保数据目录存在
await ensureDir(PROJECTS_DIR);
await ensureDir(USERS_DIR);
await ensureDir(CHAPTERS_DIR);

function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    const [header, body, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// 认证中间件
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: '登录已过期' });
  req.userId = payload.userId;
  req.username = payload.username;
  
  // 检查是否是管理员
  try {
    const userFile = join(USERS_DIR, `${req.username}.json`);
    const content = await fs.readFile(userFile, 'utf-8');
    const user = JSON.parse(content);
    req.isAdmin = user.role === 'admin';
  } catch {
    req.isAdmin = false;
  }
  
  next();
}

// 管理员中间件
async function adminMiddleware(req, res, next) {
  try {
    const userFile = join(USERS_DIR, `${req.username}.json`);
    const content = await fs.readFile(userFile, 'utf-8');
    const user = JSON.parse(content);
    if (user.role !== 'admin') return res.status(403).json({ error: '需要管理员权限' });
    next();
  } catch { return res.status(403).json({ error: '需要管理员权限' }); }
}

// 确保目录存在
async function ensureDir(dir) {
  try { await fs.mkdir(dir, { recursive: true }); } catch (e) {}
}

await ensureDir(PROJECTS_DIR);
await ensureDir(USERS_DIR);
await ensureDir(CHAPTERS_DIR);

// ===== 章节独立存储工具 =====

async function saveChapterContent(projectId, chapterId, content) {
  const dir = join(CHAPTERS_DIR, projectId);
  await ensureDir(dir);
  await fs.writeFile(join(dir, `${chapterId}.txt`), content || '', 'utf-8');
}

async function loadChapterContent(projectId, chapterId) {
  try {
    return await fs.readFile(join(CHAPTERS_DIR, projectId, `${chapterId}.txt`), 'utf-8');
  } catch { return ''; }
}

async function deleteChapterContent(projectId, chapterId) {
  try { await fs.unlink(join(CHAPTERS_DIR, projectId, `${chapterId}.txt`)); } catch {}
}

async function deleteProjectChapters(projectId) {
  try { await fs.rm(join(CHAPTERS_DIR, projectId), { recursive: true, force: true }); } catch {}
}

// 保存项目（章节内容分离存储）
async function saveProject(project) {
  // 分离章节内容
  const chaptersWithContent = project.chapters || [];
  const chapterMetas = chaptersWithContent.map(ch => {
    const { content, ...meta } = ch;
    return meta;
  });

  // 并行保存所有章节内容
  await Promise.all(
    chaptersWithContent.map(ch => saveChapterContent(project.id, ch.id, ch.content))
  );

  // 保存项目元数据（不含 content）
  const slimProject = {
    ...project,
    chapters: chapterMetas,
    wordCount: chaptersWithContent.reduce((sum, ch) => sum + (ch.content?.length || 0), 0)
  };

  await fs.writeFile(
    join(PROJECTS_DIR, `${project.id}.json`),
    JSON.stringify(slimProject, null, 2)
  );

  return slimProject;
}

// 加载项目（合并章节内容）
async function loadProject(projectId, options = {}) {
  const { loadContent = true } = options;

  const content = await fs.readFile(join(PROJECTS_DIR, `${projectId}.json`), 'utf-8');
  const project = JSON.parse(content);

  if (loadContent && project.chapters) {
    project.chapters = await Promise.all(
      project.chapters.map(async ch => {
        const content = await loadChapterContent(projectId, ch.id);
        return { ...ch, content };
      })
    );
  }

  return project;
}

// 加载单个章节
async function loadSingleChapter(projectId, chapterId) {
  return await loadChapterContent(projectId, chapterId);
}

// 保存单个章节
async function saveSingleChapter(projectId, chapterId, content) {
  await saveChapterContent(projectId, chapterId, content);
}

// ===== 用户认证 API =====

// 注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, nickname, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    if (password.length < 6) return res.status(400).json({ error: '密码至少6位' });

    const userFile = join(USERS_DIR, `${username}.json`);
    try { await fs.access(userFile); return res.status(400).json({ error: '用户名已存在' }); } catch {}

    const files = await fs.readdir(USERS_DIR);
    const isFirstUser = files.filter(f => f.endsWith('.json')).length === 0;

    const user = {
      id: Date.now().toString(36), username,
      password: hashPassword(password),
      nickname: nickname || username, email: email || '',
      role: isFirstUser ? 'admin' : 'user',
      createdAt: Date.now(),
    };

    await fs.writeFile(userFile, JSON.stringify(user, null, 2));
    const token = signToken({ userId: user.id, username: user.username });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

    const userFile = join(USERS_DIR, `${username}.json`);
    let user;
    try { user = JSON.parse(await fs.readFile(userFile, 'utf-8')); }
    catch { return res.status(401).json({ error: '用户名或密码错误' }); }

    if (user.password !== hashPassword(password)) return res.status(401).json({ error: '用户名或密码错误' });

    const token = signToken({ userId: user.id, username: user.username });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 获取当前用户
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = JSON.parse(await fs.readFile(join(USERS_DIR, `${req.username}.json`), 'utf-8'));
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 修改自己密码
app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: '原密码和新密码不能为空' });
    if (newPassword.length < 6) return res.status(400).json({ error: '新密码至少6位' });

    const userFile = join(USERS_DIR, `${req.username}.json`);
    const user = JSON.parse(await fs.readFile(userFile, 'utf-8'));
    if (user.password !== hashPassword(oldPassword)) return res.status(400).json({ error: '原密码错误' });

    user.password = hashPassword(newPassword);
    await fs.writeFile(userFile, JSON.stringify(user, null, 2));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 管理员获取所有项目列表（用于后台管理）
app.get('/api/admin/projects', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const files = await fs.readdir(PROJECTS_DIR);
    const projects = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const project = JSON.parse(await fs.readFile(join(PROJECTS_DIR, file), 'utf-8'));
        // 获取所有者信息
        let ownerName = '未知用户';
        let ownerUsername = '';
        try {
          const userFiles = await fs.readdir(USERS_DIR);
          for (const uf of userFiles) {
            if (uf.endsWith('.json')) {
              const u = JSON.parse(await fs.readFile(join(USERS_DIR, uf), 'utf-8'));
              if (u.id === project.userId) {
                ownerName = u.nickname || u.username;
                ownerUsername = u.username;
                break;
              }
            }
          }
        } catch {}

        projects.push({
          id: project.id,
          title: project.title,
          summary: project.summary,
          updatedAt: project.updatedAt,
          wordCount: project.wordCount || 0,
          chapterCount: project.chapters?.length || 0,
          userId: project.userId,
          ownerName,
          ownerUsername
        });
      }
    }
    res.json(projects.sort((a, b) => b.updatedAt - a.updatedAt));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 管理员删除任意项目
app.delete('/api/admin/projects/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await fs.unlink(join(PROJECTS_DIR, `${req.params.id}.json`));
    await deleteProjectChapters(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 获取所有用户列表
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const files = await fs.readdir(USERS_DIR);
    const users = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const user = JSON.parse(await fs.readFile(join(USERS_DIR, file), 'utf-8'));
        const { password: _, ...userWithoutPassword } = user;
        users.push(userWithoutPassword);
      }
    }
    res.json(users.sort((a, b) => b.createdAt - a.createdAt));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/users/:username', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { nickname, email, role } = req.body;
    const userFile = join(USERS_DIR, `${req.params.username}.json`);
    let user;
    try { user = JSON.parse(await fs.readFile(userFile, 'utf-8')); }
    catch { return res.status(404).json({ error: '用户不存在' }); }

    if (nickname !== undefined) user.nickname = nickname;
    if (email !== undefined) user.email = email;
    if (role !== undefined && ['admin', 'user'].includes(role)) user.role = role;

    await fs.writeFile(userFile, JSON.stringify(user, null, 2));
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/users/:username/reset-password', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: '密码至少6位' });

    const userFile = join(USERS_DIR, `${req.params.username}.json`);
    let user;
    try { user = JSON.parse(await fs.readFile(userFile, 'utf-8')); }
    catch { return res.status(404).json({ error: '用户不存在' }); }

    user.password = hashPassword(newPassword);
    await fs.writeFile(userFile, JSON.stringify(user, null, 2));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/users/:username', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (req.params.username === req.username) return res.status(400).json({ error: '不能删除自己' });
    await fs.unlink(join(USERS_DIR, `${req.params.username}.json`));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== AI 调用封装 =====

async function callAI({ systemPrompt, userPrompt, maxTokens = 2000 }) {
  const apiKey = process.env.KIMI_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.MOONSHOT_API_KEY;
  const apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const model = process.env.AI_MODEL || 'gpt-4';
  if (!apiKey) throw new Error('未配置 API Key');

  const isAnthropic = apiUrl.includes('anthropic') || apiUrl.includes('kimi.com/coding');

  if (isAnthropic) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }] })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return { content: data.content?.[0]?.text || data.content || '无内容', usage: data.usage || { input_tokens: 0, output_tokens: 0 } };
  } else {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature: 0.8, max_tokens: maxTokens })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return { content: data.choices[0].message.content, usage: data.usage };
  }
}

// ===== 项目 API =====

// 获取所有项目（管理员可查看所有，普通用户只能看自己的）
app.get('/api/projects', authMiddleware, async (req, res) => {
  try {
    const userFile = join(USERS_DIR, `${req.username}.json`);
    const currentUser = JSON.parse(await fs.readFile(userFile, 'utf-8'));
    const isAdmin = currentUser.role === 'admin';

    const files = await fs.readdir(PROJECTS_DIR);
    const projects = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const project = JSON.parse(await fs.readFile(join(PROJECTS_DIR, file), 'utf-8'));
        // 管理员看所有，普通用户只看自己的
        if (isAdmin || project.userId === req.userId) {
          // 获取用户名
          let ownerName = project.userId;
          try {
            const userFiles = await fs.readdir(USERS_DIR);
            for (const uf of userFiles) {
              if (uf.endsWith('.json')) {
                const u = JSON.parse(await fs.readFile(join(USERS_DIR, uf), 'utf-8'));
                if (u.id === project.userId) {
                  ownerName = u.nickname || u.username;
                  break;
                }
              }
            }
          } catch {}

          projects.push({
            id: project.id, title: project.title, summary: project.summary,
            updatedAt: project.updatedAt, wordCount: project.wordCount || 0,
            userId: project.userId, ownerName,
            locked: project.locked || false
          });
        }
      }
    }
    res.json(projects.sort((a, b) => b.updatedAt - a.updatedAt));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 创建项目
app.post('/api/projects', authMiddleware, async (req, res) => {
  try {
    const id = Date.now().toString(36);
    const project = {
      id, userId: req.userId,
      title: req.body.title || '未命名小说', summary: req.body.summary || '',
      createdAt: Date.now(), updatedAt: Date.now(), wordCount: 0,
      chapters: [], characters: [],
      worldSettings: { background: '', rules: '', timeline: [] },
      plotOutlines: [], notes: [],
      volumes: []
    };
    await fs.writeFile(join(PROJECTS_DIR, `${id}.json`), JSON.stringify(project, null, 2));
    res.json(project);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 获取项目详情（管理员可查看所有，普通用户只能看自己的）
app.get('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const userFile = join(USERS_DIR, `${req.username}.json`);
    const currentUser = JSON.parse(await fs.readFile(userFile, 'utf-8'));
    const isAdmin = currentUser.role === 'admin';

    const project = await loadProject(req.params.id, { loadContent: true });
    if (!isAdmin && project.userId !== req.userId) return res.status(403).json({ error: '无权访问' });
    res.json(project);
  } catch (e) { res.status(404).json({ error: '项目不存在' }); }
});

// 获取项目元数据（管理员可查看所有）
app.get('/api/projects/:id/meta', authMiddleware, async (req, res) => {
  try {
    const userFile = join(USERS_DIR, `${req.username}.json`);
    const currentUser = JSON.parse(await fs.readFile(userFile, 'utf-8'));
    const isAdmin = currentUser.role === 'admin';

    const project = await loadProject(req.params.id, { loadContent: false });
    if (!isAdmin && project.userId !== req.userId) return res.status(403).json({ error: '无权访问' });
    res.json(project);
  } catch (e) { res.status(404).json({ error: '项目不存在' }); }
});

// 获取单个章节内容
app.get('/api/projects/:id/chapters/:chapterId', authMiddleware, async (req, res) => {
  try {
    const project = await loadProject(req.params.id, { loadContent: false });
    if (!req.isAdmin && project.userId !== req.userId) return res.status(403).json({ error: '无权访问' });

    const chapterMeta = (project.chapters || []).find(ch => ch.id === req.params.chapterId);
    if (!chapterMeta) return res.status(404).json({ error: '章节不存在' });

    const content = await loadSingleChapter(req.params.id, req.params.chapterId);
    res.json({ ...chapterMeta, content });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 更新项目（支持章节内容分离存储）
app.put('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await loadProject(req.params.id, { loadContent: false });
    if (!req.isAdmin && existing.userId !== req.userId) return res.status(403).json({ error: '无权访问' });

    const updates = req.body;

    // 如果有章节更新，分离存储内容
    if (updates.chapters) {
      for (const ch of updates.chapters) {
        if (ch.content !== undefined) {
          await saveSingleChapter(req.params.id, ch.id, ch.content);
        }
      }
      // 从 updates 中移除 content，只保留元数据
      updates.chapters = updates.chapters.map(ch => {
        const { content, ...meta } = ch;
        return meta;
      });
    }

    const updated = {
      ...existing,
      ...updates,
      id: existing.id, userId: existing.userId,
      updatedAt: Date.now()
    };

    // 重新计算字数
    let totalWords = 0;
    for (const ch of updated.chapters) {
      const content = await loadSingleChapter(req.params.id, ch.id);
      totalWords += content.length;
      ch.wordCount = content.length;
    }
    updated.wordCount = totalWords;

    await fs.writeFile(join(PROJECTS_DIR, `${req.params.id}.json`), JSON.stringify(updated, null, 2));

    // 返回完整项目（含内容）
    const fullProject = await loadProject(req.params.id, { loadContent: true });
    res.json(fullProject);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 删除项目
app.delete('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const project = JSON.parse(await fs.readFile(join(PROJECTS_DIR, `${req.params.id}.json`), 'utf-8'));
    if (!req.isAdmin && project.userId !== req.userId) return res.status(403).json({ error: '无权访问' });
    if (project.locked) return res.status(403).json({ error: '项目已锁定，无法删除' });
    await fs.unlink(join(PROJECTS_DIR, `${req.params.id}.json`));
    await deleteProjectChapters(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== AI 写作 API =====

function buildContext(project, options = {}) {
  const { currentChapterId, mode = 'continue', maxChars = 8000 } = options;
  let context = '';

  // 1. 世界观和背景（长篇小说需要更详细的背景设定）
  if (project.worldSettings?.background) {
    context += `【世界观背景】\n${project.worldSettings.background.slice(0, 2000)}\n\n`;
  }

  // 2. 世界规则（增加规则长度限制）
  if (project.worldSettings?.rules) {
    context += `【世界规则】\n${project.worldSettings.rules.slice(0, 1500)}\n\n`;
  }

  // 3. 主要角色（长篇小说角色众多，增加到20个）
  if (project.characters?.length > 0) {
    context += '【主要角色】\n';
    for (const char of project.characters.slice(0, 20)) {
      let charInfo = `- ${char.name}`;
      if (char.description) charInfo += `: ${char.description.slice(0, 300)}`;
      if (char.personality) charInfo += `\n  性格: ${char.personality.slice(0, 200)}`;
      if (char.appearance) charInfo += `\n  外貌: ${char.appearance.slice(0, 200)}`;
      if (char.goals) charInfo += `\n  目标: ${char.goals.slice(0, 200)}`;
      if (char.background) charInfo += `\n  背景: ${char.background.slice(0, 200)}`;
      if (char.relationships?.length > 0) {
        charInfo += `\n  关系: ${char.relationships.slice(0, 3).map(r => `${r.characterName}(${r.type})`).join(', ')}`;
      }
      context += charInfo + '\n\n';
    }
    context += '\n';
  }

  // 4. 情节大纲（长篇小说大纲更多，增加到15条）
  if (project.plotOutlines?.length > 0) {
    context += '【情节大纲】\n';
    for (const outline of project.plotOutlines.slice(0, 15)) {
      context += `- ${outline.title}: ${outline.content.slice(0, 400)}\n`;
      if (outline.chapterRange) {
        context += `  （涉及章节: 第${outline.chapterRange[0]}章 至 第${outline.chapterRange[1]}章）\n`;
      }
    }
    context += '\n';
  }

  // 5. 卷信息（长篇小说多卷结构，增加卷信息详细度）
  const currentChapter = (project.chapters || []).find(ch => ch.id === currentChapterId);
  if (currentChapter?.volumeId && project.volumes?.length > 0) {
    const currentVolume = (project.volumes || []).find(v => v.id === currentChapter.volumeId);
    if (currentVolume) {
      context += `【当前卷】\n第${currentVolume.number}卷 ${currentVolume.title}\n`;
      if (currentVolume.summary) {
        context += `卷概要: ${currentVolume.summary.slice(0, 800)}\n`;
      }
      // 添加前后卷信息（如果有）
      const prevVolume = (project.volumes || []).find(v => v.number === currentVolume.number - 1);
      const nextVolume = (project.volumes || []).find(v => v.number === currentVolume.number + 1);
      if (prevVolume) {
        context += `前情提要（第${prevVolume.number}卷 ${prevVolume.title}）: ${prevVolume.summary?.slice(0, 300) || '无'}\n`;
      }
      if (nextVolume) {
        context += `后续预告（第${nextVolume.number}卷 ${nextVolume.title}）: ${nextVolume.summary?.slice(0, 300) || '无'}\n`;
      }
      context += '\n';
    }
  }

  // 6. 前文摘要（长篇小说需要更多上下文，增加到15章）
  const currentIndex = project.chapters.findIndex(ch => ch.id === currentChapterId);
  if (currentIndex > 0) {
    context += '【前文摘要 - 最近15章】\n';
    const recentChapters = project.chapters.slice(Math.max(0, currentIndex - 15), currentIndex);
    for (const ch of recentChapters) {
      if (ch.summary) {
        context += `第${ch.number}章 ${ch.title}: ${ch.summary.slice(0, 200)}\n`;
      } else {
        context += `第${ch.number}章 ${ch.title}: （暂无摘要）\n`;
      }
      // 添加关键词
      if (ch.keywords?.length > 0) {
        context += `  关键词: ${ch.keywords.join(', ')}\n`;
      }
    }
    context += '\n';
  }

  // 7. 关键章节摘要（追踪伏笔，增加到20章）
  const allChaptersWithKeywords = project.chapters.filter(ch => 
    ch.id !== currentChapterId && ch.keywords && ch.keywords.length > 0
  );
  
  if (allChaptersWithKeywords.length > 0) {
    context += '【关键情节追踪 - 伏笔与线索】\n';
    // 选择最近的有关键词的章节，最多20章
    const keyChapters = allChaptersWithKeywords
      .filter(ch => project.chapters.findIndex(c => c.id === ch.id) < currentIndex)
      .slice(-20);
    
    for (const ch of keyChapters) {
      context += `第${ch.number}章 ${ch.title}\n`;
      if (ch.summary) {
        context += `  摘要: ${ch.summary.slice(0, 250)}\n`;
      }
      context += `  关键元素: ${ch.keywords.join(', ')}\n\n`;
    }
    context += '\n';
  }

  // 8. 角色出场记录（追踪角色在哪些章节出现，增加到最近10章）
  if (project.characters?.length > 0 && project.chapters?.length > 0) {
    const characterAppearances = {};
    for (const ch of (project.chapters || []).slice(0, currentIndex)) {
      if (ch.keywords) {
        for (const keyword of ch.keywords) {
          const char = (project.characters || []).find(c => c.name === keyword || keyword.includes(c.name));
          if (char) {
            if (!characterAppearances[char.name]) characterAppearances[char.name] = [];
            characterAppearances[char.name].push(ch.number);
          }
        }
      }
    }
    
    if (Object.keys(characterAppearances).length > 0) {
      context += '【角色出场记录】\n';
      for (const [charName, chapters] of Object.entries(characterAppearances)) {
        context += `- ${charName}: 出现在第 ${chapters.slice(-10).join(', ')} 章\n`;
      }
      context += '\n';
    }
  }

  // 9. 当前章节信息
  if (currentChapter) {
    context += `【当前章节】\n第${currentChapter.number}章 ${currentChapter.title}\n`;
    if (currentChapter.summary) {
      context += `本章定位: ${currentChapter.summary}\n`;
    }
    context += '\n';
  }

  return context;
}

app.post('/api/ai/write', authMiddleware, async (req, res) => {
  try {
    const { projectId, chapterId, mode, prompt, style, useEnhancedContext = true } = req.body;
    
    // 判断是普通项目还是 mega 项目
    const isMegaProject = projectId.startsWith('mega_');
    let project, chapterContent;
    
    if (isMegaProject) {
      // 加载 mega 项目
      const { MegaProjectLoader } = await import('./mega-storage.js');
      const loader = new MegaProjectLoader(projectId);
      project = await loader.loadMeta();
      if (!project) return res.status(404).json({ error: '项目不存在' });
      if (!req.isAdmin && project.userId !== req.userId) return res.status(403).json({ error: '无权访问' });
      
      // 加载章节内容
      const chapterData = await loader.loadChapter(chapterId);
      chapterContent = chapterData?.content || '';
    } else {
      // 加载普通项目
      project = await loadProject(projectId, { loadContent: false });
      if (!req.isAdmin && project.userId !== req.userId) return res.status(403).json({ error: '无权访问' });
      chapterContent = await loadSingleChapter(projectId, chapterId);
    }

    let context;
    
    // 使用增强的分层上下文（适用于大项目）
    if (useEnhancedContext && (project.chapters?.length > 50 || project.volumes?.length > 0 || isMegaProject)) {
      const builder = new MegaContextBuilder(project);
      builder.setPosition(chapterId);
      context = await builder.buildContext({ 
        mode, 
        maxTokens: 15000, 
        includeDeepContext: true 
      });
    } else {
      // 使用原有上下文构建
      context = buildContext(project, { currentChapterId: chapterId, mode });
    }

    let systemPrompt = `你是一位专业的小说写作助手，擅长创作长篇小说。你正在协助作者续写一部已经建立了完整世界观、角色设定和情节大纲的小说。\n\n你的任务是根据提供的世界观背景、角色设定、情节大纲和前文内容，续写当前章节。\n\n核心原则：\n1. **角色一致性**：每个角色的行为、语言风格必须符合其性格设定\n2. **世界观一致性**：所有事件必须符合世界观规则\n3. **情节连贯性**：续写内容必须与前文逻辑连贯，推进已有情节\n4. **大纲遵循**：按照情节大纲的方向发展故事\n5. **只输出正文**：不要添加解释、标注或章节标题`;
    if (style) systemPrompt += `\n\n写作风格要求：${style}\n`;

    let userPrompt = context;
    if (chapterContent) {
      userPrompt += `【当前章节已有内容】\n${chapterContent.slice(-4000)}\n\n`;
    }

    if (mode === 'continue') {
      userPrompt += `请根据以上世界观、角色设定、情节大纲和前文内容，续写当前章节。要求：
1. 保持与已有内容的连贯性
2. 角色行为和对话符合其性格设定
3. 遵循世界观规则
4. 推进情节发展
5. 只输出续写内容，不要添加解释

直接输出续写内容：`;
    } else if (mode === 'rewrite') {
      userPrompt += `请根据以上世界观和角色设定，改写/润色以下内容。要求：${prompt || '提升文笔，保持原意'}
\n原文：\n${chapterContent || ''}`;
    } else if (mode === 'dialogue') {
      userPrompt += `请根据角色性格设定，为以下场景生成对话。场景描述：${prompt}
\n要求：
1. 对话符合角色性格
2. 语言自然流畅
3. 推动情节发展`;
    } else if (mode === 'outline') {
      userPrompt = `基于以下小说设定，请生成情节大纲。\n\n${context}\n\n要求：${prompt || '生成接下来3-5章的情节大纲，每章包含主要事件和转折'}`;
    } else if (mode === 'custom') {
      userPrompt += `\n\n用户要求：${prompt}`;
    }

    const result = await callAI({ systemPrompt, userPrompt, maxTokens: 3000 });
    res.json({ 
      content: result.content, 
      usage: result.usage,
      contextSize: context.length,
      useEnhancedContext
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/summarize', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const systemPrompt = '请为以下小说章节生成简短摘要（100字以内）和关键词。格式：摘要：xxx\n关键词：xxx, xxx';
    const result = await callAI({ systemPrompt, userPrompt: content.slice(0, 3000), maxTokens: 300 });
    const text = result.content;
    const summaryMatch = text.match(/摘要[:：](.+?)(?=\n|$)/);
    const keywordsMatch = text.match(/关键词[:：](.+?)(?=\n|$)/);
    res.json({
      summary: summaryMatch ? summaryMatch[1].trim() : text.slice(0, 100),
      keywords: keywordsMatch ? keywordsMatch[1].split(/[,，]/).map(k => k.trim()).filter(Boolean) : []
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/check-consistency', authMiddleware, async (req, res) => {
  try {
    const { projectId, content } = req.body;
    const project = await loadProject(projectId, { loadContent: false });
    if (!req.isAdmin && project.userId !== req.userId) return res.status(403).json({ error: '无权访问' });

    const characterInfo = project.characters.map(c => `${c.name}: ${c.description}`).join('\n');
    const systemPrompt = `请检查以下小说内容是否存在角色设定不一致的问题。\n\n角色设定：\n${characterInfo}\n\n只列出发现的问题，没有问题则返回"无"。`;
    const result = await callAI({ systemPrompt, userPrompt: content.slice(0, 3000), maxTokens: 500 });
    const text = result.content;
    const issues = text === '无' ? [] : text.split('\n').filter(l => l.trim());
    res.json({ issues });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 批量生成章节摘要
app.post('/api/ai/generate-summaries', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.body;
    const project = await loadProject(projectId, { loadContent: false });
    if (!req.isAdmin && project.userId !== req.userId) return res.status(403).json({ error: '无权访问' });

    const results = [];
    for (const chapter of project.chapters) {
      if (!chapter.summary) {
        try {
          const content = await loadSingleChapter(projectId, chapter.id);
          if (content && content.length > 50) {
            const systemPrompt = '请为以下小说章节生成简短摘要（100字以内）和关键词。格式：摘要：xxx\n关键词：xxx, xxx';
            const result = await callAI({ systemPrompt, userPrompt: content.slice(0, 3000), maxTokens: 300 });
            const text = result.content;
            const summaryMatch = text.match(/摘要[:：](.+?)(?=\n|$)/);
            const keywordsMatch = text.match(/关键词[:：](.+?)(?=\n|$)/);
            
            chapter.summary = summaryMatch ? summaryMatch[1].trim() : text.slice(0, 100);
            chapter.keywords = keywordsMatch ? keywordsMatch[1].split(/[,，]/).map(k => k.trim()).filter(Boolean) : [];
            
            results.push({ chapterId: chapter.id, title: chapter.title, summary: chapter.summary, keywords: chapter.keywords });
          }
        } catch (e) {
          console.error(`生成章节 ${chapter.id} 摘要失败:`, e.message);
        }
      }
    }

    // 保存更新后的项目
    await saveProject(projectId, project);
    res.json({ success: true, generated: results.length, results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== 导出功能 =====

app.get('/api/projects/:id/export/txt', async (req, res) => {
  try {
    let userId = null;
    const token = req.query.token || req.headers.authorization?.slice(7);
    if (token) { const payload = verifyToken(token); if (payload) userId = payload.userId; }

    const project = await loadProject(req.params.id, { loadContent: true });
    if (project.userId !== userId) return res.status(403).json({ error: '无权访问' });

    let text = `${project.title}\n${'='.repeat(project.title.length)}\n\n`;
    if (project.summary) text += `简介：${project.summary}\n\n`;
    for (const chapter of project.chapters) {
      text += `\n第${chapter.number}章 ${chapter.title}\n${'-'.repeat(40)}\n\n${chapter.content}\n\n`;
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const safeName = encodeURIComponent(project.title).replace(/['()]/g, '');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.txt"`);
    res.send(text);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/projects/:id/export/docx', async (req, res) => {
  try {
    let userId = null;
    const token = req.query.token || req.headers.authorization?.slice(7);
    if (token) { const payload = verifyToken(token); if (payload) userId = payload.userId; }

    const project = await loadProject(req.params.id, { loadContent: true });
    if (project.userId !== userId) return res.status(403).json({ error: '无权访问' });

    const children = [
      new Paragraph({ text: project.title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
    ];
    if (project.summary) children.push(new Paragraph({ text: `简介：${project.summary}`, spacing: { before: 200, after: 400 } }));
    for (const chapter of project.chapters) {
      children.push(
        new Paragraph({ text: `第${chapter.number}章 ${chapter.title}`, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Paragraph({ text: chapter.content, spacing: { after: 200 } })
      );
    }
    const doc = new Document({ sections: [{ properties: {}, children }] });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const safeName = encodeURIComponent(project.title).replace(/['()]/g, '');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.docx"`);
    res.send(buffer);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== 全文搜索 =====
app.get('/api/projects/:id/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ results: [] });

    const project = await loadProject(req.params.id, { loadContent: false });
    // 允许管理员访问所有项目
    if (!req.isAdmin && project.userId !== req.userId) return res.status(403).json({ error: '无权访问' });

    const keyword = q.toLowerCase();
    const results = [];

    // 搜索章节 - 添加空值保护
    const chapters = project.chapters || [];
    for (const chapter of chapters) {
      const content = await loadSingleChapter(req.params.id, chapter.id);
      if (chapter.title.toLowerCase().includes(keyword) || content.toLowerCase().includes(keyword)) {
        const index = content.toLowerCase().indexOf(keyword);
        const snippet = index >= 0 ? content.slice(Math.max(0, index - 30), index + 100) : '';
        const chapterTitle = (chapter.title || '').trim();
        const prefix = `第${chapter.number}章`;
        const startsWithPrefix = chapterTitle.startsWith(prefix);
        console.log(`Search chapter ${chapter.id}: title="${chapterTitle}", prefix="${prefix}", startsWith=${startsWithPrefix}`);
        const displayTitle = startsWithPrefix ? chapterTitle : `${prefix} ${chapterTitle}`;
        results.push({ type: 'chapter', id: chapter.id, title: displayTitle, snippet: snippet.replace(new RegExp(`(${q})`, 'gi'), '**$1**') });
      }
    }

    // 搜索角色 - 添加空值保护
    const characters = project.characters || [];
    for (const character of characters) {
      if (character.name.toLowerCase().includes(keyword) || character.description?.toLowerCase().includes(keyword)) {
        results.push({ type: 'character', id: character.id, title: `角色：${character.name}`, snippet: character.description?.slice(0, 100) || '' });
      }
    }

    // 搜索世界观 - 添加空值保护
    if (project.worldSettings?.background?.toLowerCase().includes(keyword)) {
      results.push({ type: 'world', id: 'world', title: '世界观设定', snippet: project.worldSettings.background.slice(0, 100) });
    }

    res.json({ results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== 写作统计 =====
app.get('/api/projects/:id/stats', authMiddleware, async (req, res) => {
  try {
    const project = await loadProject(req.params.id, { loadContent: false });
    // 允许管理员访问所有项目
    if (!req.isAdmin && project.userId !== req.userId) return res.status(403).json({ error: '无权访问' });

    const chapters = project.chapters || [];
    const totalWords = project.wordCount || 0;
    const totalChapters = chapters.length;
    const avgWordsPerChapter = totalChapters > 0 ? Math.round(totalWords / totalChapters) : 0;

    const dailyStats = {};
    for (const chapter of chapters) {
      const date = new Date(chapter.updatedAt).toISOString().split('T')[0];
      dailyStats[date] = (dailyStats[date] || 0) + (chapter.wordCount || 0);
    }

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(); date.setDate(date.getDate() - i);
      last7Days.push({ date: date.toISOString().split('T')[0], words: dailyStats[date.toISOString().split('T')[0]] || 0 });
    }

    res.json({ totalWords, totalChapters, avgWordsPerChapter, characterCount: (project.characters || []).length, dailyStats: last7Days, lastUpdated: project.updatedAt });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 注册超大小说API路由
registerMegaNovelRoutes(app, authMiddleware);

// 静态文件服务
app.use(express.static(join(__dirname, '..', 'frontend', 'dist')));
app.get('*', (req, res) => { res.sendFile(join(__dirname, '..', 'frontend', 'dist', 'index.html')); });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => { console.log(`小说写作助手运行在 http://localhost:${PORT}`); });
