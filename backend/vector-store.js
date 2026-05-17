/**
 * 向量检索系统 - RAG (Retrieval-Augmented Generation)
 * 解决1000万字小说超出模型上下文限制的问题
 * 
 * 核心思路：
 * 1. 将章节内容分块并生成向量嵌入
 * 2. 构建向量索引支持相似度搜索
 * 3. AI写作时，根据当前内容检索相关历史章节
 * 4. 只将最相关的片段放入上下文，而非全文
 */

import { join } from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const VECTOR_DIR = join(process.cwd(), 'data', 'vectors');
const CHUNKS_DIR = join(process.cwd(), 'data', 'chunks');

// 确保目录存在
async function ensureDir(dir) {
  try { await fs.mkdir(dir, { recursive: true }); } catch (e) {}
}

await ensureDir(VECTOR_DIR);
await ensureDir(CHUNKS_DIR);

/**
 * 简单的向量相似度计算（余弦相似度）
 */
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 简单的文本向量化（基于词频的稀疏向量）
 * 实际生产环境应使用 OpenAI Embedding API 或本地模型
 */
function textToVector(text, dimension = 512) {
  // 分词并统计词频
  const words = text.toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
  
  const wordFreq = {};
  words.forEach(w => {
    wordFreq[w] = (wordFreq[w] || 0) + 1;
  });
  
  // 生成固定维度的向量
  const vector = new Array(dimension).fill(0);
  Object.entries(wordFreq).forEach(([word, freq]) => {
    // 使用哈希将词映射到向量位置
    const hash = crypto.createHash('md5').update(word).digest('hex');
    const index = parseInt(hash.slice(0, 8), 16) % dimension;
    vector[index] += freq;
  });
  
  // 归一化
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map(v => v / (norm || 1));
}

/**
 * 文本分块器
 * 将长文本分割成适合检索的块
 */
export class TextChunker {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 500;      // 每块字符数
    this.chunkOverlap = options.chunkOverlap || 100; // 块间重叠字符数
    this.minChunkSize = options.minChunkSize || 100;
  }

  /**
   * 按语义边界分块（优先按段落，其次按句子）
   */
  split(text) {
    const chunks = [];
    
    // 先按段落分割
    const paragraphs = text.split(/\n\s*\n/);
    
    let currentChunk = '';
    for (const para of paragraphs) {
      if (currentChunk.length + para.length > this.chunkSize) {
        if (currentChunk.length >= this.minChunkSize) {
          chunks.push(currentChunk.trim());
        }
        // 保留重叠部分
        currentChunk = currentChunk.slice(-this.chunkOverlap) + '\n' + para;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + para;
      }
    }
    
    if (currentChunk.length >= this.minChunkSize) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * 带元数据的分块
   */
  splitWithMetadata(text, metadata = {}) {
    const chunks = this.split(text);
    return chunks.map((content, index) => ({
      id: `${metadata.chapterId || 'unknown'}_chunk_${index}`,
      content,
      metadata: {
        ...metadata,
        chunkIndex: index,
        totalChunks: chunks.length,
      }
    }));
  }
}

/**
 * 向量索引管理器
 */
export class VectorIndex {
  constructor(projectId) {
    this.projectId = projectId;
    this.indexPath = join(VECTOR_DIR, `${projectId}.json`);
    this.chunksPath = join(CHUNKS_DIR, `${projectId}.json`);
    this.vectors = [];      // 向量数组
    this.chunks = [];       // 文本块数组
    this.dimension = 512;
    this.loaded = false;
  }

  /**
   * 加载索引
   */
  async load() {
    try {
      const [vectorData, chunkData] = await Promise.all([
        fs.readFile(this.indexPath, 'utf-8').catch(() => '[]'),
        fs.readFile(this.chunksPath, 'utf-8').catch(() => '[]')
      ]);
      this.vectors = JSON.parse(vectorData);
      this.chunks = JSON.parse(chunkData);
      this.loaded = true;
    } catch (e) {
      this.vectors = [];
      this.chunks = [];
      this.loaded = true;
    }
    return this;
  }

