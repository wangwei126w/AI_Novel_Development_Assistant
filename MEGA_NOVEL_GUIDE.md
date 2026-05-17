# 1000万字超长篇小说支持方案

## 概述

本方案为支持 1000 万字级别的超长篇小说而设计，包含多级结构、分层上下文、高效存储和智能索引等核心功能。

## 核心特性

### 1. 五级结构体系

```
部 (Part) - 最高层级
├── 卷 (Volume) - 每部含3-10卷
│   ├── 章 (Chapter) - 每卷含20-50章
│   │   ├── 节 (可选)
│   │   └── 段落
```

**建议结构（1000万字）：**
- 5-10 部
- 每部 3-10 卷
- 每卷 20-50 章
- 每章 2000-5000 字

### 2. 分层上下文系统

AI 续写时自动构建 5 层上下文：

| 层级 | 内容 | 用途 |
|------|------|------|
| 第1层 - 全书级 | 全书概要、世界观、主角团、主线大纲 | 保持整体方向 |
| 第2层 - 部级 | 当前部概要、本部角色、本部情节 | 部内连贯性 |
| 第3层 - 卷级 | 当前卷概要、本卷已完成章节摘要 | 卷内连贯性 |
| 第4层 - 章级 | 最近10章、当前章定位 | 即时上下文 |
| 第5层 - 线索层 | 伏笔追踪、角色状态、物品追踪 | 细节一致性 |

### 3. 高效存储架构

**分块存储 (ChunkedStorage)**
- 章节内容按 100KB 分块存储
- 支持部分加载和流式读取
- 避免大文件内存占用

**索引系统 (ProjectIndex)**
- 章节元数据索引
- 关键词反向索引
- 角色出场记录索引
- 全文搜索支持

**元数据分离**
- 项目元数据（JSON）- 不含章节内容
- 章节内容（独立文件）
- 索引文件（快速查找）

### 4. 智能摘要层级

```
全书摘要 (1000字)
├── 部摘要 (500字)
│   ├── 卷摘要 (300字)
│   │   ├── 章摘要 (150字)
│   │   └── 章摘要
│   └── 卷摘要
└── 部摘要
```

## 文件结构

```
backend/
├── mega-novel-types.js      # 类型定义
├── mega-context-builder.js  # 分层上下文构建
├── mega-storage.js          # 存储管理
├── mega-routes.js           # API 路由
└── server.js                # 集成入口

frontend/src/
├── types/
│   └── mega-novel.ts        # TypeScript 类型
└── hooks/
    └── useMegaApi.ts        # API 客户端

data/
├── projects/                # 项目元数据
│   └── {projectId}.json
├── chapters/                # 章节内容（分块）
│   └── {projectId}/
│       └── {chapterId}/
│           ├── content.txt  # 或分块文件
│           └── meta.json
└── indexes/                 # 索引文件
    └── {projectId}.json
```

## 集成步骤

### 1. 后端集成

在 `server.js` 中添加：

```javascript
import { registerMegaNovelRoutes } from './mega-routes.js';

// ... 现有代码 ...

// 注册超大小说路由
registerMegaNovelRoutes(app, authMiddleware);
```

### 2. 前端集成

在需要使用的地方导入：

```typescript
import {
  createMegaProject,
  getMegaProject,
  getChaptersPage,
  getChapter,
  saveChapter,
  aiWriteMega,
  searchProject
} from './hooks/useMegaApi'

import type {
  MegaProject,
  Chapter,
  Part,
  Volume
} from './types/mega-novel'
```

## API 接口

### 项目管理

```
POST   /api/mega/projects              # 创建项目
GET    /api/mega/projects/:id          # 获取项目
PATCH  /api/mega/projects/:id/structure # 更新结构
GET    /api/mega/projects/:id/stats     # 项目统计
```

### 章节管理

```
GET    /api/mega/projects/:id/chapters              # 分页列表
GET    /api/mega/projects/:id/chapters/:chapterId   # 获取章节
POST   /api/mega/projects/:id/chapters              # 创建章节
PUT    /api/mega/projects/:id/chapters/:chapterId   # 保存章节
```

### AI 写作

```
POST   /api/mega/ai/write            # AI 续写
POST   /api/mega/ai/summarize-batch  # 批量生成摘要
```

### 搜索

```
GET    /api/mega/projects/:id/search?q=keyword&type=all
GET    /api/mega/projects/:id/characters/:id/appearances
```

### 备份

```
POST   /api/mega/projects/:id/backup         # 创建备份
GET    /api/mega/projects/:id/backups        # 列出备份
POST   /api/mega/projects/:id/restore        # 恢复备份
```

## 使用示例

### 创建 1000 万字项目

```typescript
const { project } = await createMegaProject({
  title: '我的修仙传',
  summary: '一个凡人逆天改命的修仙传奇...',
  targetWordCount: 10000000,
  structure: {
    parts: [
      { number: 1, title: '凡间篇', summary: '...' },
      { number: 2, title: '修真界篇', summary: '...' },
      { number: 3, title: '仙界篇', summary: '...' }
    ],
    volumes: [
      { number: 1, title: '初入修仙', partId: 'part_1', summary: '...' },
      { number: 2, title: '宗门大比', partId: 'part_1', summary: '...' }
    ]
  }
})
```

### AI 续写（深度上下文）

```typescript
const result = await aiWriteMega(
  projectId,
  chapterId,
  'continue',
  {
    prompt: '主角遇到神秘老者',
    style: '热血爽文风格，节奏紧凑',
    contextDepth: 'deep'  // 使用5层完整上下文
  }
)

console.log(result.content)  // AI 生成的续写内容
console.log(result.contextSize)  // 上下文大小
```

### 分页加载章节

```typescript
// 加载第1页，每页50章
const page1 = await getChaptersPage(projectId, 1, 50)

// 加载特定卷的所有章节
const volumeChapters = await getChaptersPage(projectId, 1, 1000, volumeId)
```

### 全文搜索

```typescript
const { results } = await searchProject(projectId, '神秘老者', 'all')
// 返回：章节、关键词匹配结果
```

## 性能优化

### 1. 分页加载
- 章节列表分页（默认50章/页）
- 避免一次性加载所有章节

### 2. 按需加载
- 只加载当前编辑的章节内容
- 其他章节只加载元数据

### 3. 索引加速
- 关键词反向索引
- 角色出场记录索引
- 全文搜索索引

### 4. 分块存储
- 大章节自动分块
- 支持部分读取
- 流式加载

## 数据规模估算

| 项目 | 数量 | 单条大小 | 总计 |
|------|------|----------|------|
| 章节 | 3000章 | 3KB(元数据) | 9MB |
| 内容 | 1000万字 | 20MB | 20MB |
| 角色 | 100个 | 2KB | 200KB |
| 索引 | - | - | 5MB |
| **总计** | - | - | **~35MB** |

## 注意事项

1. **AI 上下文限制**
   - 深度模式：约 15000 tokens
   - 快速模式：约 8000 tokens
   - 超长上下文会自动截断

2. **存储空间**
   - 1000万字约需 50-100MB 存储
   - 建议定期备份

3. **内存管理**
   - 避免同时加载大量章节
   - 使用分页和虚拟滚动

4. **网络传输**
   - 大章节分片传输
   - 支持断点续传

## 后续优化方向

1. **向量搜索** - 使用 embeddings 进行语义搜索
2. **智能召回** - 基于 RAG 的上下文召回
3. **协作编辑** - 多人实时协作
4. **版本对比** - 章节历史版本对比
5. **导出优化** - 分卷导出、EPUB生成
