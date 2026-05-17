/**
 * 超长篇小说类型定义
 * 支持1000万字级别的长篇小说
 */

// ==================== 多级结构定义 ====================

export interface Part {
  id: string;
  number: number;
  title: string;
  summary: string;
  shortSummary: string;
  volumeIds: string[];
  wordCount: number;
  createdAt: number;
  updatedAt: number;
  keywords: string[];
  timeline?: string;
}

export interface Volume {
  id: string;
  number: number;
  partId: string;
  partNumber: number;
  title: string;
  summary: string;
  shortSummary: string;
  chapterIds: string[];
  wordCount: number;
  createdAt: number;
  updatedAt: number;
  keywords: string[];
  plotPoints: string[];
}

export interface Chapter {
  id: string;
  number: number;
  volumeId: string;
  volumeNumber: number;
  partId: string;
  title: string;
  summary: string;
  keywords: string[];
  wordCount: number;
  createdAt: number;
  updatedAt: number;
  locked?: boolean;
  contentPath: string;
  characterAppearances: string[];
  relatedPlotIds: string[];
  tags: string[];
  content?: string; // 仅在前端加载时存在
}

export interface ChapterMeta {
  id: string;
  number: number;
  volumeId: string;
  partId: string;
  title: string;
  summary: string;
  keywords: string[];
  wordCount: number;
  locked?: boolean;
  contentPath: string;
}

// ==================== 角色系统 ====================

