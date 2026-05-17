// 测试RAG样式是否正确
const fs = require('fs');
const path = require('path');

// 检查ProjectPage.tsx中的RAG按钮样式
const projectPagePath = path.join(__dirname, 'frontend/src/pages/ProjectPage.tsx');
const projectPageContent = fs.readFileSync(projectPagePath, 'utf-8');

console.log('=== 测试RAG按钮样式 ===\n');

// 查找RAG按钮
const ragButtonMatch = projectPageContent.match(/\{\/\* RAG向量检索 \*\/\}[\s\S]*?<button[\s\S]*?<\/button>/);
if (ragButtonMatch) {
  const ragButton = ragButtonMatch[0];
  console.log('找到RAG按钮代码:');
  console.log(ragButton);
  console.log('\n--- 样式检查 ---');
  
  // 检查是否有紫色样式
  const hasPurple = ragButton.includes('purple');
  const hasEmerald = ragButton.includes('emerald');
  
  console.log('包含 purple:', hasPurple ? '❌ 失败 - 还有紫色样式' : '✅ 通过');
  console.log('包含 emerald:', hasEmerald ? '✅ 通过 - 已改为绿色主题' : '❌ 失败 - 没有绿色样式');
} else {
  console.log('❌ 未找到RAG按钮');
}

console.log('\n=== 测试RAG搜索页面样式 ===\n');

// 检查RAGSearchPage.tsx
const ragPagePath = path.join(__dirname, 'frontend/src/pages/RAGSearchPage.tsx');
const ragPageContent = fs.readFileSync(ragPagePath, 'utf-8');

// 统计紫色和绿色样式数量
const purpleCount = (ragPageContent.match(/purple/g) || []).length;
const emeraldCount = (ragPageContent.match(/emerald/g) || []).length;
const blueCount = (ragPageContent.match(/blue-600/g) || []).length;

console.log('紫色样式 (purple) 出现次数:', purpleCount);
console.log('绿色样式 (emerald) 出现次数:', emeraldCount);
console.log('蓝色按钮 (blue-600) 出现次数:', blueCount);

if (purpleCount === 0 && emeraldCount > 0) {
  console.log('\n✅ RAG搜索页面样式正确 - 已改为绿色主题');
} else {
  console.log('\n❌ RAG搜索页面还有紫色样式，需要修复');
  
  // 显示包含purple的行
  const lines = ragPageContent.split('\n');
  console.log('\n包含 purple 的行:');
  lines.forEach((line, idx) => {
    if (line.includes('purple')) {
      console.log(`  行 ${idx + 1}: ${line.trim()}`);
    }
  });
}

console.log('\n=== 测试完成 ===');
