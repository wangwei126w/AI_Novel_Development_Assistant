/**
 * 超长篇小说存储管理系统
 * 支持1000万字的高效存储、索引和检索
 */

import { join } from 'path';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { createHash } from 'crypto';

const DATA_DIR = join(process.cwd(), 'data');
const PROJECTS_DIR = join(DATA_DIR, 'projects');
const CHAPTERS_DIR = join(DATA_DIR, 'chapters');
const INDEXES_DIR = join(DATA_DIR, 'indexes');
const BACKUP_DIR = join(DATA_DIR, 'backups');

// 确保目录存在
async function ensureDir(dir) {
  try { await fs.mkdir(dir, { recursive: true }); } catch (e) {}
}

await ensureDir(PROJECTS_DIR);
await ensureDir(CHAPTERS_DIR);
await ensureDir(INDEXES_DIR);
await ensureDir(BACKUP_DIR);

/**
 * 分块存储管理器
 * 将章节内容分块存储，支持流式读取
 */
export class ChunkedStorage {
  constructor(projectId) {
    this.projectId = projectId;
    this.projectDir = join(CHAPTERS_DIR, projectId);
    this.chunkSize = 100 * 1024; // 100KB per chunk
  }

  /**
   * 保存章节内容（自动分块）
   */
  async saveChapter(chapterId, content) {
    await ensureDir(this.projectDir);
    const chapterDir = join(this.projectDir, chapterId);
    await ensureDir(chapterDir);

    // 如果内容小于chunkSize，直接保存
    if (content.length <= this.chunkSize) {
      await fs.writeFile(join(chapterDir, 'content.txt'), content, 'utf-8');
      await fs.writeFile(join(chapterDir, 'meta.json'), JSON.stringify({
        chunks: 1,
        totalSize: content.length,
        updatedAt: Date.now()
      }));
      return;
    }

    // 分块存储
    const chunks = [];
    for (let i = 0; i < content.length; i += this.chunkSize) {
      const chunk = content.slice(i, i + this.chunkSize);
      const chunkIndex = Math.floor(i / this.chunkSize);
      await fs.writeFile(join(chapterDir, `chunk_${chunkIndex}.txt`), chunk, 'utf-8');
      chunks.push({
        index: chunkIndex,
        size: chunk.length,
        hash: createHash('md5').update(chunk).digest('hex')
      });
    }

    await fs.writeFile(join(chapterDir, 'meta.json'), JSON.stringify({
      chunks: chunks.length,
      totalSize: content.length,
      chunkList: chunks,
      updatedAt: Date.now()
    }));
  }

  /**
   * 加载章节内容（支持部分加载）
   */
  async loadChapter(chapterId, options = {}) {
    const { start = 0, length = null } = options;
    const chapterDir = join(this.projectDir, chapterId);

    try {
      const metaPath = join(chapterDir, 'meta.json');
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));

      // 单文件存储
      if (meta.chunks === 1) {
        const content = await fs.readFile(join(chapterDir, 'content.txt'), 'utf-8');
        if (length) {
          return content.slice(start, start + length);
        }
        return content;
      }

      // 分块存储
      let result = '';
      let currentPos = 0;

      for (const chunkInfo of meta.chunkList) {
        const chunkPath = join(chapterDir, `chunk_${chunkInfo.index}.txt`);
        
        // 检查是否需要读取这个块
        const chunkStart = currentPos;
        const chunkEnd = currentPos + chunkInfo.size;

        if (chunkEnd <= start || (length && chunkStart >= start + length)) {
          currentPos = chunkEnd;
          continue;
        }

        const chunk = await fs.readFile(chunkPath, 'utf-8');
        
        if (start > chunkStart || (length && result.length + chunk.length > length)) {
          // 需要截取
          const chunkOffset = Math.max(0, start - chunkStart);
          const chunkLength = length 
            ? Math.min(chunk.length - chunkOffset, length - result.length)
            : chunk.length - chunkOffset;
          result += chunk.slice(chunkOffset, chunkOffset + chunkLength);
        } else {
          result += chunk;
        }

        currentPos = chunkEnd;
        if (length && result.length >= length) break;
      }

      return result;
    } catch (e) {
      return '';
    }
  }

  /**
   * 流式读取章节（用于大章节）
   */
  async *streamChapter(chapterId) {
    const chapterDir = join(this.projectDir, chapterId);
    const metaPath = join(chapterDir, 'meta.json');

    try {
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));

      if (meta.chunks === 1) {
        const content = await fs.readFile(join(chapterDir, 'content.txt'), 'utf-8');
        yield content;
      } else {
        for (const chunkInfo of meta.chunkList) {
          const chunk = await fs.readFile(
            join(chapterDir, `chunk_${chunkInfo.index}.txt`), 
            'utf-8'
          );
          yield chunk;
        }
      }
    } catch (e) {
      yield '';
    }
  }

  /**
   * 删除章节
   */
  async deleteChapter(chapterId) {
    const chapterDir = join(this.projectDir, chapterId);
    try {
      await fs.rm(chapterDir, { recursive: true, force: true });
    } catch (e) {}
  }

  /**
   * 获取章节大小
   */
  async getChapterSize(chapterId) {
    const chapterDir = join(this.projectDir, chapterId);
    try {
      const meta = JSON.parse(await fs.readFile(join(chapterDir, 'meta.json'), 'utf-8'));
      return meta.totalSize;
    } catch (e) {
      return 0;
    }
  }
}

