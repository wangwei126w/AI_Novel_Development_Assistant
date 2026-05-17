import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, 'data');
const PROJECTS_DIR = join(DATA_DIR, 'projects');
const CHAPTERS_DIR = join(DATA_DIR, 'chapters');

async function ensureDir(dir) {
  try { await fs.mkdir(dir, { recursive: true }); } catch (e) {}
}

async function saveChapterContent(projectId, chapterId, content) {
  const dir = join(CHAPTERS_DIR, projectId);
  await ensureDir(dir);
  await fs.writeFile(join(dir, `${chapterId}.txt`), content || '', 'utf-8');
  console.log(`Saved chapter ${chapterId} for project ${projectId}`);
}

async function loadChapterContent(projectId, chapterId) {
  try {
    return await fs.readFile(join(CHAPTERS_DIR, projectId, `${chapterId}.txt`), 'utf-8');
  } catch { 
    console.log(`Failed to load chapter ${chapterId}`);
    return ''; 
  }
}

async function test() {
  const projectId = 'test-project';
  const chapterId = 'test-chapter-' + Date.now().toString(36);
  
  console.log('Testing chapter save/load...');
  console.log('Project ID:', projectId);
  console.log('Chapter ID:', chapterId);
  
  // Test saving empty content
  await saveChapterContent(projectId, chapterId, '');
  
  // Test loading
  const content = await loadChapterContent(projectId, chapterId);
  console.log('Loaded content:', JSON.stringify(content));
  console.log('Content length:', content.length);
  
  // Test saving with content
  await saveChapterContent(projectId, chapterId, 'Hello World');
  const content2 = await loadChapterContent(projectId, chapterId);
  console.log('Loaded content after update:', JSON.stringify(content2));
}

test().catch(console.error);