  /**
   * 保存索引
   */
  async save() {
    await Promise.all([
      fs.writeFile(this.indexPath, JSON.stringify(this.vectors)),
      fs.writeFile(this.chunksPath, JSON.stringify(this.chunks))
    ]);
  }

  /**
   * 添加文档到索引
   */
  async addDocument(chapterId, text, metadata = {}) {
    const chunker = new TextChunker();
    const chunks = chunker.splitWithMetadata(text, {
      chapterId,
      ...metadata
    });

    for (const chunk of chunks) {
      const vector = textToVector(chunk.content, this.dimension);
      this.vectors.push(vector);
      this.chunks.push(chunk);
    }

    await this.save();
    return chunks.length;
  }

  /**
   * 相似度搜索
   * @param {string} query - 查询文本
   * @param {number} topK - 返回最相关的K个结果
   * @param {object} filters - 过滤条件 { chapterId, timeRange, etc. }
   */
  async search(query, topK = 5, filters = {}) {
    if (this.vectors.length === 0) {
      return [];
    }

    const queryVector = textToVector(query, this.dimension);
    
    // 计算相似度
    const scores = this.vectors.map((vector, index) => ({
      index,
      score: cosineSimilarity(queryVector, vector),
      chunk: this.chunks[index]
    }));

    // 过滤
    let filtered = scores;
    if (filters.chapterId) {
      filtered = filtered.filter(s => s.chunk.metadata.chapterId === filters.chapterId);
    }
    if (filters.excludeChapterId) {
      filtered = filtered.filter(s => s.chunk.metadata.chapterId !== filters.excludeChapterId);
    }

    // 排序并返回TopK
    return filtered
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(s => ({
        score: s.score,
        content: s.chunk.content,
        metadata: s.chunk.metadata
      }));
  }