/**
 * 项目索引管理器
 * 维护快速查找索引
 */
export class ProjectIndex {
  constructor(projectId) {
    this.projectId = projectId;
    this.indexPath = join(INDEXES_DIR, `${projectId}.json`);
    this.index = null;
  }

  /**
   * 加载索引
   */
  async load() {
    try {
      const content = await fs.readFile(this.indexPath, 'utf-8');
      this.index = JSON.parse(content);
    } catch (e) {
      this.index = {
        chapters: {},
        characters: {},
        keywords: {},
        lastUpdated: 0
      };
    }
    return this.index;
  }

  /**
   * 保存索引
   */
  async save() {
    if (this.index) {
      this.index.lastUpdated = Date.now();
      await fs.writeFile(this.indexPath, JSON.stringify(this.index, null, 2));
    }
  }

  /**
   * 更新章节索引
   */
  async updateChapterIndex(chapter) {
    if (!this.index) await this.load();
    
    this.index.chapters[chapter.id] = {
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
      summary: chapter.summary,
      keywords: chapter.keywords || [],
      wordCount: chapter.wordCount,
      characterAppearances: chapter.characterAppearances || [],
      volumeId: chapter.volumeId,
      partId: chapter.partId,
      updatedAt: Date.now()
    };

    // 更新关键词索引
    for (const keyword of chapter.keywords || []) {
      if (!this.index.keywords[keyword]) {
        this.index.keywords[keyword] = [];
      }
      if (!this.index.keywords[keyword].includes(chapter.id)) {
        this.index.keywords[keyword].push(chapter.id);
      }
    }

    await this.save();
  }

  /**
   * 更新角色索引
   */
  async updateCharacterIndex(character) {
    if (!this.index) await this.load();
    
    this.index.characters[character.id] = {
      id: character.id,
      name: character.name,
      aliases: character.aliases || [],
      firstAppearance: character.firstAppearance,
      lastAppearance: character.lastAppearance,
      appearanceCount: character.appearanceCount,
      appearanceChapters: character.appearanceChapters || []
    };

    await this.save();
  }

  /**
   * 搜索章节
   */
  async searchChapters(query) {
    if (!this.index) await this.load();
    
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const chapter of Object.values(this.index.chapters)) {
      let score = 0;

      // 标题匹配
      if (chapter.title?.toLowerCase().includes(lowerQuery)) {
        score += 10;
      }

      // 摘要匹配
      if (chapter.summary?.toLowerCase().includes(lowerQuery)) {
        score += 5;
      }

      // 关键词匹配
      if (chapter.keywords?.some(kw => kw.toLowerCase().includes(lowerQuery))) {
        score += 8;
      }

      if (score > 0) {
        results.push({ ...chapter, score });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * 通过关键词查找章节
   */
  async findByKeyword(keyword) {
    if (!this.index) await this.load();
    const chapterIds = this.index.keywords[keyword] || [];
    return chapterIds.map(id => this.index.chapters[id]).filter(Boolean);
  }

  /**
   * 获取角色出场章节
   */
  async getCharacterAppearances(characterId) {
    if (!this.index) await this.load();
    const charIndex = this.index.characters[characterId];
    if (!charIndex) return [];

    return charIndex.appearanceChapters
      .map(chId => this.index.chapters[chId])
      .filter(Boolean);
  }
}

/**
 * 项目元数据管理（轻量级）
 */
export class ProjectMetaManager {
  constructor(projectId) {
    this.projectId = projectId;
    this.metaPath = join(PROJECTS_DIR, `${projectId}.json`);
  }

  /**
   * 保存项目元数据（不含章节内容）
   */
  async saveMeta(project) {
    // 分离章节内容，只保存元数据
    const metaOnly = {
      ...project,
      chapters: project.chapters?.map(ch => ({
        id: ch.id,
        number: ch.number,
        title: ch.title,
        summary: ch.summary,
        keywords: ch.keywords,
        wordCount: ch.wordCount,
        volumeId: ch.volumeId,
        partId: ch.partId,
        characterAppearances: ch.characterAppearances,
        locked: ch.locked,
        createdAt: ch.createdAt,
        updatedAt: ch.updatedAt
      })) || []
    };

    await fs.writeFile(this.metaPath, JSON.stringify(metaOnly, null, 2));
    return metaOnly;
  }

  /**
   * 加载项目元数据
   */
  async loadMeta() {
    try {
      const content = await fs.readFile(this.metaPath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      return null;
    }
  }

  /**
   * 部分更新项目
   */
  async patchMeta(updates) {
    const project = await this.loadMeta();
    if (!project) return null;

    const updated = { ...project, ...updates, updatedAt: Date.now() };
    await this.saveMeta(updated);
    return updated;
  }
}

/**
 * 备份管理器
 */
export class BackupManager {
  constructor(projectId) {
    this.projectId = projectId;
    this.backupDir = join(BACKUP_DIR, projectId);
  }

  /**
   * 创建备份
   */
  async createBackup() {
    await ensureDir(this.backupDir);
    const timestamp = Date.now();
    const backupPath = join(this.backupDir, `backup_${timestamp}.json`);

    // 加载完整项目数据
    const metaManager = new ProjectMetaManager(this.projectId);
    const project = await metaManager.loadMeta();

    if (!project) return null;

    // 保存备份
    await fs.writeFile(backupPath, JSON.stringify(project, null, 2));

    // 清理旧备份（保留最近20个）
    await this.cleanOldBackups();

    return backupPath;
  }

  /**
   * 清理旧备份
   */
  async cleanOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = files
        .filter(f => f.startsWith('backup_'))
        .map(f => ({
          name: f,
          time: parseInt(f.match(/backup_(\d+)\.json/)?.[1] || 0)
        }))
        .sort((a, b) => b.time - a.time);

      // 删除旧备份
      for (const backup of backups.slice(20)) {
        await fs.unlink(join(this.backupDir, backup.name));
      }
    } catch (e) {}
  }

  /**
   * 列出备份
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      return files
        .filter(f => f.startsWith('backup_'))
        .map(f => ({
          name: f,
          time: parseInt(f.match(/backup_(\d+)\.json/)?.[1] || 0)
        }))
        .sort((a, b) => b.time - a.time);
    } catch (e) {
      return [];
    }
  }

  /**
   * 恢复备份
   */
  async restoreBackup(backupName) {
    const backupPath = join(this.backupDir, backupName);
    try {
      const content = await fs.readFile(backupPath, 'utf-8');
      const project = JSON.parse(content);

      // 恢复元数据
      const metaManager = new ProjectMetaManager(this.projectId);
      await metaManager.saveMeta(project);

      return project;
    } catch (e) {
      return null;
    }
  }
}

/**
 * 超大项目加载器（分页加载）
 */
export class MegaProjectLoader {
  constructor(projectId) {
    this.projectId = projectId;
    this.metaManager = new ProjectMetaManager(projectId);
    this.storage = new ChunkedStorage(projectId);
    this.index = new ProjectIndex(projectId);
  }

