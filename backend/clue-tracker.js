/**
 * 伏笔/线索追踪系统
 * 解决AI写作中的"挖坑不填"和"遗忘前文"问题
 */

import { join } from 'path';
import fs from 'fs/promises';

const CLUES_DIR = join(process.cwd(), 'data', 'clues');

async function ensureDir(dir) {
  try { await fs.mkdir(dir, { recursive: true }); } catch (e) {}
}

await ensureDir(CLUES_DIR);

/**
 * 线索类型枚举
 */
export const ClueType = {
  FORESHADOWING: 'foreshadowing',  // 伏笔
  MYSTERY: 'mystery',              // 悬念
  QUEST: 'quest',                  // 任务/目标
  RELATIONSHIP: 'relationship',    // 关系变化
  POWER: 'power',                  // 能力/修为
  ITEM: 'item',                    // 物品/道具
  LOCATION: 'location',            // 地点/场景
  TIMELINE: 'timeline',            // 时间线
};

/**
 * 线索状态枚举
 */
export const ClueStatus = {
  ACTIVE: 'active',        // 活跃中（已挖坑，待填）
  RESOLVED: 'resolved',    // 已解决（已填坑）
  DORMANT: 'dormant',      // 休眠（暂时搁置）
  ABANDONED: 'abandoned',  // 废弃（决定不填）
};

/**
 * 线索管理器
 */
export class ClueTracker {
  constructor(projectId) {
    this.projectId = projectId;
    this.cluesPath = join(CLUES_DIR, `${projectId}.json`);
    this.clues = [];
    this.loaded = false;
  }

  /**
   * 加载线索数据
   */
  async load() {
    try {
      const content = await fs.readFile(this.cluesPath, 'utf-8');
      this.clues = JSON.parse(content);
      this.loaded = true;
    } catch (e) {
      this.clues = [];
      this.loaded = true;
    }
    return this;
  }

  /**
   * 保存线索数据
   */
  async save() {
    await fs.writeFile(this.cluesPath, JSON.stringify(this.clues, null, 2));
  }

