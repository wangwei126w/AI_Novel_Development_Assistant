/**
 * 1000万字小说7段式分段管理器
 * 
 * 核心参数：
 * - 全文：1000万字
 * - 单段安全容量：150万字/段（100万Token，留20%冗余防溢出）
 * - 总段数：7段（前6段各150万，第7段100万）
 * 
 * 分段明细：
 * 第1段：001-150万字
 * 第2段：151-300万字
 * 第3段：301-450万字
 * 第4段：451-600万字
 * 第5段：601-750万字
 * 第6段：751-900万字
 * 第7段：901-1000万字
 */

import { join } from 'path';
import fs from 'fs/promises';

const SEGMENTS_DIR = join(process.cwd(), 'data', 'segments');

async function ensureDir(dir) {
  try { await fs.mkdir(dir, { recursive: true }); } catch (e) {}
}

await ensureDir(SEGMENTS_DIR);

/**
 * 7段式分段配置
 */
export const SEGMENT_CONFIG = {
  totalWords: 10000000,        // 1000万字
  segmentCapacity: 1500000,    // 150万字/段
  tokenCapacity: 1000000,      // 100万Token
  safetyMargin: 0.8,           // 80%安全线（留20%冗余）
  totalSegments: 7,
  
  // 分段明细
  segments: [
    { id: 1, name: '第1段', startWord: 0,       endWord: 1500000,  startChapter: 1,   endChapter: 500,  description: '开篇奠基' },
    { id: 2, name: '第2段', startWord: 1500001, endWord: 3000000,  startChapter: 501, endChapter: 1000, description: '发展推进' },
    { id: 3, name: '第3段', startWord: 3000001, endWord: 4500000,  startChapter: 1001, endChapter: 1500, description: '转折升级' },
    { id: 4, name: '第4段', startWord: 4500001, endWord: 6000000,  startChapter: 1501, endChapter: 2000, description: '高潮酝酿' },
    { id: 5, name: '第5段', startWord: 6000001, endWord: 7500000,  startChapter: 2001, endChapter: 2500, description: '冲突爆发' },
    { id: 6, name: '第6段', startWord: 7500001, endWord: 9000000,  startChapter: 2501, endChapter: 3000, description: '决战前夕' },
    { id: 7, name: '第7段', startWord: 9000001, endWord: 10000000, startChapter: 3001, endChapter: 3334, description: '终局收尾' }
  ]
};

/**
 * 段级元数据管理器
 */
export class SegmentManager {
  constructor(projectId) {
    this.projectId = projectId;
    this.segmentsPath = join(SEGMENTS_DIR, `${projectId}.json`);
    this.segments = [];
    this.loaded = false;
  }

  /**
   * 加载段配置
   */
  async load() {
    try {
      const data = await fs.readFile(this.segmentsPath, 'utf-8');
      this.segments = JSON.parse(data);
      this.loaded = true;
    } catch (e) {
      // 初始化默认段配置
      this.segments = SEGMENT_CONFIG.segments.map(s => ({
        ...s,
        projectId: this.projectId,
        currentWordCount: 0,
        currentChapterCount: 0,
        lastChapterId: null,
        lastChapterNumber: 0,
        status: 'pending',      // pending/active/completed
        indexed: false,         // 是否已建立向量索引
        summary: '',            // 段级摘要
        keyEvents: [],          // 关键事件
        characterStates: {},    // 角色状态快照
        activeClues: [],        // 活跃线索
        createdAt: Date.now(),
        updatedAt: Date.now()
      }));
      this.loaded = true;
      await this.save();
    }
    return this;
  }

  /**
   * 保存段配置
   */
  async save() {
    await fs.writeFile(this.segmentsPath, JSON.stringify(this.segments, null, 2));
  }

  /**
   * 获取当前段
   */
  getCurrentSegment() {
    // 找到第一个未完成的段
    return this.segments.find(s => s.status !== 'completed') || this.segments[this.segments.length - 1];
  }