  /**
   * 加载项目（仅元数据）
   */
  async loadMeta() {
    return await this.metaManager.loadMeta();
  }

  /**
   * 加载单个章节
   */
  async loadChapter(chapterId, options = {}) {
    const content = await this.storage.loadChapter(chapterId, options);
    const project = await this.loadMeta();
    const chapterMeta = project?.chapters?.find(ch => ch.id === chapterId);

    return {
      ...chapterMeta,
      content
    };
  }

  /**
   * 分页加载章节列表
   */
  async loadChaptersPage(page = 1, pageSize = 50) {
    const project = await this.loadMeta();
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      chapters: project?.chapters?.slice(start, end) || [],
      total: project?.chapters?.length || 0,
      page,
      pageSize,
      totalPages: Math.ceil((project?.chapters?.length || 0) / pageSize)
    };
  }

  /**
   * 加载卷的章节
   */
  async loadVolumeChapters(volumeId) {
    const project = await this.loadMeta();
    return project?.chapters?.filter(ch => ch.volumeId === volumeId) || [];
  }

  /**
   * 保存章节
   */
  async saveChapter(chapter) {
    // 保存内容
    await this.storage.saveChapter(chapter.id, chapter.content || '');

    // 更新元数据
    const project = await this.loadMeta();
    const chapterIndex = project.chapters.findIndex(ch => ch.id === chapter.id);

    if (chapterIndex >= 0) {
      project.chapters[chapterIndex] = {
        ...project.chapters[chapterIndex],
        title: chapter.title,
        summary: chapter.summary,
        keywords: chapter.keywords,
        wordCount: chapter.wordCount,
        characterAppearances: chapter.characterAppearances,
        updatedAt: Date.now()
      };
    } else {
      project.chapters.push({
        id: chapter.id,
        number: chapter.number,
        title: chapter.title,
        summary: chapter.summary,
        keywords: chapter.keywords,
        wordCount: chapter.wordCount,
        volumeId: chapter.volumeId,
        partId: chapter.partId,
        characterAppearances: chapter.characterAppearances,
        locked: chapter.locked,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    // 更新总字数
    project.totalWordCount = project.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
    project.updatedAt = Date.now();

    await this.metaManager.saveMeta(project);

    // 更新索引
    await this.index.updateChapterIndex(project.chapters[chapterIndex >= 0 ? chapterIndex : project.chapters.length - 1]);

    return project;
  }
}

// 导出便捷函数
export async function createMegaProject(projectData) {
  const id = `mega_${Date.now()}`;
  const project = {
    id,
    ...projectData,
    totalWordCount: 0,
    totalChapters: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const manager = new ProjectMetaManager(id);
  await manager.saveMeta(project);

  return project;
}

export async function loadMegaProject(projectId) {
  const loader = new MegaProjectLoader(projectId);
  return await loader.loadMeta();
}
