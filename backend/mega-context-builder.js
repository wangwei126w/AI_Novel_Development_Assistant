/**
 * 超长篇小说 AI 上下文构建系统
 * 支持 1000 万字级别的分层上下文管理
 * 集成 RAG 向量检索，解决超出上下文限制的问题
 */

import { join } from 'path';
import fs from 'fs/promises';
import { ClueTracker } from './clue-tracker.js';
import { SmartContextRetriever, indexProjectChapters } from './vector-store.js';

const CHAPTERS_DIR = join(process.cwd(), 'data', 'chapters');
const INDEX_DIR = join(process.cwd(), 'data', 'indexes');

// 确保目录存在
async function ensureDir(dir) {
  try { await fs.mkdir(dir, { recursive: true }); } catch (e) {}
}

await ensureDir(CHAPTERS_DIR);
await ensureDir(INDEX_DIR);

/**
 * 分层上下文构建器
 * 根据当前章节位置，智能构建多层级上下文
 */
export class MegaContextBuilder {
  constructor(project) {
    this.project = project;
    this.currentPart = null;
    this.currentVolume = null;
    this.currentChapter = null;
  }

  /**
   * 设置当前上下文位置
   */
  setPosition(chapterId) {
    this.currentChapter = this.project.chapters.find(ch => ch.id === chapterId);
    if (this.currentChapter) {
      this.currentVolume = this.project.volumes.find(v => v.id === this.currentChapter.volumeId);
      this.currentPart = this.project.parts.find(p => p.id === this.currentChapter.partId);
    }
    return this;
  }

  /**
   * 构建完整上下文
   * @param {Object} options
   * @param {string} options.mode - 写作模式: continue, rewrite, dialogue, outline
   * @param {number} options.maxTokens - 最大token数限制
   * @param {boolean} options.includeDeepContext - 是否包含深度上下文
   */
  async buildContext(options = {}) {
    const { mode = 'continue', maxTokens = 20000, includeDeepContext = true } = options;
    
    const context = {
      global: await this.buildGlobalContext(),
      part: await this.buildPartContext(),
      volume: await this.buildVolumeContext(),
      recent: await this.buildRecentContext(),
      clues: includeDeepContext ? await this.buildClueContext() : null,
    };

    // 根据token限制智能截断
    return this.optimizeContext(context, maxTokens);
  }

  /**
   * 第1层：全书级上下文（始终完整包含）
   */
  async buildGlobalContext() {
    const ctx = [];
    
    // 全书概要
    ctx.push(`【全书概要】\n${this.project.summary?.slice(0, 500) || '无'}\n`);
    
    // 世界观核心
    if (this.project.worldSettings?.background) {
      ctx.push(`【世界观背景】\n${this.project.worldSettings.background.slice(0, 1500)}\n`);
    }
    
    // 核心规则
    if (this.project.worldSettings?.rules) {
      ctx.push(`【世界核心规则】\n${this.project.worldSettings.rules.slice(0, 1000)}\n`);
    }
    
    // 主角团（最多10个核心角色）
    const mainChars = this.project.characters?.slice(0, 10) || [];
    if (mainChars.length > 0) {
      ctx.push('【核心角色】\n');
      for (const char of mainChars) {
        ctx.push(`- ${char.name}: ${char.description?.slice(0, 200) || '无描述'}`);
        if (char.personality) ctx.push(`  性格: ${char.personality.slice(0, 100)}`);
        if (char.goals) ctx.push(`  目标: ${char.goals.slice(0, 100)}`);
        ctx.push('');
      }
    }
    
    // 主线大纲
    const mainPlot = this.project.plotOutlines?.filter(p => p.level === 0).slice(0, 10) || [];
    if (mainPlot.length > 0) {
      ctx.push('【主线大纲】\n');
      for (const plot of mainPlot) {
        ctx.push(`- ${plot.title}: ${plot.content?.slice(0, 300) || '无内容'}`);
      }
      ctx.push('');
    }
    
    return ctx.join('\n');
  }

