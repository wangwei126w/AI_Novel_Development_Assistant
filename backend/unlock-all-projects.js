// 解锁所有项目脚本
const fs = require('fs');
const path = require('path');

const PROJECTS_DIR = path.join(__dirname, 'data', 'projects');

async function unlockAllProjects() {
  console.log('=== 解锁所有项目 ===\n');
  
  const files = fs.readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const filePath = path.join(PROJECTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    try {
      const project = JSON.parse(content);
      
      if (project.locked === true) {
        project.locked = false;
        fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf-8');
        console.log(`✓ 已解锁: ${project.title} (${file})`);
      } else {
        console.log(`  未锁定: ${project.title || '未命名'} (${file})`);
      }
    } catch (e) {
      console.log(`✗ 错误: ${file} - ${e.message}`);
    }
  }
  
  console.log('\n=== 完成 ===');
}

unlockAllProjects().catch(console.error);