  /**
   * 添加新线索（挖坑）
   */
  async addClue(clue) {
    const newClue = {
      id: `clue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: clue.type || ClueType.FORESHADOWING,
      status: ClueStatus.ACTIVE,
      title: clue.title,
      description: clue.description,
      chapterId: clue.chapterId,        // 创建章节
      chapterNumber: clue.chapterNumber,
      createdAt: Date.now(),
      
      // 关联信息
      relatedCharacters: clue.relatedCharacters || [],  // 关联角色ID
      relatedItems: clue.relatedItems || [],            // 关联物品
      relatedLocations: clue.relatedLocations || [],    // 关联地点
      
      // 预期解决信息
      expectedResolveChapter: clue.expectedResolveChapter || null,  // 预期解决章节
      expectedResolveVolume: clue.expectedResolveVolume || null,    // 预期解决卷
      importance: clue.importance || 3,  // 重要性 1-5
      
      // 解决信息
      resolvedAt: null,
      resolvedChapterId: null,
      resolution: null,  // 解决描述
      
      // 追踪信息
      mentions: [{
        chapterId: clue.chapterId,
        chapterNumber: clue.chapterNumber,
        type: 'create',
        timestamp: Date.now()
      }],
      
      // 提醒设置
      remindBeforeChapter: clue.remindBeforeChapter || 3,  // 解决前N章提醒
    };
    
    this.clues.push(newClue);
    await this.save();
    return newClue;
  }

  /**
   * 解决线索（填坑）
   */
  async resolveClue(clueId, resolution) {
    const clue = this.clues.find(c => c.id === clueId);
    if (!clue) return null;
    
    clue.status = ClueStatus.RESOLVED;
    clue.resolvedAt = Date.now();
    clue.resolvedChapterId = resolution.chapterId;
    clue.resolution = resolution.description;
    
    clue.mentions.push({
      chapterId: resolution.chapterId,
      chapterNumber: resolution.chapterNumber,
      type: 'resolve',
      timestamp: Date.now()
    });
    
    await this.save();
    return clue;
  }

  /**
   * 更新线索状态
   */
  async updateStatus(clueId, status) {
    const clue = this.clues.find(c => c.id === clueId);
    if (!clue) return null;
    
    clue.status = status;
    await this.save();
    return clue;
  }

  /**
   * 添加线索提及（在章节中再次提到）
   */
  async addMention(clueId, mention) {
    const clue = this.clues.find(c => c.id === clueId);
    if (!clue) return null;
    
    clue.mentions.push({
      chapterId: mention.chapterId,
      chapterNumber: mention.chapterNumber,
      type: mention.type || 'mention',
      context: mention.context,
      timestamp: Date.now()
    });
    
    await this.save();
    return clue;
  }

  /**
   * 获取需要提醒的线索（即将需要填坑的）
   */
  getReminders(currentChapterNumber) {
    return this.clues
      .filter(c => c.status === ClueStatus.ACTIVE)
      .filter(c => {
        // 如果有预期解决章节，且接近解决章节
        if (c.expectedResolveChapter) {
          const chaptersUntilResolve = c.expectedResolveChapter - currentChapterNumber;
          return chaptersUntilResolve <= c.remindBeforeChapter && chaptersUntilResolve >= 0;
        }
        // 如果没有预期解决章节，创建后超过20章未解决则提醒
        if (c.chapterNumber) {
          return currentChapterNumber - c.chapterNumber >= 20;
        }
        return false;
      })
      .sort((a, b) => (a.expectedResolveChapter || 99999) - (b.expectedResolveChapter || 99999));
  }

  /**
   * 获取活跃线索
   */
  getActiveClues() {
    return this.clues
      .filter(c => c.status === ClueStatus.ACTIVE)
      .sort((a, b) => b.importance - a.importance);
  }

  /**
   * 获取已解决线索
   */
  getResolvedClues() {
    return this.clues
      .filter(c => c.status === ClueStatus.RESOLVED)
      .sort((a, b) => b.resolvedAt - a.resolvedAt);
  }

  /**
   * 获取指定类型的线索
   */
  getCluesByType(type) {
    return this.clues.filter(c => c.type === type);
  }

  /**
   * 获取与角色相关的线索
   */
  getCluesByCharacter(characterId) {
    return this.clues.filter(c => 
      c.relatedCharacters.includes(characterId)
    );
  }

  /**
   * 生成上下文提示文本
   */
  generateContext(currentChapterNumber) {
    const ctx = [];
    
    // 1. 紧急提醒（即将到期的伏笔）
    const reminders = this.getReminders(currentChapterNumber);
    if (reminders.length > 0) {
      ctx.push('【⚠️ 紧急提醒：以下伏笔需要在本章或近期解决】\n');
      for (const clue of reminders.slice(0, 5)) {
        const chaptersUntil = clue.expectedResolveChapter 
          ? `（预计第${clue.expectedResolveChapter}章解决，还剩${clue.expectedResolveChapter - currentChapterNumber}章）`
          : `（已创建${currentChapterNumber - clue.chapterNumber}章，建议尽快解决）`;
        ctx.push(`- [${this.getTypeLabel(clue.type)}] ${clue.title}${chaptersUntil}`);
        ctx.push(`  描述: ${clue.description.slice(0, 150)}`);
        if (clue.relatedCharacters.length > 0) {
          ctx.push(`  关联角色: ${clue.relatedCharacters.join(', ')}`);
        }
      }
      ctx.push('');
    }
    
    // 2. 活跃伏笔列表
    const activeClues = this.getActiveClues();
    if (activeClues.length > 0) {
      ctx.push(`【📌 活跃伏笔/线索（共${activeClues.length}个）】\n`);
      
      // 按重要性分组
      const highImportance = activeClues.filter(c => c.importance >= 4);
      const normalImportance = activeClues.filter(c => c.importance < 4);
      
      if (highImportance.length > 0) {
        ctx.push('【核心伏笔】');
        for (const clue of highImportance.slice(0, 8)) {
          ctx.push(`- ${clue.title} (${this.getTypeLabel(clue.type)}, 重要性:${clue.importance})`);
          ctx.push(`  ${clue.description.slice(0, 120)}`);
          if (clue.mentions.length > 1) {
            ctx.push(`  提及次数: ${clue.mentions.length}次`);
          }
        }
        ctx.push('');
      }
      
      if (normalImportance.length > 0) {
        ctx.push('【一般线索】');
        for (const clue of normalImportance.slice(0, 10)) {
          ctx.push(`- ${clue.title}`);
        }
        ctx.push('');
      }
    }
    
    // 3. 最近解决的伏笔（防止重复解决）
    const recentlyResolved = this.getResolvedClues().slice(0, 5);
    if (recentlyResolved.length > 0) {
      ctx.push('【✅ 最近解决的伏笔】\n');
      for (const clue of recentlyResolved) {
        ctx.push(`- ${clue.title}: ${clue.resolution?.slice(0, 100) || '已解决'}`);
      }
      ctx.push('');
    }
    
    // 4. 统计信息
    const stats = {
      active: this.clues.filter(c => c.status === ClueStatus.ACTIVE).length,
      resolved: this.clues.filter(c => c.status === ClueStatus.RESOLVED).length,
      dormant: this.clues.filter(c => c.status === ClueStatus.DORMANT).length,
    };
    ctx.push(`【线索统计】活跃:${stats.active} | 已解决:${stats.resolved} | 休眠:${stats.dormant}\n`);
    
    return ctx.join('\n');
  }

  getTypeLabel(type) {
    const labels = {
      [ClueType.FORESHADOWING]: '伏笔',
      [ClueType.MYSTERY]: '悬念',
      [ClueType.QUEST]: '任务',
      [ClueType.RELATIONSHIP]: '关系',
      [ClueType.POWER]: '能力',
      [ClueType.ITEM]: '物品',
      [ClueType.LOCATION]: '地点',
      [ClueType.TIMELINE]: '时间线',
    };
    return labels[type] || '其他';
  }
}

/**
 * 自动从章节内容中提取线索
 */
export async function autoExtractClues(project, chapterId, chapterContent) {
  const tracker = new ClueTracker(project.id);
  await tracker.load();
  
  const chapter = project.chapters.find(ch => ch.id === chapterId);
  if (!chapter) return [];
  
  const extractedClues = [];
  
  // 1. 从章节关键词中提取新线索
  if (chapter.keywords) {
    for (const keyword of chapter.keywords) {
      // 检查是否已存在
      const exists = tracker.clues.some(c => 
        c.title.includes(keyword) || c.description.includes(keyword)
      );
      if (!exists) {
        extractedClues.push({
          type: ClueType.FORESHADOWING,
          title: `关于"${keyword}"的伏笔`,
          description: `第${chapter.number}章提到了"${keyword}"，可能是一个重要线索`,
          chapterId: chapterId,
          chapterNumber: chapter.number,
          importance: 3,
        });
      }
    }
  }
  
  // 2. 从角色变化中提取线索
  if (chapter.characterAppearances) {
    for (const charId of chapter.characterAppearances) {
      const char = project.characters.find(c => c.id === charId);
      if (char && char.currentPower?.includes('突破')) {
        extractedClues.push({
          type: ClueType.POWER,
          title: `${char.name}的能力变化`,
          description: `${char.name}在第${chapter.number}章有了新的能力变化，可能影响后续剧情`,
          chapterId: chapterId,
          chapterNumber: chapter.number,
          relatedCharacters: [charId],
          importance: 4,
        });
      }
    }
  }
  
  // 添加提取的线索
  for (const clue of extractedClues) {
    await tracker.addClue(clue);
  }
  
  return extractedClues;
}
