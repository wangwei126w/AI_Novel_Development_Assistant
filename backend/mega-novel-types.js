/**
 * 超长篇小说的数据类型定义
 * 支持1000万字级别的长篇小说
 */

// ==================== 多级结构定义 ====================

/**
 * 部（最高层级）- 1000万字可分为5-10部
 */
export interface Part {
  id: string;
  number: number;        // 部序号
  title: string;         // 部标题
  summary: string;       // 部概要（500-1000字）
  shortSummary: string;  // 简短摘要（100字，用于AI上下文）
  volumeIds: string[];   // 包含的卷ID列表
  wordCount: number;     // 本部字数
  createdAt: number;
  updatedAt: number;
  keywords: string[];    // 本部关键词
  timeline?: string;     // 时间线定位
}

/**
 * 卷（第二层级）- 每部含3-10卷
 */
export interface Volume {
  id: string;
  number: number;        // 卷序号（全局）
  partId: string;        // 所属部ID
  partNumber: number;    // 所属部序号
  title: string;         // 卷标题
  summary: string;       // 卷概要（300-500字）
  shortSummary: string;  // 简短摘要（80字，用于AI上下文）
  chapterIds: string[];  // 包含的章节ID列表
  wordCount: number;     // 本卷字数
  createdAt: number;
  updatedAt: number;
  keywords: string[];    // 本卷关键词
  plotPoints: string[];  // 本卷关键情节点
}

/**
 * 章（第三层级）- 每卷含20-50章
 */
export interface Chapter {
  id: string;
  number: number;        // 章序号（全局）
  volumeId: string;      // 所属卷ID
  volumeNumber: number;  // 所属卷序号
  partId: string;        // 所属部ID
  title: string;         // 章标题
  summary: string;       // 章摘要（150-200字）
  keywords: string[];    // 章关键词
  wordCount: number;     // 本章字数
  createdAt: number;
  updatedAt: number;
  locked?: boolean;      // 锁定状态
  
  // 内容存储路径（不直接存储内容）
  contentPath: string;   // 内容文件路径
  
  // 角色出场
  characterAppearances: string[];  // 出场的角色ID列表
  
  // 情节关联
  relatedPlotIds: string[];  // 关联的大纲节点ID
  
  // 标签系统
  tags: string[];
}

// ==================== 角色系统增强 ====================

/**
 * 角色详细信息
 */
export interface Character {
  id: string;
  name: string;              // 角色名
  aliases: string[];         // 别名/称号
  
  // 基础设定
  description: string;       // 角色简介（300字）
  appearance: string;        // 外貌描述（200字）
  personality: string;       // 性格特点（200字）
  background: string;        // 背景故事（500字）
  goals: string;             // 目标和动机（200字）
  
  // 能力/技能（修仙/玄幻等题材）
  abilities?: string[];      // 能力列表
  cultivation?: string;      // 修炼体系/等级
  items?: string[];          // 重要物品
  
  // 关系网络
  relationships: Relationship[];
  
  // 出场统计
  firstAppearance: number;   // 首次出场章节号
  lastAppearance: number;    // 最后出场章节号
  appearanceCount: number;   // 出场次数
  appearanceChapters: number[];  // 出场的章节号列表（最近50章）
  
  // 角色弧线
  characterArc: string;      // 角色成长弧线描述
  keyEvents: CharacterEvent[];  // 关键事件
  
  // 状态追踪
  status: 'active' | 'inactive' | 'dead' | 'missing';
  currentLocation?: string;  // 当前位置
  currentPower?: string;     // 当前实力/状态
  
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export interface Relationship {
  characterId: string;
  characterName: string;
  type: string;              // 关系类型：朋友、敌人、师徒、恋人等
  description: string;       // 关系描述
  status: 'active' | 'former' | 'secret' | 'hostile';
  startChapter?: number;     // 关系开始章节
  endChapter?: number;       // 关系结束章节
}

export interface CharacterEvent {
  chapterNumber: number;
  event: string;             // 事件描述
  impact: string;            // 对角色的影响
}

// ==================== 世界观增强 ====================

/**
 * 世界观设定
 */
export interface WorldSettings {
  // 基础设定
  background: string;        // 世界背景（2000字）
  rules: string;             // 世界规则（1500字）
  history: string;           // 历史沿革（1000字）
  
  // 地理设定
  geography: Geography[];    // 地理区域
  
  // 势力/组织
  factions: Faction[];       // 势力列表
  
  // 修炼/力量体系
  powerSystem?: PowerSystem; // 力量体系
  
  // 时间线
  timeline: TimelineEvent[];
  
  // 文化设定
  cultures: Culture[];       // 文化/种族
  