  /**
   * 混合搜索：结合关键词和向量相似度
   */
  async hybridSearch(query, keywords = [], topK = 5) {
    const vectorResults = await this.search(query, topK * 2);
    
    // 关键词匹配加分
    const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
    const scored = vectorResults.map(result => {
      let keywordScore = 0;
      const content = result.content.toLowerCase();
      keywordSet.forEach(kw => {
        if (content.includes(kw)) keywordScore += 0.1;
      });
      return {
        ...result,
        score: result.score + keywordScore
      };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * 获取指定章节的所有块
   */
  async getChapterChunks(chapterId) {
    return this.chunks
      .filter(c => c.metadata.chapterId === chapterId)
      .map(c => c.content);
  }

  /**
   * 删除章节索引
   */
  async deleteChapter(chapterId) {
    const indicesToRemove = [];
    this.chunks.forEach((chunk, index) => {
      if (chunk.metadata.chapterId === chapterId) {
        indicesToRemove.push(index);
      }
    });

    // 从后往前删除，避免索引变化
    for (let i = indicesToRemove.length - 1; i >= 0; i--) {
      this.vectors.splice(indicesToRemove[i], 1);
      this.chunks.splice(indicesToRemove[i], 1);
    }

    await this.save();
    return indicesToRemove.length;
  }

  /**
   * 获取索引统计
   */
  getStats() {
    const chapterCount = new Set(this.chunks.map(c => c.metadata.chapterId)).size;
    return {
      totalVectors: this.vectors.length,
      totalChunks: this.chunks.length,
      chapterCount,
      dimension: this.dimension
    };
  }
}

/**
 * 智能上下文检索器
 * 根据当前写作内容，自动检索相关历史信息
 */
export class SmartContextRetriever {
  constructor(project) {
    this.project = project;
    this.vectorIndex = new VectorIndex(project.id);
  }

  /**
   * 加载索引
   */
  async load() {
    await this.vectorIndex.load();
    return this;
  }

  /**
   * 为当前写作检索相关上下文
   * @param {string} currentText - 当前已写的内容
   * @param {string} chapterId - 当前章节ID
   * @param {object} options - 检索选项
   */
  async retrieveForWriting(currentText, chapterId, options = {}) {
    const {
      maxChunks = 10,           // 最多检索多少块
      recencyWeight = 0.3,      // 近期章节的权重加成
      characterBoost = true,    // 是否提升角色相关内容
      clueBoost = true,         // 是否提升线索相关内容
    } = options;

    const results = [];

    // 1. 基于当前内容的向量检索
    const semanticResults = await this.vectorIndex.search(
      currentText,
      maxChunks * 2,
      { excludeChapterId: chapterId }
    );

    // 2. 提取关键词进行混合搜索
    const keywords = this.extractKeywords(currentText);
    if (keywords.length > 0) {
      const keywordResults = await this.vectorIndex.hybridSearch(
        currentText,
        keywords,
        maxChunks
      );
      results.push(...keywordResults);
    }

    // 3. 去重并排序
    const seen = new Set();
    const unique = [];
    for (const r of [...results, ...semanticResults]) {
      const key = `${r.metadata.chapterId}_${r.content.slice(0, 50)}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(r);
      }
    }

    // 4. 应用权重调整
    const scored = unique.map(result => {
      let score = result.score;

      // 近期章节加成
      const chapterNum = result.metadata.chapterNumber || 0;
      const currentNum = this.project.chapters.find(c => c.id === chapterId)?.number || 999;
      const distance = currentNum - chapterNum;
      if (distance > 0 && distance < 20) {
        score += recencyWeight * (1 - distance / 20);
      }

      // 角色相关内容加成
      if (characterBoost && result.metadata.characters) {
        const currentChars = this.extractCharacterNames(currentText);
        const overlap = result.metadata.characters.filter(c => currentChars.includes(c));
        score += overlap.length * 0.15;
      }

      return { ...result, score };
    });

    // 5. 返回最终结果
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxChunks);
  }

  /**
   * 提取关键词
   */
  extractKeywords(text) {
    // 简单的关键词提取：名词、专有名词
    const words = text.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
    const freq = {};
    words.forEach(w => {
      freq[w] = (freq[w] || 0) + 1;
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([w]) => w);
  }

  /**
   * 提取角色名
   */
  extractCharacterNames(text) {
    // 基于项目角色列表匹配
    if (!this.project.characters) return [];
    return this.project.characters
      .map(c => c.name)
      .filter(name => text.includes(name));
  }

  /**
   * 构建RAG上下文
   */
  async buildRAGContext(currentText, chapterId, options = {}) {
    const results = await this.retrieveForWriting(currentText, chapterId, options);
    
    if (results.length === 0) {
      return '';
    }

    const ctx = [];
    ctx.push('【相关历史内容（基于当前内容智能检索）】\n');
    
    // 按章节分组
    const byChapter = {};
    results.forEach(r => {
      const cid = r.metadata.chapterId;
      if (!byChapter[cid]) {
        byChapter[cid] = [];
      }
      byChapter[cid].push(r);
    });

    for (const [cid, chunks] of Object.entries(byChapter)) {
      const chapter = this.project.chapters.find(c => c.id === cid);
      const chapterTitle = chapter ? `第${chapter.number}章 ${chapter.title}` : '未知章节';
      
      ctx.push(`\n--- ${chapterTitle} ---`);
      for (const chunk of chunks) {
        ctx.push(chunk.content.slice(0, 300));
      }
    }

    ctx.push('\n【检索提示】以上是根据当前写作内容自动检索到的相关历史片段，请在续写时保持与这些内容的连贯性。\n');
    
    return ctx.join('\n');
  }
}

/**
 * 批量索引项目所有章节
 */
export async function indexProjectChapters(project, chapterContents = {}) {
  const index = new VectorIndex(project.id);
  await index.load();

  let totalChunks = 0;
  for (const chapter of project.chapters) {
    const content = chapterContents[chapter.id] || chapter.content || '';
    if (content.length > 50) {
      const chunks = await index.addDocument(chapter.id, content, {
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        characters: chapter.characterAppearances || [],
        keywords: chapter.keywords || []
      });
      totalChunks += chunks;
    }
  }

  return {
    totalChunks,
    stats: index.getStats()
  };
}