  /**
   * 根据章节号获取段
   */
  getSegmentByChapter(chapterNumber) {
    return this.segments.find(s => 
      chapterNumber >= s.startChapter && chapterNumber <= s.endChapter
    );
  }

  /**
   * 根据字数获取段
   */
  getSegmentByWordCount(wordCount) {
    return this.segments.find(s => 
      wordCount >= s.startWord && wordCount <= s.endWord
    );
  }

  /**
   * 更新段进度
   */
  async updateSegmentProgress(segmentId, wordCount, chapterNumber, chapterId) {
    const segment = this.segments.find(s => s.id === segmentId);
    if (!segment) return null;

    segment.currentWordCount = wordCount;
    segment.currentChapterCount = chapterNumber - segment.startChapter + 1;
    segment.lastChapterId = chapterId;
    segment.lastChapterNumber = chapterNumber;
    segment.updatedAt = Date.now();

    // 检查是否达到安全线
    const safeLimit = SEGMENT_CONFIG.segmentCapacity * SEGMENT_CONFIG.safetyMargin;
    if (segment.currentWordCount >= safeLimit && segment.status === 'active') {
      segment.status = 'warning';  // 接近容量上限
    }

    // 检查是否完成
    if (segment.currentWordCount >= SEGMENT_CONFIG.segmentCapacity) {
      segment.status = 'completed';
      // 激活下一段
      const nextSegment = this.segments.find(s => s.id === segmentId + 1);
      if (nextSegment) {
        nextSegment.status = 'active';
      }
    }

    await this.save();
    return segment;
  }

  /**
   * 更新段摘要
   */
  async updateSegmentSummary(segmentId, summary, keyEvents = []) {
    const segment = this.segments.find(s => s.id === segmentId);
    if (!segment) return null;

    segment.summary = summary;
    segment.keyEvents = keyEvents;
    segment.updatedAt = Date.now();
    await this.save();
    return segment;
  }

  /**
   * 更新角色状态快照
   */
  async updateCharacterSnapshot(segmentId, characterStates) {
    const segment = this.segments.find(s => s.id === segmentId);
    if (!segment) return null;

    segment.characterStates = { ...segment.characterStates, ...characterStates };
    segment.updatedAt = Date.now();
    await this.save();
    return segment;
  }

  /**
   * 标记段索引状态
   */
  async markSegmentIndexed(segmentId, indexed = true) {
    const segment = this.segments.find(s => s.id === segmentId);
    if (!segment) return null;

    segment.indexed = indexed;
    segment.updatedAt = Date.now();
    await this.save();
    return segment;
  }

  /**
   * 获取段统计
   */
  getSegmentStats() {
    const totalWords = this.segments.reduce((sum, s) => sum + s.currentWordCount, 0);
    const totalChapters = this.segments.reduce((sum, s) => sum + s.currentChapterCount, 0);
    const completedSegments = this.segments.filter(s => s.status === 'completed').length;
    const activeSegment = this.getCurrentSegment();

    return {
      totalWords,
      totalChapters,
      completedSegments,
      activeSegmentId: activeSegment?.id,
      activeSegmentName: activeSegment?.name,
      progress: (totalWords / SEGMENT_CONFIG.totalWords * 100).toFixed(2),
      segments: this.segments.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        wordCount: s.currentWordCount,
        chapterCount: s.currentChapterCount,
        capacity: SEGMENT_CONFIG.segmentCapacity,
        usage: (s.currentWordCount / SEGMENT_CONFIG.segmentCapacity * 100).toFixed(2)
      }))
    };
  }

  /**
   * 获取跨段上下文（用于RAG检索）
   */
  getCrossSegmentContext(targetSegmentId) {
    const targetIndex = this.segments.findIndex(s => s.id === targetSegmentId);
    if (targetIndex === -1) return null;

    const context = {
      current: this.segments[targetIndex],
      previous: targetIndex > 0 ? this.segments[targetIndex - 1] : null,
      next: targetIndex < this.segments.length - 1 ? this.segments[targetIndex + 1] : null,
      allSummaries: this.segments.map(s => ({
        id: s.id,
        name: s.name,
        summary: s.summary,
        keyEvents: s.keyEvents
      }))
    };

    return context;
  }

  /**
   * 检查是否需要切换段
   */
  checkSegmentSwitch(chapterNumber) {
    const currentSegment = this.getCurrentSegment();
    if (!currentSegment) return { needSwitch: false };

    // 检查是否超出当前段范围
    if (chapterNumber > currentSegment.endChapter) {
      const nextSegment = this.segments.find(s => s.id === currentSegment.id + 1);
      if (nextSegment) {
        return {
          needSwitch: true,
          fromSegment: currentSegment,
          toSegment: nextSegment,
          reason: 'chapter_overflow'
        };
      }
    }

    // 检查是否达到安全线
    const safeLimit = SEGMENT_CONFIG.segmentCapacity * SEGMENT_CONFIG.safetyMargin;
    if (currentSegment.currentWordCount >= safeLimit) {
      return {
        needSwitch: true,
        fromSegment: currentSegment,
        toSegment: this.segments.find(s => s.id === currentSegment.id + 1),
        reason: 'capacity_warning'
      };
    }

    return { needSwitch: false };
  }
}

