import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, 'data');
const PROJECTS_DIR = join(DATA_DIR, 'projects');
const CHAPTERS_DIR = join(DATA_DIR, 'chapters');

// 模拟加载章节内容
async function loadChapterContent(projectId, chapterId) {
  try {
    return await fs.readFile(join(CHAPTERS_DIR, projectId, `${chapterId}.txt`), 'utf-8');
  } catch { return ''; }
}

async function testSearch() {
  const projectId = 'mp6mz87j';
  const keyword = '这是一段';

  console.log('=== 测试搜索功能 ===');
  console.log('项目ID:', projectId);
  console.log('关键词:', keyword);

  // 加载项目
  const projectContent = await fs.readFile(join(PROJECTS_DIR, `${projectId}.json`), 'utf-8');
  const project = JSON.parse(projectContent);

  console.log('\n项目章节数:', project.chapters?.length || 0);

  const chapters = project.chapters || [];
  const results = [];

  for (const chapter of chapters) {
    console.log(`\n检查章节: ${chapter.id} - ${chapter.title}`);
    const content = await loadChapterContent(projectId, chapter.id);
    console.log('内容长度:', content.length);
    console.log('内容前50字:', content.slice(0, 50));

    const keywordLower = keyword.toLowerCase();
    const titleMatch = chapter.title.toLowerCase().includes(keywordLower);
    const contentMatch = content.toLowerCase().includes(keywordLower);

    console.log('标题匹配:', titleMatch);
    console.log('内容匹配:', contentMatch);

    if (titleMatch || contentMatch) {
      const index = content.toLowerCase().indexOf(keywordLower);
      const snippet = index >= 0 ? content.slice(Math.max(0, index - 30), index + 100) : '';
      results.push({
        type: 'chapter',
        id: chapter.id,
        title: `第${chapter.number}章 ${chapter.title}`,
        snippet: snippet
      });
      console.log('✅ 匹配成功');
    }
  }

  console.log('\n=== 搜索结果 ===');
  console.log('找到结果数:', results.length);
  console.log('结果:', JSON.stringify(results, null, 2));
}

testSearch().catch(console.error);