  // 重要物品
  importantItems: Item[];    // 重要物品/神器
}

export interface Geography {
  id: string;
  name: string;
  description: string;
  type: 'continent' | 'kingdom' | 'city' | 'dungeon' | 'other';
  parentId?: string;         // 上级区域
  importantLocations: string[];  // 重要地点
}

export interface Faction {
  id: string;
  name: string;
  description: string;
  type: string;              // 宗门、家族、帝国等
  leader?: string;           // 领袖
  members: string[];         // 成员角色ID
  allies: string[];          // 盟友势力ID
  enemies: string[];         // 敌对势力ID
}

export interface PowerSystem {
  name: string;
  description: string;
  levels: PowerLevel[];      // 等级体系
  rules: string;             // 修炼规则
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
  customs: string[];         // 习俗
  beliefs: string[];         // 信仰
}

export interface Item {
  id: string;
  name: string;
  description: string;
  owner?: string;            // 拥有者角色ID
  origin: string;            // 来历
  abilities: string[];       // 能力
}

// ==================== 情节大纲增强 ====================

/**
 * 情节大纲节点
 */
export interface PlotOutline {
  id: string;
  title: string;
  content: string;           // 大纲内容（500字）
  
  // 层级结构
  parentId?: string;         // 父节点ID（支持多级大纲）
  childrenIds: string[];     // 子节点ID
  level: number;             // 层级：0=主线，1=支线，2=细节
  
  // 范围
  partRange?: [number, number];      // 涉及的部范围
  volumeRange?: [number, number];    // 涉及的卷范围
  chapterRange?: [number, number];   // 涉及的章范围
  
  // 状态
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;          // 完成进度 0-100
  
  // 关联
  relatedCharacters: string[];   // 关联角色ID
  relatedFactions: string[];     // 关联势力ID
  
  // 伏笔
  foreshadowing?: string[];      // 埋下的伏笔
  payoff?: string[];             // 回收的伏笔
  
  createdAt: number;
  updatedAt: number;
}

// ==================== 项目元数据 ====================

/**
 * 超长篇小说项目
 */
export interface MegaProject {
  id: string;
  userId: string;
  title: string;
  summary: string;           // 全书概要（1000字）
  shortSummary: string;      // 简短摘要（200字）
  
  // 结构
  parts: Part[];             // 部列表
  volumes: Volume[];         // 卷列表
  chapters: ChapterMeta[];   // 章节元数据列表（不含内容）
  
  // 统计
  totalWordCount: number;    // 总字数
  totalChapters: number;     // 总章节数
  totalVolumes: number;      // 总卷数
  totalParts: number;        // 总部数
  
  // 设定
  characters: Character[];
  worldSettings: WorldSettings;
  plotOutlines: PlotOutline[];
  
  // 笔记
  notes: Note[];
  
  // 配置
  config: ProjectConfig;
  
  // 状态
  status: 'planning' | 'writing' | 'reviewing' | 'completed';
  locked: boolean;
  
  createdAt: number;
  updatedAt: number;
}

/**
 * 章节元数据（用于列表，不含内容）
 */
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

export interface ProjectConfig {
  targetWordCount: number;       // 目标字数
  targetChapters: number;        // 目标章节数
  avgChapterLength: number;      // 平均每章字数
  autoSummary: boolean;          // 自动生成摘要
  autoBackup: boolean;           // 自动备份
  backupInterval: number;        // 备份间隔（分钟）
  aiContextMode: 'standard' | 'deep' | 'minimal';  // AI上下文模式
}

// ==================== AI上下文层级 ====================

/**
 * 分层上下文结构
 */
export interface HierarchicalContext {
  // 第1层：全书级（始终包含）
  global: {
    projectSummary: string;
    worldBackground: string;
    worldRules: string;
    mainCharacters: string[];  // 主角团简介
  };
  
  // 第2层：部级（当前部）
  part: {
    partSummary: string;
    partPlot: string;
    keyCharacters: string[];
  };
  
  // 第3层：卷级（当前卷）
  volume: {
    volumeSummary: string;
    volumePlot: string;
    chapterSummaries: string[];  // 本卷已完成的章节摘要
  };
  
  // 第4层：章级（最近章节）
  recent: {
    previousChapters: string[];  // 最近5章摘要
    currentChapter: string;      // 当前章定位
  };
  
  // 第5层：线索追踪
  clues: {
    foreshadowing: string[];     // 未回收的伏笔
    characterTracks: string[];   // 角色追踪
    itemTracks: string[];        // 物品追踪
  };
}

// ==================== 索引和搜索 ====================

/**
 * 全文搜索索引
 */
export interface SearchIndex {
  chapterId: string;
  chapterNumber: number;
  title: string;
  summary: string;
  keywords: string[];
  characterIds: string[];
  wordCount: number;
}

/**
 * 角色索引
 */
export interface CharacterIndex {
  characterId: string;
  name: string;
  aliases: string[];
  firstAppearance: number;
  lastAppearance: number;
  appearanceCount: number;
  recentAppearances: number[];
}