export interface Character {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  appearance: string;
  personality: string;
  background: string;
  goals: string;
  abilities?: string[];
  cultivation?: string;
  items?: string[];
  relationships: Relationship[];
  firstAppearance: number;
  lastAppearance: number;
  appearanceCount: number;
  appearanceChapters: number[];
  characterArc: string;
  keyEvents: CharacterEvent[];
  status: 'active' | 'inactive' | 'dead' | 'missing';
  currentLocation?: string;
  currentPower?: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export interface Relationship {
  characterId: string;
  characterName: string;
  type: string;
  description: string;
  status: 'active' | 'former' | 'secret' | 'hostile';
  startChapter?: number;
  endChapter?: number;
}

export interface CharacterEvent {
  chapterNumber: number;
  event: string;
  impact: string;
}

// ==================== 世界观 ====================

export interface WorldSettings {
  background: string;
  rules: string;
  history: string;
  geography: Geography[];
  factions: Faction[];
  powerSystem?: PowerSystem;
  timeline: TimelineEvent[];
  cultures: Culture[];
  importantItems: Item[];
}

export interface Geography {
  id: string;
  name: string;
  description: string;
  type: 'continent' | 'kingdom' | 'city' | 'dungeon' | 'other';
  parentId?: string;
  importantLocations: string[];
}

export interface Faction {
  id: string;
  name: string;
  description: string;
  type: string;
  leader?: string;
  members: string[];
  allies: string[];
  enemies: string[];
}

export interface PowerSystem {
  name: string;
  description: string;
  levels: PowerLevel[];
  rules: string;
}

export interface PowerLevel {
  name: string;
  number: number;
  description: string;
  requirements: string;
}

export interface Culture {
  id: string;
  name: string;
  description: string;
  customs: string[];
  beliefs: string[];
}

export interface Item {
  id: string;
  name: string;
  description: string;
  owner?: string;
  origin: string;
  abilities: string[];
}

export interface TimelineEvent {
  id: string;
  time: string;
  event: string;
  description?: string;
}

// ==================== 情节大纲 ====================

export interface PlotOutline {
  id: string;
  title: string;
  content: string;
  parentId?: string;
  childrenIds: string[];
  level: number;
  partRange?: [number, number];
  volumeRange?: [number, number];
  chapterRange?: [number, number];
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;
  relatedCharacters: string[];
  relatedFactions: string[];
  foreshadowing?: string[];
  payoff?: string[];
  createdAt: number;
  updatedAt: number;
}

// ==================== 笔记 ====================

export interface Note {
  id: string;
  title: string;
  content: string;
  category: 'idea' | 'setting' | 'character' | 'plot' | 'research' | 'other';
  relatedChapterIds?: string[];
  relatedCharacterIds?: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

// ==================== 项目 ====================

export interface MegaProject {
  id: string;
  userId: string;
  title: string;
  summary: string;
  shortSummary: string;
  parts: Part[];
  volumes: Volume[];
  chapters: ChapterMeta[];
  totalWordCount: number;
  totalChapters: number;
  totalVolumes: number;
  totalParts: number;
  characters: Character[];
  worldSettings: WorldSettings;
  plotOutlines: PlotOutline[];
  notes: Note[];
  config: ProjectConfig;
  status: 'planning' | 'writing' | 'reviewing' | 'completed';
  locked: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectConfig {
  targetWordCount: number;
  targetChapters: number;
  avgChapterLength: number;
  autoSummary: boolean;
  autoBackup: boolean;
  backupInterval: number;
  aiContextMode: 'standard' | 'deep' | 'minimal';
}

// ==================== API 响应类型 ====================

export interface ChaptersPage {
  chapters: ChapterMeta[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchResult {
  id: string;
  type: 'chapter' | 'keyword' | 'character';
  title: string;
  snippet?: string;
  score?: number;
  number?: number;
}

export interface ProjectStats {
  totalWordCount: number;
  totalChapters: number;
  totalVolumes: number;
  totalParts: number;
  totalCharacters: number;
  progress: {
    wordCount: number;
    chapters: number;
  };
  volumeStats: VolumeStat[];
  recentActivity: ActivityItem[];
}

export interface VolumeStat {
  id: string;
  title: string;
  chapterCount: number;
  wordCount: number;
}

export interface ActivityItem {
  chapterId: string;
  title: string;
  updatedAt: number;
}

export interface BackupInfo {
  name: string;
  time: number;
}

// ==================== AI 写作 ====================

export type WriteMode = 'continue' | 'rewrite' | 'dialogue' | 'outline' | 'custom';
export type ContextDepth = 'quick' | 'deep' | 'minimal';

export interface AIWriteRequest {
  projectId: string;
  chapterId: string;
  mode: WriteMode;
  prompt?: string;
  style?: string;
  contextDepth?: ContextDepth;
}

export interface AIWriteResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  contextSize?: number;
  contextInfo?: {
    levels: string[];
    clues?: number;
    reminders?: number;
  };
}

// ==================== 线索/伏笔追踪 ====================

export type ClueType = 'foreshadowing' | 'mystery' | 'quest' | 'relationship' | 'power' | 'item' | 'location' | 'timeline';
export type ClueStatus = 'active' | 'resolved' | 'dormant' | 'abandoned';

export interface Clue {
  id: string;
  type: ClueType;
  status: ClueStatus;
  title: string;
  description: string;
  chapterId: string;
  chapterNumber: number;
  createdAt: number;
  relatedCharacters: string[];
  relatedItems: string[];
  relatedLocations: string[];
  expectedResolveChapter?: number;
  expectedResolveVolume?: string;
  importance: number; // 1-5
  resolvedAt?: number;
  resolvedChapterId?: string;
  resolution?: string;
  mentions: ClueMention[];
  remindBeforeChapter: number;
}

export interface ClueMention {
  chapterId: string;
  chapterNumber: number;
  type: 'create' | 'mention' | 'resolve';
  context?: string;
  timestamp: number;
}

export interface CreateClueRequest {
  type?: ClueType;
  title: string;
  description: string;
  chapterId: string;
  chapterNumber: number;
  relatedCharacters?: string[];
  relatedItems?: string[];
  relatedLocations?: string[];
  expectedResolveChapter?: number;
  expectedResolveVolume?: string;
  importance?: number;
  remindBeforeChapter?: number;
}

export interface ResolveClueRequest {
  chapterId: string;
  chapterNumber: number;
  resolution: string;
}