/**
 * 段级上下文构建器
 */
export class SegmentContextBuilder {
  constructor(segmentManager) {
    this.segmentManager = segmentManager;
  }

  /**
   * 构建段内写作上下文
   */
  async buildSegmentContext(segmentId, options = {}) {
    const segment = this.segmentManager.segments.find(s => s.id === segmentId);
    if (!segment) return null;

    const context = [];

    // 1. 段级摘要
    if (segment.summary) {
      context.push(`【${segment.name}摘要】\n${segment.summary}`);
    }

    // 2. 关键事件
    if (segment.keyEvents.length > 0) {
      context.push(`【关键事件】\n${segment.keyEvents.map((e, i) => `${i + 1}. ${e}`).join('\n')}`);
    }

    // 3. 角色状态
    if (Object.keys(segment.characterStates).length > 0) {
      context.push(`【角色状态】\n${Object.entries(segment.characterStates)
        .map(([name, state]) => `- ${name}: ${state}`)
        .join('\n')}`);
    }

    // 4. 活跃线索
    if (segment.activeClues.length > 0) {
      context.push(`【活跃线索】\n${segment.activeClues.map(c => `- ${c}`).join('\n')}`);
    }

    // 5. 前情提要（从前一段获取）
    const prevSegment = this.segmentManager.segments.find(s => s.id === segmentId - 1);
    if (prevSegment && options.includePrevious !== false) {
      context.push(`【前情提要】\n${prevSegment.name}已完结。${prevSegment.summary || '暂无摘要'}`);
    }

    return context.join('\n\n');
  }

  /**
   * 构建跨段查询上下文（用于RAG）
   */
  async buildCrossSegmentQuery(query, targetSegmentId) {
    const crossContext = this.segmentManager.getCrossSegmentContext(targetSegmentId);
    if (!crossContext) return null;

    const context = [];

    // 1. 所有段摘要（用于全局理解）
    context.push('【全书结构】');
    crossContext.allSummaries.forEach(s => {
      context.push(`${s.name}：${s.summary || '暂无摘要'}`);
    });

    // 2. 当前段重点
    if (crossContext.current) {
      context.push(`\n【当前段重点】\n${crossContext.current.name}：${crossContext.current.summary || '暂无摘要'}`);
    }

    // 3. 前一段结尾
    if (crossContext.previous) {
      context.push(`\n【前段结尾】\n${crossContext.previous.name}已完结。关键事件：${crossContext.previous.keyEvents.slice(-3).join('；') || '暂无'}`);
    }

    // 4. 下一段预告
    if (crossContext.next) {
      context.push(`\n【下段预告】\n${crossContext.next.name}即将开始。`);
    }

    return context.join('\n');
  }
}

export default {
  SEGMENT_CONFIG,
  SegmentManager,
  SegmentContextBuilder
};