  /**
   * 第2层：部级上下文
   */
  async buildPartContext() {
    if (!this.currentPart) return '';
    
    const ctx = [];
    ctx.push(`【当前部：第${this.currentPart.number}部 ${this.currentPart.title}】\n`);
    ctx.push(`部概要: ${this.currentPart.summary?.slice(0, 500) || '无'}\n`);
    
    // 本部涉及的关键角色
    const partChars = this.getPartCharacters(this.currentPart.id);
    if (partChars.length > 0) {
      ctx.push('【本部关键角色】\n');
      for (const char of partChars.slice(0, 20)) {
        ctx.push(`- ${char.name}: ${char.description?.slice(0, 150) || '无'}`);
        if (char.currentPower) ctx.push(`  当前状态: ${char.currentPower}`);
        if (char.currentLocation) ctx.push(`  当前位置: ${char.currentLocation}`);
      }
      ctx.push('');
    }
    
    // 本部大纲
    const partPlots = this.project.plotOutlines?.filter(
      p => p.partRange && p.partRange[0] <= this.currentPart.number && p.partRange[1] >= this.currentPart.number
    ).slice(0, 10) || [];
    
    if (partPlots.length > 0) {
      ctx.push('【本部情节】\n');
      for (const plot of partPlots) {
        ctx.push(`- ${plot.title}: ${plot.content?.slice(0, 250) || '无'}`);
      }
      ctx.push('');
    }
    
    return ctx.join('\n');
  }

  /**
   * 第3层：卷级上下文
   */
  async buildVolumeContext() {
    if (!this.currentVolume) return '';
    
    const ctx = [];
    ctx.push(`【当前卷：第${this.currentVolume.number}卷 ${this.currentVolume.title}】\n`);
    ctx.push(`卷概要: ${this.currentVolume.summary?.slice(0, 400) || '无'}\n`);
    
    // 本卷关键情节点
    if (this.currentVolume.plotPoints?.length > 0) {
      ctx.push('【本卷关键情节】\n');
      for (const point of this.currentVolume.plotPoints) {
        ctx.push(`- ${point}`);
      }
      ctx.push('');
    }
    
    // 本卷已完成的章节摘要
    const volumeChapters = this.project.chapters.filter(
      ch => ch.volumeId === this.currentVolume.id && ch.number < this.currentChapter?.number
    );
    
    if (volumeChapters.length > 0) {
      ctx.push(`【本卷已完成章节摘要（共${volumeChapters.length}章）】\n`);
      // 只显示最近20章和第一章
      const recentChapters = volumeChapters.slice(-20);
      const firstChapter = volumeChapters[0];
      
      if (firstChapter && !recentChapters.find(c => c.id === firstChapter.id)) {
        ctx.push(`第${firstChapter.number}章 ${firstChapter.title}: ${firstChapter.summary?.slice(0, 150) || '无摘要'}`);
      }
      
      for (const ch of recentChapters) {
        ctx.push(`第${ch.number}章 ${ch.title}: ${ch.summary?.slice(0, 150) || '无摘要'}`);
        if (ch.keywords?.length > 0) {
          ctx.push(`  关键词: ${ch.keywords.join(', ')}`);
        }
      }
      ctx.push('');
    }
    
    return ctx.join('\n');
  }

  /**
   * 第4层：最近章节上下文
   */
  async buildRecentContext() {
    if (!this.currentChapter) return '';
    
    const ctx = [];
    const currentIndex = this.project.chapters.findIndex(ch => ch.id === this.currentChapter.id);
    
    // 最近20章（跨卷）
    if (currentIndex > 0) {
      ctx.push('【最近章节回顾】\n');
      const recentChapters = this.project.chapters.slice(Math.max(0, currentIndex - 20), currentIndex);
      
      for (const ch of recentChapters) {
        ctx.push(`第${ch.number}章 ${ch.title}: ${ch.summary?.slice(0, 200) || '无摘要'}`);
        if (ch.characterAppearances?.length > 0) {
          const charNames = ch.characterAppearances
            .map(id => this.project.characters.find(c => c.id === id)?.name)
            .filter(Boolean)
            .join(', ');
          if (charNames) ctx.push(`  出场角色: ${charNames}`);
        }
      }
      ctx.push('');
    }
    
    // 当前章节定位
    ctx.push(`【当前章节：第${this.currentChapter.number}章 ${this.currentChapter.title}】\n`);
    if (this.currentChapter.summary) {
      ctx.push(`本章定位: ${this.currentChapter.summary}\n`);
    }
    
    return ctx.join('\n');
  }

