import { join } from 'path';
import fs from 'fs/promises';

// 章节独立存储管理
const CHAPTERS_DIR = join(process.cwd(), 'data', 'chapters');

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {}
}

await ensureDir(CHAPTERS_DIR);

/**
 * 保存章节内容到独立文件
 * 路径: data/chapters/{projectId}/{chapterId}.txt
 */
export async function saveChapterContent(projectId, chapterId, content) {
  const dir = join(CHAPTERS_DIR, projectId);
  await ensureDir(dir);
  const path = join(dir, `${chapterId}.txt`);
  await fs.writeFile(path, content, 'utf-8');
}

/**
 * 读取章节内容
 */
export async function loadChapterContent(projectId, chapterId) {
  try {
    const path = join(CHAPTERS_DIR, projectId, `${chapterId}.txt`);
    return await fs.readFile(path, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * 删除章节内容
 */
export async function deleteChapterContent(projectId, chapterId) {
  try {
    const path = join(CHAPTERS_DIR, projectId, `${chapterId}.txt`);
    await fs.unlink(path);
  } catch {}
}

/**
 * 删除项目的所有章节
 */
export async function deleteProjectChapters(projectId) {
  try {
    const dir = join(CHAPTERS_DIR, projectId);
    await fs.rm(dir, { recursive: true, force: true });
  } catch {}
}

/**
 * 将完整项目拆分为：项目元数据 + 章节独立存储
 * 返回精简后的项目对象（不含 chapter.content）
 */
export async function splitProject(project) {
  const slimProject = {
    ...project,
    chapters: project.chapters.map(ch => {
      const { content, ...meta } = ch;
      return meta;
    })
  };

  // 并行保存所有章节内容
  await Promise.all(
    project.chapters.map(ch =>
      saveChapterContent(project.id, ch.id, ch.content || '')
    )
  );

  return slimProject;
}

/**
 * 合并项目：元数据 + 章节内容
 */
export async function mergeProject(slimProject) {
  const chapters = await Promise.all(
    slimProject.chapters.map(async ch => {
      const content = await loadChapterContent(slimProject.id, ch.id);
      return { ...ch, content };
    })
  );

  return {
    ...slimProject,
    chapters
  };
}

/**
 * 只加载单个章节（用于编辑器）
 */
export async function loadSingleChapter(projectId, chapterId) {
  const content = await loadChapterContent(projectId, chapterId);
  return content;
}

/**
 * 只保存单个章节（用于自动保存）
 */
export async function saveSingleChapter(projectId, chapterId, content) {
  await saveChapterContent(projectId, chapterId, content);
}
