const API_BASE = 'http://localhost:3001/api';

async function request(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function login(username, password) {
  const res = await request('POST', '/auth/login', { username, password });
  if (res.status === 200 && res.data?.token) {
    console.log(`✅ 登录成功: ${username}\n`);
    return res.data.token;
  }
  console.log('❌ 登录失败:', res.data?.error);
  return null;
}

async function runTests() {
  console.log('=== 自动摘要功能测试 ===\n');
  
  const token = await login('admin', 'admin123');
  if (!token) return;
  
  // 获取项目
  const projectsRes = await request('GET', '/projects', null, token);
  if (projectsRes.status !== 200 || !projectsRes.data?.length) {
    console.log('❌ 没有项目可测试');
    return;
  }
  
  const project = projectsRes.data[0];
  console.log(`使用项目: ${project.title}`);
  console.log(`章节数: ${project.chapters?.length || 0}\n`);
  
  // 测试1: 检查章节摘要状态
  console.log('1. 检查章节摘要状态...');
  const detailRes = await request('GET', `/projects/${project.id}`, null, token);
  if (detailRes.status === 200) {
    const chapters = detailRes.data.chapters || [];
    let hasSummary = 0;
    let noSummary = 0;
    
    for (const ch of chapters) {
      if (ch.summary) {
        hasSummary++;
        console.log(`   ✅ 第${ch.number}章 ${ch.title}: 有摘要`);
        console.log(`      摘要: ${ch.summary.slice(0, 50)}...`);
        if (ch.keywords?.length > 0) {
          console.log(`      关键词: ${ch.keywords.join(', ')}`);
        }
      } else {
        noSummary++;
        console.log(`   ⚠️ 第${ch.number}章 ${ch.title}: 无摘要`);
      }
    }
    
    console.log(`\n   统计: ${hasSummary} 章有摘要, ${noSummary} 章无摘要\n`);
  }
  
  // 测试2: 测试AI写作上下文
  console.log('2. 测试AI写作上下文构建...');
  const chapter = detailRes.data.chapters[0];
  if (chapter) {
    const writeRes = await request('POST', '/ai/write', {
      projectId: project.id,
      chapterId: chapter.id,
      mode: 'continue',
      prompt: '续写一段情节，注意保持与上下文的连贯性'
    }, token);
    
    if (writeRes.status === 200 && writeRes.data?.content) {
      console.log(`✅ AI续写成功`);
      console.log(`   生成内容: ${writeRes.data.content.slice(0, 100)}...\n`);
    } else {
      console.log(`❌ AI续写失败:`, writeRes.data?.error || '未知错误\n');
    }
  }
  
  console.log('=== 测试完成 ===');
}

runTests().catch(console.error);
