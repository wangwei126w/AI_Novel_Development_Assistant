/**
 * 超长篇小说 API 客户端
 */

import { getAuthHeaders } from './useApi'
import type {
  MegaProject,
  Chapter,
  ChapterMeta,
  ChaptersPage,
  SearchResult,
  ProjectStats,
  BackupInfo,
  AIWriteRequest,
  AIWriteResponse,
  WriteMode,
  ContextDepth,
  Clue,
  CreateClueRequest,
  ResolveClueRequest,
  ClueStatus
} from '../types/mega-novel'

const API_BASE = '/api/mega'

/**
 * 创建超大项目
 */
export async function createMegaProject(data: {
  title: string
  summary: string
  targetWordCount?: number
  structure?: {
    parts?: any[]
    volumes?: any[]
  }
}): Promise<{ success: boolean; project: MegaProject }> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(data)
  })
  return res.json()
}

/**
 * 获取项目元数据
 */
export async function getMegaProject(projectId: string): Promise<MegaProject> {
  const res = await fetch(`${API_BASE}/projects/${projectId}`, {
    headers: getAuthHeaders()
  })
  return res.json()
}

/**
 * 更新项目结构
 */
export async function updateProjectStructure(
  projectId: string,
  data: { parts?: any[]; volumes?: any[] }
): Promise<{ success: boolean; project: MegaProject }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/structure`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(data)
  })
  return res.json()
}

// ==================== 章节 API ====================

/**
 * 分页获取章节列表
 */
export async function getChaptersPage(
  projectId: string,
  page: number = 1,
  pageSize: number = 50,
  volumeId?: string
): Promise<ChaptersPage> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString()
  })
  if (volumeId) params.append('volumeId', volumeId)

  const res = await fetch(`${API_BASE}/projects/${projectId}/chapters?${params}`, {
    headers: getAuthHeaders()
  })
  return res.json()
}

/**
 * 获取单个章节
 */
export async function getChapter(projectId: string, chapterId: string): Promise<Chapter> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/chapters/${chapterId}`, {
    headers: getAuthHeaders()
  })
  return res.json()
}

/**
 * 创建新章节
 */
export async function createChapter(
  projectId: string,
  data: {
    title: string
    volumeId: string
    partId: string
    number?: number
  }
): Promise<{ success: boolean; chapter: ChapterMeta }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/chapters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(data)
  })
  return res.json()
}

/**
 * 保存章节
 */
export async function saveChapter(
  projectId: string,
  chapterId: string,
  data: {
    title: string
    content: string
    summary?: string
    keywords?: string[]
    characterAppearances?: string[]
    locked?: boolean
  }
): Promise<{ success: boolean; chapter: ChapterMeta }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/chapters/${chapterId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(data)
  })
  return res.json()
}

// ==================== AI 写作 API ====================

/**
 * AI 续写
 */
export async function aiWriteMega(
  projectId: string,
  chapterId: string,
  mode: WriteMode = 'continue',
  options: {
    prompt?: string
    style?: string
    contextDepth?: ContextDepth
  } = {}
): Promise<AIWriteResponse> {
  const res = await fetch(`${API_BASE}/ai/write`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({
      projectId,
      chapterId,
      mode,
      ...options
    })
  })
  return res.json()
}

/**
 * 批量生成章节摘要
 */
export async function batchSummarize(
  projectId: string,
  chapterIds: string[]
): Promise<{
  results: Array<{
    chapterId: string
    success: boolean
    summary?: string
    keywords?: string[]
    reason?: string
    error?: string
  }>
}> {
  const res = await fetch(`${API_BASE}/ai/summarize-batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ projectId, chapterIds })
  })
  return res.json()
}

// ==================== 搜索 API ====================

/**
 * 全文搜索
 */
export async function searchProject(
  projectId: string,
  query: string,
  type: 'all' | 'chapter' | 'keyword' = 'all'
): Promise<{ results: SearchResult[]; total: number }> {
  const params = new URLSearchParams({ q: query, type })
  const res = await fetch(`${API_BASE}/projects/${projectId}/search?${params}`, {
    headers: getAuthHeaders()
  })
  return res.json()
}

/**
 * 获取角色出场记录
 */
export async function getCharacterAppearances(
  projectId: string,
  characterId: string
): Promise<{ appearances: ChapterMeta[] }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/characters/${characterId}/appearances`, {
    headers: getAuthHeaders()
  })
  return res.json()
}

// ==================== 备份 API ====================

/**
 * 创建备份
 */
export async function createBackup(projectId: string): Promise<{ success: boolean; backupPath: string }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/backup`, {
    method: 'POST',
    headers: getAuthHeaders()
  })
  return res.json()
}

/**
 * 列出备份
 */
export async function listBackups(projectId: string): Promise<{ backups: BackupInfo[] }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/backups`, {
    headers: getAuthHeaders()
  })
  return res.json()
}

/**
 * 恢复备份
 */