  /**
   * 第5层：线索追踪上下文（增强版）
   * 集成 ClueTracker 实现智能挖坑填坑追踪
   */
  async buildClueContext() {
    const ctx = [];
    const currentIndex = this.project.chapters.findIndex(ch => ch.id === this.currentChapter.id);
    const currentChapterNumber = this.currentChapter?.number || 0;
    
    // 使用 ClueTracker 获取智能线索上下文
    const tracker = new ClueTracker(this.project.id);
    await tracker.load();
    
    // 获取线索追踪上下文（包含紧急提醒、活跃伏笔、已解决线索）
    const clueContext = tracker.generateContext(currentChapterNumber);
    if (clueContext) {
      ctx.push(clueContext);
    }
    
    // 补充：活跃角色追踪（最近5章出场的角色）
    const completedChapters = this.project.chapters.slice(0, currentIndex);
    const recentChapters = completedChapters.slice(-5);
    const activeCharacterIds = new Set();
    recentChapters.forEach(ch => {
      ch.characterAppearances?.forEach(id => activeCharacterIds.add(id));
    });
    
    if (activeCharacterIds.size > 0) {
      ctx.push('【活跃角色】\n');
      for (const charId of Array.from(activeCharacterIds).slice(0, 8)) {
        const char = this.project.characters.find(c => c.id === charId);
        if (char) {
          ctx.push(`- ${char.name}: ${char.currentLocation ? `在${char.currentLocation}` : ''} ${char.currentPower ? `| 状态: ${char.currentPower}` : ''}`);
        }
      }
      ctx.push('');
    }
    
    return ctx.join('\n');
  }

  /**
   * 优化上下文长度
   */
  optimizeContext(context, maxTokens) {
    // 估算token数（中文字符约1.5token，英文约0.25token）
    const estimateTokens = (text) => {
      const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
      const english = (text.match(/[a-zA-Z]+/g) || []).length;
      return chinese * 1.5 + english * 0.25;
    };
    
    let result = [];
    let currentTokens = 0;
    
    // 按优先级添加上下文
    const priority = ['global', 'part', 'volume', 'recent', 'clues'];
    
    for (const key of priority) {
      const text = context[key];
      if (!text) continue;
      
      const tokens = estimateTokens(text);
      if (currentTokens + tokens <= maxTokens * 0.9) {
        result.push(text);
        currentTokens += tokens;
      } else {
        // 如果超出限制，截断当前层
        const remaining = maxTokens * 0.9 - currentTokens;
        const ratio = remaining / tokens;
        if (ratio > 0.3) {
          const truncated = text.slice(0, Math.floor(text.length * ratio));
          result.push(truncated + '\n...（已截断）\n');
        }
        break;
      }
    }
    
    return result.join('\n---\n');
  }

  /**
   * 获取部涉及的角色
   */
  getPartCharacters(partId) {
    // 通过章节出场统计找出本部活跃的角色
    const partChapters = this.project.chapters.filter(ch => ch.partId === partId);
    const charAppearances = {};
    
    partChapters.forEach(ch => {
      ch.characterAppearances?.forEach(charId => {
        charAppearances[charId] = (charAppearances[charId] || 0) + 1;
      });
    });
    
    // 按出场次数排序
    const sortedCharIds = Object.entries(charAppearances)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
    
    return sortedCharIds
      .map(id => this.project.characters.find(c => c.id === id))
      .filter(Boolean);
  }
}

/**
 * 快速上下文构建（用于轻量级续写）
 */
export async function buildQuickContext(project, chapterId, options = {}) {
  const builder = new MegaContextBuilder(project);
  builder.setPosition(chapterId);
  return builder.buildContext({ ...options, includeDeepContext: false });
}

/**
 * 深度上下文构建（用于重要章节）
 */
export async function buildDeepContext(project, chapterId, options = {}) {
  const builder = new MegaContextBuilder(project);
  builder.setPosition(chapterId);
  return builder.buildContext({ ...options, includeDeepContext: true });
}

/**
 * RAG增强上下文构建
 * 结合向量检索，为超长小说提供智能上下文
 */
export async function buildRAGContext(project, chapterId, currentText, options = {}) {
  const builder = new MegaContextBuilder(project);
  builder.setPosition(chapterId);
  
  // 1. 构建基础分层上下文
  const baseContext = await builder.buildContext({
    ...options,
    maxTokens: 10000,  // 为基础上下文预留部分token
    includeDeepContext: true
  });
  
  // 2. 使用RAG检索相关历史内容
  const retriever = new SmartContextRetriever(project);
  await retriever.load();
  
  const ragContext = await retriever.buildRAGContext(
    currentText,
    chapterId,
    {
      maxChunks: 8,
      recencyWeight: 0.3,
      characterBoost: true,
      clueBoost: true
    }
  );
  
  // 3. 组合上下文
  const combined = [];
  
  if (baseContext) {
    combined.push('【基础上下文】\n' + baseContext);
  }
  
  if (ragContext) {
    combined.push('\n' + ragContext);
  }
  
  combined.push('\n【写作要求】\n');
  combined.push('1. 保持与上文内容的连贯性');
  combined.push('2. 注意与"相关历史内容"中的情节呼应');
  combined.push('3. 如果有活跃伏笔，请在合适时机推进或解决');
  combined.push('4. 保持角色性格和设定的统一');
  
  return combined.join('\n');
}

/**
 * 导出索引工具
 */
export { indexProjectChapters };
