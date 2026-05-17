/**
 * 超长篇小说 API 路由
 * 集成到 Express 服务器
 */

import { MegaContextBuilder, buildQuickContext, buildDeepContext, buildRAGContext, indexProjectChapters } from './mega-context-builder.js';
import { MegaProjectLoader, createMegaProject, loadMegaProject, BackupManager, ProjectIndex } from './mega-storage.js';
import { callAI, extractAIContent } from './ai-service.js';
import { ClueTracker, ClueType, ClueStatus, autoExtractClues } from './clue-tracker.js';
import { VectorIndex, SmartContextRetriever, indexProjectChapters as vectorIndexProject } from './vector-store.js';
import { SegmentManager, SegmentContextBuilder, SEGMENT_CONFIG } from './mega-segment-manager.js';
import { smartExtractClues, batchExtractClues } from './ai-clue-extractor.js';

/**
 * 注册超大小说 API 路由
 * @param {Express} app - Express 应用实例
 * @param {Function} authMiddleware - 认证中间件
 */
export function registerMegaNovelRoutes(app, authMiddleware) {

  // ==================== 项目级 API ====================

  /**
   * 创建超大项目
   */
  app.post('/api/mega/projects', authMiddleware, async (req, res) => {
    try {
      const { title, summary, targetWordCount = 10000000, structure } = req.body;

      const project = await createMegaProject({
        userId: req.userId,
        title,
        summary,
        targetWordCount,
        config: {
          targetWordCount,
          targetChapters: Math.ceil(targetWordCount / 3000),
          avgChapterLength: 3000,
          autoSummary: true,
          autoBackup: true,
          backupInterval: 30,
          aiContextMode: 'deep'
        },
        parts: structure?.parts || [],
        volumes: structure?.volumes || [],
        chapters: [],
        characters: [],
        worldSettings: {
          background: '',
          rules: '',
          history: '',
          geography: [],
          factions: [],
          timeline: [],
          cultures: [],
          importantItems: []
        },
        plotOutlines: [],
        notes: [],
        status: 'planning',
        locked: false
      });

      res.json({ success: true, project });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 获取用户的超大项目列表
   */
  app.get('/api/mega/projects', authMiddleware, async (req, res) => {
    try {
      const { readdir } = await import('fs/promises');
      const { join } = await import('path');
      const PROJECTS_DIR = join(process.cwd(), 'data', 'projects');
      
      const files = await readdir(PROJECTS_DIR);
      const projects = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const { readFile } = await import('fs/promises');
            const content = await readFile(join(PROJECTS_DIR, file), 'utf-8');
            const project = JSON.parse(content);
            
            // 只返回当前用户的超大项目
            if (project.userId === req.userId && project.id?.startsWith('mega_')) {
              projects.push({
                id: project.id,
                title: project.title,
                summary: project.summary,
                targetWordCount: project.targetWordCount,
                totalWordCount: project.totalWordCount || 0,
                totalChapters: project.totalChapters || 0,
                status: project.status,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt
              });
            }
          } catch (e) {
            // 跳过无法解析的文件
          }
        }
      }
      
      // 按更新时间排序
      projects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      
      res.json(projects);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 获取超大项目元数据
   */
  app.get('/api/mega/projects/:id', authMiddleware, async (req, res) => {
    try {
      const loader = new MegaProjectLoader(req.params.id);
      const project = await loader.loadMeta();

      if (!project) {
        return res.status(404).json({ error: '项目不存在' });
      }

      if (project.userId !== req.userId && !req.isAdmin) {
        return res.status(403).json({ error: '无权访问' });
      }

      res.json(project);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 更新项目元数据（世界观、角色等）
   */
  app.put('/api/mega/projects/:id', authMiddleware, async (req, res) => {
    try {
      const updates = req.body;
      const loader = new MegaProjectLoader(req.params.id);
      let project = await loader.loadMeta();

      if (!project) {
        return res.status(404).json({ error: '项目不存在' });
      }

      if (project.userId !== req.userId && !req.isAdmin) {
        return res.status(403).json({ error: '无权访问' });
      }

      // 合并更新
      Object.assign(project, updates, { updatedAt: Date.now() });

      await loader.metaManager.saveMeta(project);
      res.json({ success: true, project });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 更新项目结构（部/卷）
   */
  app.patch('/api/mega/projects/:id/structure', authMiddleware, async (req, res) => {
    try {
      const { parts, volumes } = req.body;
      const loader = new MegaProjectLoader(req.params.id);
      let project = await loader.loadMeta();

      if (!project) {
        return res.status(404).json({ error: '项目不存在' });
      }

      if (project.userId !== req.userId && !req.isAdmin) {
        return res.status(403).json({ error: '无权访问' });
      }

      if (parts) project.parts = parts;
      if (volumes) project.volumes = volumes;
      project.updatedAt = Date.now();

      await loader.metaManager.saveMeta(project);
      res.json({ success: true, project });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== 章节 API ====================

  /**
   * 分页获取章节列表
   */
  app.get('/api/mega/projects/:id/chapters', authMiddleware, async (req, res) => {
    try {
      const { page = 1, pageSize = 50, volumeId, partId } = req.query;
      const loader = new MegaProjectLoader(req.params.id);

      let chapters;
      if (volumeId) {
        chapters = await loader.loadVolumeChapters(volumeId);
        res.json({
          chapters,
          total: chapters.length,
          page: 1,
          pageSize: chapters.length,
          totalPages: 1
        });
      } else {
        const result = await loader.loadChaptersPage(parseInt(page), parseInt(pageSize));
        res.json(result);
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 获取单个章节（含内容）
   */
  app.get('/api/mega/projects/:id/chapters/:chapterId', authMiddleware, async (req, res) => {
    try {
      const loader = new MegaProjectLoader(req.params.id);
      const chapter = await loader.loadChapter(req.params.chapterId);

      if (!chapter) {
        return res.status(404).json({ error: '章节不存在' });
      }

      res.json(chapter);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 保存章节
   */
  app.put('/api/mega/projects/:id/chapters/:chapterId', authMiddleware, async (req, res) => {
    try {
      const { title, content, summary, keywords, characterAppearances, locked } = req.body;
      const loader = new MegaProjectLoader(req.params.id);

      const wordCount = content ? content.length : 0;

      const chapter = await loader.saveChapter({
        id: req.params.chapterId,
        title,
        content,
        summary,
        keywords,
        wordCount,
        characterAppearances,
        locked
      });

      res.json({ success: true, chapter });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 创建新章节
   */
  app.post('/api/mega/projects/:id/chapters', authMiddleware, async (req, res) => {
    try {
      const { title, volumeId, partId, number } = req.body;
      const loader = new MegaProjectLoader(req.params.id);
      const project = await loader.loadMeta();

      const chapterId = `ch_${Date.now()}`;
      const chapter = {
        id: chapterId,
        number: number || (project.chapters?.length || 0) + 1,
        title: title || `第${number}章`,
        volumeId,
        partId,
        summary: '',
        keywords: [],
        wordCount: 0,
        characterAppearances: [],
        locked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await loader.saveChapter(chapter);

      res.json({ success: true, chapter });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== AI 写作 API ====================

  /**
   * AI 续写（使用分层上下文）
   */
  app.post('/api/mega/ai/write', authMiddleware, async (req, res) => {
    try {
      const { projectId, chapterId, mode = 'continue', prompt, style, contextDepth = 'deep' } = req.body;

      const loader = new MegaProjectLoader(projectId);
      const project = await loader.loadMeta();

      if (!project) {
        return res.status(404).json({ error: '项目不存在' });
      }

      // 构建上下文
      let context;
      if (contextDepth === 'quick') {
        context = await buildQuickContext(project, chapterId, { mode });
      } else {
        context = await buildDeepContext(project, chapterId, { mode, maxTokens: 15000 });
      }

      // 加载当前章节内容
      const chapter = await loader.loadChapter(chapterId);
      const chapterContent = chapter?.content || '';

      // 构建系统提示词
      let systemPrompt = `你是一位专业的小说写作助手，擅长创作超长篇网络小说（1000万字级别）。

你正在协助作者续写一部已经建立了完整世界观、角色设定和情节大纲的小说。

核心原则：
1. **角色一致性**：每个角色的行为、语言风格必须符合其性格设定
2. **世界观一致性**：所有事件必须符合世界观规则
3. **情节连贯性**：续写内容必须与前文逻辑连贯，推进已有情节
4. **大纲遵循**：按照情节大纲的方向发展故事
5. **超长篇小说节奏**：注意网文节奏，保持爽点，适当铺垫
6. **只输出正文**：不要添加解释、标注或章节标题`;

      if (style) {
        systemPrompt += `\n\n写作风格要求：${style}\n`;
      }

      // 构建用户提示词
      let userPrompt = context;

      if (chapterContent) {
        userPrompt += `\n\n【当前章节已有内容】\n${chapterContent.slice(-3000)}\n\n`;
      }

      if (mode === 'continue') {
        userPrompt += `请根据以上世界观、角色设定、情节大纲和前文内容，续写当前章节。

要求：
1. 保持与已有内容的连贯性
2. 角色行为和对话符合其性格设定
3. 遵循世界观规则
4. 推进情节发展
5. 网文风格，节奏紧凑
6. 只输出续写内容，不要添加解释

直接输出续写内容：`;
      } else if (mode === 'rewrite') {
        userPrompt += `请根据以上世界观和角色设定，改写/润色以下内容。

要求：${prompt || '提升文笔，保持原意'}

原文：
${chapterContent || ''}`;
      } else if (mode === 'dialogue') {
        userPrompt += `请根据角色性格设定，为以下场景生成对话。

场景描述：${prompt}

要求：
1. 对话符合角色性格
2. 语言自然流畅
3. 推动情节发展`;
      } else if (mode === 'outline') {
        userPrompt = `基于以下小说设定，请生成情节大纲。\n\n${context}\n\n要求：${prompt || '生成接下来3-5章的情节大纲，每章包含主要事件和转折'}`;
      } else if (mode === 'custom') {
        userPrompt += `\n\n用户要求：${prompt}`;
      }

      const result = await callAI({
        systemPrompt,
        userPrompt,
        maxTokens: 3000,
        temperature: 0.8
      });

      res.json({
        content: result.choices?.[0]?.message?.content || result.content,
        usage: result.usage,
        contextSize: context.length
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 批量生成章节摘要
   */
  app.post('/api/mega/ai/summarize-batch', authMiddleware, async (req, res) => {
    try {
      const { projectId, chapterIds } = req.body;
      const loader = new MegaProjectLoader(projectId);
      const project = await loader.loadMeta();

      const results = [];

      for (const chapterId of chapterIds) {
        const chapter = await loader.loadChapter(chapterId);
        if (!chapter?.content || chapter.content.length < 100) {
          results.push({ chapterId, success: false, reason: '内容太短' });
          continue;
        }

        const systemPrompt = '请为以下小说章节生成简短摘要（150字以内）和关键词（3-5个）。\n格式：\n摘要：xxx\n关键词：xxx, xxx, xxx';
        const userPrompt = `章节标题：${chapter.title}\n\n内容：\n${chapter.content.slice(0, 5000)}`;

        try {
          const result = await callAI({
            systemPrompt,
            userPrompt,
            maxTokens: 500
          });

          const text = result.choices?.[0]?.message?.content || result.content;
          const summaryMatch = text.match(/摘要[:：](.+?)(?=\n|$)/);
          const keywordsMatch = text.match(/关键词[:：](.+?)(?=\n|$)/);

          const summary = summaryMatch ? summaryMatch[1].trim() : '';
          const keywords = keywordsMatch
            ? keywordsMatch[1].split(/[,，]/).map(k => k.trim()).filter(Boolean)
            : [];

          // 更新章节
          chapter.summary = summary;
          chapter.keywords = keywords;
          await loader.saveChapter(chapter);

          results.push({ chapterId, success: true, summary, keywords });
        } catch (err) {
          results.push({ chapterId, success: false, error: err.message });
        }
      }

      res.json({ results });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== 搜索 API ====================

  /**
   * 全文搜索
   */
  app.get('/api/mega/projects/:id/search', authMiddleware, async (req, res) => {
    try {
      const { q, type = 'all' } = req.query;
      const index = new ProjectIndex(req.params.id);

      let results = [];

      if (type === 'all' || type === 'chapter') {
        const chapterResults = await index.searchChapters(q);
        results.push(...chapterResults.map(r => ({ ...r, type: 'chapter' })));
      }

      if (type === 'all' || type === 'keyword') {
        const keywordResults = await index.findByKeyword(q);
        results.push(...keywordResults.map(r => ({ ...r, type: 'keyword' })));
      }

      // 去重并排序
      const seen = new Set();
      const uniqueResults = results
        .filter(r => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        })
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 50);

      res.json({ results: uniqueResults, total: uniqueResults.length });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 获取角色出场记录
   */
  app.get('/api/mega/projects/:id/characters/:characterId/appearances', authMiddleware, async (req, res) => {
    try {
      const index = new ProjectIndex(req.params.id);
      const appearances = await index.getCharacterAppearances(req.params.characterId);

      res.json({ appearances });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== 备份 API ====================

  /**
   * 创建备份
   */
  app.post('/api/mega/projects/:id/backup', authMiddleware, async (req, res) => {
    try {
      const backupManager = new BackupManager(req.params.id);
      const backupPath = await backupManager.createBackup();

      res.json({ success: true, backupPath });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 列出备份
   */
  app.get('/api/mega/projects/:id/backups', authMiddleware, async (req, res) => {
    try {
      const backupManager = new BackupManager(req.params.id);
      const backups = await backupManager.listBackups();

      res.json({ backups });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 恢复备份
   */
  app.post('/api/mega/projects/:id/restore', authMiddleware, async (req, res) => {
    try {
      const { backupName } = req.body;
      const backupManager = new BackupManager(req.params.id);
      const project = await backupManager.restoreBackup(backupName);

      res.json({ success: true, project });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== 统计 API ====================

  /**
   * 获取项目统计
   */
  app.get('/api/mega/projects/:id/stats', authMiddleware, async (req, res) => {
    try {
      const loader = new MegaProjectLoader(req.params.id);
      const project = await loader.loadMeta();

      if (!project) {
        return res.status(404).json({ error: '项目不存在' });
      }

      const stats = {
        totalWordCount: project.totalWordCount,
        totalChapters: project.chapters?.length || 0,
        totalVolumes: project.volumes?.length || 0,
        totalParts: project.parts?.length || 0,
        totalCharacters: project.characters?.length || 0,
        progress: {
          wordCount: Math.round((project.totalWordCount / project.config?.targetWordCount) * 100),
          chapters: Math.round(((project.chapters?.length || 0) / (project.config?.targetChapters || 1)) * 100)
        },
        volumeStats: project.volumes?.map(v => ({
          id: v.id,
          title: v.title,
          chapterCount: project.chapters?.filter(ch => ch.volumeId === v.id).length || 0,
          wordCount: project.chapters
            ?.filter(ch => ch.volumeId === v.id)
            .reduce((sum, ch) => sum + (ch.wordCount || 0), 0) || 0
        })),
        recentActivity: project.chapters
          ?.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
          .slice(0, 10)
          .map(ch => ({
            chapterId: ch.id,
            title: ch.title,
            updatedAt: ch.updatedAt
          }))
      };

      res.json(stats);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== 线索/伏笔追踪 API ====================

  /**
   * 获取项目的所有线索
   */
  app.get('/api/mega/projects/:id/clues', authMiddleware, async (req, res) => {
    try {
      const tracker = new ClueTracker(req.params.id);
      await tracker.load();

      const { status, type } = req.query;
      let clues = tracker.clues;

      if (status) {
        clues = clues.filter(c => c.status === status);
      }
      if (type) {
        clues = clues.filter(c => c.type === type);
      }

      res.json(clues);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 创建新线索（挖坑）
   */
  app.post('/api/mega/projects/:id/clues', authMiddleware, async (req, res) => {
    try {
      const tracker = new ClueTracker(req.params.id);
      await tracker.load();

      const clue = await tracker.addClue({
        type: req.body.type || ClueType.FORESHADOWING,
        title: req.body.title,
        description: req.body.description,
        chapterId: req.body.chapterId,
        chapterNumber: req.body.chapterNumber,
        relatedCharacters: req.body.relatedCharacters || [],
        relatedItems: req.body.relatedItems || [],
        relatedLocations: req.body.relatedLocations || [],
        expectedResolveChapter: req.body.expectedResolveChapter,
        expectedResolveVolume: req.body.expectedResolveVolume,
        importance: req.body.importance || 3,
        remindBeforeChapter: req.body.remindBeforeChapter || 3,
      });

      res.status(201).json(clue);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 解决线索（填坑）
   */
  app.post('/api/mega/projects/:id/clues/:clueId/resolve', authMiddleware, async (req, res) => {
    try {
      const tracker = new ClueTracker(req.params.id);
      await tracker.load();

      const clue = await tracker.resolveClue(req.params.clueId, {
        chapterId: req.body.chapterId,
        chapterNumber: req.body.chapterNumber,
        description: req.body.resolution,
      });

      if (!clue) {
        return res.status(404).json({ error: '线索不存在' });
      }

      res.json(clue);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 更新线索状态
   */
  app.patch('/api/mega/projects/:id/clues/:clueId', authMiddleware, async (req, res) => {
    try {
      const tracker = new ClueTracker(req.params.id);
      await tracker.load();

      const { status } = req.body;
      const clue = await tracker.updateStatus(req.params.clueId, status);

      if (!clue) {
        return res.status(404).json({ error: '线索不存在' });
      }

      res.json(clue);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 获取需要提醒的线索
   */
  app.get('/api/mega/projects/:id/clues/reminders', authMiddleware, async (req, res) => {
    try {
      const tracker = new ClueTracker(req.params.id);
      await tracker.load();

      const currentChapter = parseInt(req.query.currentChapter) || 0;
      const reminders = tracker.getReminders(currentChapter);

      res.json(reminders);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 自动提取线索（基础规则版）
   */
  app.post('/api/mega/projects/:id/auto-extract-clues', authMiddleware, async (req, res) => {
    try {
      const { chapterId } = req.body;
      const loader = new MegaProjectLoader(req.params.id);
      const project = await loader.loadMeta();

      if (!project) {
        return res.status(404).json({ error: '项目不存在' });
      }

      // 加载章节内容
      const chapterContent = await loader.loadChapter(chapterId);
      const clues = await autoExtractClues(project, chapterId, chapterContent);

      res.json({ success: true, extracted: clues.length, clues });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * AI 智能提取线索（高级版）
   */
  app.post('/api/mega/projects/:id/ai-extract-clues', authMiddleware, async (req, res) => {
    try {
      const { chapterId, options = {} } = req.body;
      const loader = new MegaProjectLoader(req.params.id);
      const project = await loader.loadMeta();

      if (!project) {
        return res.status(404).json({ error: '项目不存在' });
      }

      // 加载章节内容
      const chapterData = await loader.loadChapter(chapterId);
      if (!chapterData || !chapterData.content) {
        return res.status(404).json({ error: '章节不存在或内容为空' });
      }

      // 获取章节信息
      const chapter = project.chapters.find(ch => ch.id === chapterId);
      
      // 使用 AI 智能提取
      const result = await smartExtractClues(req.params.id, chapterId, chapterData.content, {
        bookTitle: project.title,
        chapterNumber: chapter?.number || 0,
        chapterTitle: chapter?.title || '',
        analyzeTiming: options.analyzeTiming !== false,
        checkRelationships: options.checkRelationships !== false
      });

      res.json(result);
    } catch (e) {
      console.error('AI 线索提取失败:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 批量 AI 提取线索
   */
  app.post('/api/mega/projects/:id/ai-extract-clues-batch', authMiddleware, async (req, res) => {
    try {
      const { chapterIds, options = {} } = req.body;
      const loader = new MegaProjectLoader(req.params.id);
      const project = await loader.loadMeta();

      if (!project) {
        return res.status(404).json({ error: '项目不存在' });
      }

      // 加载指定章节
      const chapters = [];
      for (const chapterId of chapterIds) {
        const chapterData = await loader.loadChapter(chapterId);
        const chapter = project.chapters.find(ch => ch.id === chapterId);
        if (chapterData && chapterData.content) {
          chapters.push({
            id: chapterId,
            number: chapter?.number || 0,
            title: chapter?.title || '',
            content: chapterData.content
          });
        }
      }

      // 批量提取
      const result = await batchExtractClues(req.params.id, chapters, {
        bookTitle: project.title,
        ...options
      });

      res.json(result);
    } catch (e) {
      console.error('批量 AI 线索提取失败:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== RAG 向量检索 API ====================

  /**
   * 构建项目向量索引
   */
  app.post('/api/mega/projects/:id/index', authMiddleware, async (req, res) => {
    try {
      const loader = new MegaProjectLoader(req.params.id);
      const project = await loader.loadMeta();

      if (!project) {
        return res.status(404).json({ error: '项目不存在' });
      }

      // 加载所有章节内容
      const chapterContents = {};
      for (const chapter of project.chapters) {
        try {
          const chapterData = await loader.loadChapter(chapter.id);
          chapterContents[chapter.id] = chapterData?.content || '';
        } catch (e) {
          // 章节可能不存在
        }
      }

      const result = await vectorIndexProject(project, chapterContents);

      res.json({
        success: true,
        message: '索引构建完成',
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 向量搜索
   */
  app.post('/api/mega/projects/:id/search-vector', authMiddleware, async (req, res) => {
    try {
      const { query, keywords, topK = 5 } = req.body;
      const index = new VectorIndex(req.params.id);
      await index.load();

      let results;
      if (keywords && keywords.length > 0) {
        results = await index.hybridSearch(query, keywords, topK);
      } else {
        results = await index.search(query, topK);
      }

      res.json({
        query,
        resultsCount: results.length,
        results
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 获取RAG上下文
   */
  app.post('/api/mega/projects/:id/rag-context', authMiddleware, async (req, res) => {
    try {
      const { chapterId, currentText } = req.body;
      const loader = new MegaProjectLoader(req.params.id);
      const project = await loader.loadMeta();

      if (!project) {
        return res.status(404).json({ error: '项目不存在' });
      }

      const context = await buildRAGContext(project, chapterId, currentText, {
        maxTokens: 15000
      });

      res.json({
        context,
        contextLength: context.length,
        estimatedTokens: Math.floor(context.length * 1.5)
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 使用RAG进行AI写作
   */
  app.post('/api/mega/ai/write-rag', authMiddleware, async (req, res) => {
    try {
      const { projectId, chapterId, mode = 'continue', content, contextDepth = 'deep' } = req.body;

      const loader = new MegaProjectLoader(projectId);
      const project = await loader.loadMeta();

      if (!project) {
        return res.status(404).json({ error: '项目不存在' });
      }

      // 使用RAG构建上下文
      const context = await buildRAGContext(project, chapterId, content, {
        maxTokens: 15000
      });

      // 构建提示词
      let prompt;
      switch (mode) {
        case 'continue':
          prompt = `请根据以下上下文继续创作小说。\n\n${context}\n\n【前文内容】\n${content}\n\n请续写接下来的内容，保持文笔风格和情节连贯性。`;
          break;
        case 'rewrite':
          prompt = `请根据以下上下文重写/优化以下内容。\n\n${context}\n\n【需要重写的内容】\n${content}\n\n请优化这段内容，使其更加精彩。`;
          break;
        default:
          prompt = `请根据以下上下文创作小说内容。\n\n${context}\n\n${content}`;
      }

      // 调用AI
      const aiResponse = await callAI(prompt, {
        temperature: 0.8,
        max_tokens: 2000
      });

      res.json({
        content: aiResponse.content,
        usage: aiResponse.usage,
        contextLength: context.length,
        mode
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 获取向量索引统计
   */
  app.get('/api/mega/projects/:id/index-stats', authMiddleware, async (req, res) => {
    try {
      const index = new VectorIndex(req.params.id);
      await index.load();

      res.json(index.getStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== 分段管理 API ====================

  /**
   * 获取分段配置
   */
  app.get('/api/mega/projects/:id/segments/config', authMiddleware, async (req, res) => {
    try {
      res.json({
        config: SEGMENT_CONFIG,
        message: '7段式1000万字分段配置'
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 获取项目分段状态
   */
  app.get('/api/mega/projects/:id/segments', authMiddleware, async (req, res) => {
    try {
      const manager = new SegmentManager(req.params.id);
      await manager.load();
      const stats = manager.getSegmentStats();

      res.json(stats);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 更新段摘要
   */
  app.patch('/api/mega/projects/:id/segments/:segmentId/summary', authMiddleware, async (req, res) => {
    try {
      const { summary, keyEvents } = req.body;
      const manager = new SegmentManager(req.params.id);
      await manager.load();

      const segment = await manager.updateSegmentSummary(
        parseInt(req.params.segmentId),
        summary,
        keyEvents
      );

      res.json({ success: true, segment });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 更新段角色状态
   */
  app.patch('/api/mega/projects/:id/segments/:segmentId/characters', authMiddleware, async (req, res) => {
    try {
      const { characterStates } = req.body;
      const manager = new SegmentManager(req.params.id);
      await manager.load();

      const segment = await manager.updateCharacterSnapshot(
        parseInt(req.params.segmentId),
        characterStates
      );

      res.json({ success: true, segment });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 获取段上下文
   */
  app.get('/api/mega/projects/:id/segments/:segmentId/context', authMiddleware, async (req, res) => {
    try {
      const manager = new SegmentManager(req.params.id);
      await manager.load();

      const builder = new SegmentContextBuilder(manager);
      const context = await builder.buildSegmentContext(
        parseInt(req.params.segmentId),
        { includePrevious: req.query.includePrevious !== 'false' }
      );

      res.json({
        segmentId: parseInt(req.params.segmentId),
        context,
        contextLength: context?.length || 0
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 检查是否需要切换段
   */
  app.get('/api/mega/projects/:id/segments/check-switch', authMiddleware, async (req, res) => {
    try {
      const { chapterNumber } = req.query;
      const manager = new SegmentManager(req.params.id);
      await manager.load();

      const result = manager.checkSegmentSwitch(parseInt(chapterNumber));

      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * 获取跨段上下文（用于RAG）
   */
  app.get('/api/mega/projects/:id/segments/:segmentId/cross-context', authMiddleware, async (req, res) => {
    try {
      const manager = new SegmentManager(req.params.id);
      await manager.load();

      const builder = new SegmentContextBuilder(manager);
      const context = await builder.buildCrossSegmentQuery(
        '',
        parseInt(req.params.segmentId)
      );

      res.json({
        segmentId: parseInt(req.params.segmentId),
        context,
        contextLength: context?.length || 0
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}