export async function restoreBackup(
  projectId: string,
  backupName: string
): Promise<{ success: boolean; project: MegaProject }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ backupName })
  })
  return res.json()
}

// ==================== 统计 API ====================

/**
 * 获取项目统计
 */
export async function getProjectStats(projectId: string): Promise<ProjectStats> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/stats`, {
    headers: getAuthHeaders()
  })
  return res.json()
}

// ==================== 线索/伏笔追踪 API ====================

/**
 * 获取项目的所有线索
 */
export async function getClues(
  projectId: string,
  filters?: { status?: ClueStatus; type?: string }
): Promise<Clue[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.type) params.append('type', filters.type)

  const res = await fetch(`${API_BASE}/projects/${projectId}/clues?${params}`, {
    headers: getAuthHeaders()
  })
  return res.json()
}

/**
 * 创建新线索（挖坑）
 */
export async function createClue(
  projectId: string,
  data: CreateClueRequest
): Promise<Clue> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/clues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(data)
  })
  return res.json()
}

/**
 * 解决线索（填坑）
 */
export async function resolveClue(
  projectId: string,
  clueId: string,
  data: ResolveClueRequest
): Promise<Clue> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/clues/${clueId}/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(data)
  })
  return res.json()
}

/**
 * 更新线索状态
 */
export async function updateClueStatus(
  projectId: string,
  clueId: string,
  status: ClueStatus
): Promise<Clue> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/clues/${clueId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ status })
  })
  return res.json()
}

/**
 * 获取需要提醒的线索
 */
export async function getClueReminders(
  projectId: string,
  currentChapter: number
): Promise<Clue[]> {
  const res = await fetch(
    `${API_BASE}/projects/${projectId}/clues/reminders?currentChapter=${currentChapter}`,
    { headers: getAuthHeaders() }
  )
  return res.json()
}

/**
 * 自动提取线索
 */
export async function autoExtractClues(
  projectId: string,
  chapterId: string
): Promise<{ success: boolean; extracted: number; clues: Clue[] }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/auto-extract-clues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ chapterId })
  })
  return res.json()
}

// ==================== 分段管理 API ====================

/**
 * 获取分段配置
 */
export async function getSegmentConfig(): Promise<{ config: any; message: string }> {
  const res = await fetch(`${API_BASE}/projects/segments/config`, {
    headers: getAuthHeaders()
  })
  return res.json()
}

/**
 * 获取项目分段状态
 */
export async function getSegments(projectId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/segments`, {
    headers: getAuthHeaders()
  })
  return res.json()
}

/**
 * 更新段摘要
 */
export async function updateSegmentSummary(
  projectId: string,
  segmentId: number,
  summary: string,
  keyEvents?: string[]
): Promise<{ success: boolean; segment: any }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/segments/${segmentId}/summary`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ summary, keyEvents })
  })
  return res.json()
}

/**
 * 获取段上下文
 */
export async function getSegmentContext(
  projectId: string,
  segmentId: number,
  includePrevious = true
): Promise<{ segmentId: number; context: string; contextLength: number }> {
  const res = await fetch(
    `${API_BASE}/projects/${projectId}/segments/${segmentId}/context?includePrevious=${includePrevious}`,
    { headers: getAuthHeaders() }
  )
  return res.json()
}

/**
 * 检查是否需要切换段
 */
export async function checkSegmentSwitch(
  projectId: string,
  chapterNumber: number
): Promise<{ needSwitch: boolean; fromSegment?: any; toSegment?: any; reason?: string }> {
  const res = await fetch(
    `${API_BASE}/projects/${projectId}/segments/check-switch?chapterNumber=${chapterNumber}`,
    { headers: getAuthHeaders() }
  )
  return res.json()
}

// ==================== RAG 向量检索 API ====================

export interface VectorSearchResult {
  score: number
  content: string
  metadata: {
    chapterId?: string
    chapterTitle?: string
    chapterNumber?: number
    chunkIndex?: number
    totalChunks?: number
    keywords?: string[]
  }
}

export interface IndexStats {
  totalVectors: number
  totalChunks: number
  chapterCount: number
  dimension: number
}

/**
 * 构建向量索引
 */
export async function buildIndex(
  projectId: string
): Promise<{ success: boolean; message: string; totalChunks: number; stats: IndexStats }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/index`, {
    method: 'POST',
    headers: getAuthHeaders()
  })
  return res.json()
}

/**
 * 向量搜索
 */
export async function searchVector(
  projectId: string,
  query: string,
  keywords: string[] = [],
  topK = 5
): Promise<{ query: string; results: VectorSearchResult[]; resultsCount: number }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/search-vector`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ query, keywords, topK })
  })
  return res.json()
}

/**
 * 获取索引统计
 */
export async function getIndexStats(projectId: string): Promise<IndexStats> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/index-stats`, {
    headers: getAuthHeaders()
  })
  return res.json()
}
