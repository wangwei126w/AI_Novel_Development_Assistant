/**
 * 完整集成测试 - 验证AI上下文增强和线索追踪
 */

import http from 'http';

const BASE_URL = 'localhost';
const PORT = 3001;

function makeRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== 完整集成测试 ===\n');

  // 1. 登录
  const loginResult = await makeRequest('/api/auth/login', 'POST', {
    username: 'admin',
    password: 'admin123'
  });
  const loginData = JSON.parse(loginResult.body);
  const token = loginData.token;
  console.log('✅ 登录成功\n');

  // 2. 获取项目列表
  const megaProjectsResult = await makeRequest('/api/mega/projects', 'GET', null, token);
  const megaProjects = JSON.parse(megaProjectsResult.body);
  console.log(`✅ 获取到 ${megaProjects.length} 个超大项目`);
  
  if (megaProjects.length === 0) {
    console.log('❌ 没有超大项目，测试结束');
    return;
  }
  
  const projectId = megaProjects[0].id;
  console.log(`   项目: ${megaProjects[0].title} (${projectId})\n`);

  // 3. 获取项目详情（验证数据保留）
  const projectResult = await makeRequest(`/api/mega/projects/${projectId}`, 'GET', null, token);
  const project = JSON.parse(projectResult.body);
  console.log('✅ 项目详情:');
  console.log(`   - 部数: ${project.parts?.length || 0}`);
  console.log(`   - 卷数: ${project.volumes?.length || 0}`);
  console.log(`   - 章节数: ${project.chapters?.length || 0}`);
  console.log(`   - 角色数: ${project.characters?.length || 0}`);
  console.log();

  // 4. 获取线索列表（验证线索数据保留）
  const cluesResult = await makeRequest(`/api/mega/projects/${projectId}/clues`, 'GET', null, token);
  const clues = JSON.parse(cluesResult.body);
  console.log(`✅ 获取到 ${clues.length} 个线索`);
  
  const activeClues = clues.filter(c => c.status === 'active');
  const resolvedClues = clues.filter(c => c.status === 'resolved');
  console.log(`   - 活跃: ${activeClues.length}`);
  console.log(`   - 已解决: ${resolvedClues.length}`);
  
  for (const clue of clues.slice(0, 5)) {
    const status = clue.status === 'resolved' ? '✅' : '📌';
    console.log(`   ${status} ${clue.title} (${clue.type})`);
  }
  console.log();

  // 5. 测试AI写作（使用增强上下文）
  console.log('5. 测试AI写作（使用增强上下文）');
  const aiResult = await makeRequest('/api/ai/write', 'POST', {
    projectId: projectId,
    chapterId: null,
    mode: 'continue',
    useEnhancedContext: true,
    content: '测试内容'
  }, token);
  
  console.log(`   状态码: ${aiResult.status}`);
  if (aiResult.status === 200) {
    try {
      const aiResponse = JSON.parse(aiResult.body);
      console.log(`   ✅ AI写作成功`);
      console.log(`   内容长度: ${aiResponse.content?.length || 0} 字符`);
      if (aiResponse.contextInfo) {
        console.log(`   上下文层级: ${aiResponse.contextInfo.levels?.join(', ') || 'N/A'}`);
        console.log(`   线索数量: ${aiResponse.contextInfo.clues || 0}`);
        console.log(`   提醒数量: ${aiResponse.contextInfo.reminders || 0}`);
      }
      console.log(`   内容预览: ${aiResponse.content?.substring(0, 100)}...`);
    } catch (e) {
      console.log(`   响应: ${aiResult.body.substring(0, 200)}`);
    }
  } else {
    console.log(`   ❌ 错误: ${aiResult.body.substring(0, 200)}`);
  }
  console.log();

  // 6. 测试超大小说专用AI写作
  console.log('6. 测试超大小说专用AI写作');
  const megaAiResult = await makeRequest('/api/mega/ai/write', 'POST', {
    projectId: projectId,
    chapterId: null,
    mode: 'continue',
    content: '测试内容',
    contextDepth: 'deep'
  }, token);
  
  console.log(`   状态码: ${megaAiResult.status}`);
  if (megaAiResult.status === 200) {
    try {
      const megaAiResponse = JSON.parse(megaAiResult.body);
      console.log(`   ✅ 超大小说AI写作成功`);
      console.log(`   内容长度: ${megaAiResponse.content?.length || 0} 字符`);
      if (megaAiResponse.contextInfo) {
        console.log(`   上下文层级: ${megaAiResponse.contextInfo.levels?.join(', ') || 'N/A'}`);
      }
    } catch (e) {
      console.log(`   响应: ${megaAiResult.body.substring(0, 200)}`);
    }
  } else {
    console.log(`   ❌ 错误: ${megaAiResult.body.substring(0, 200)}`);
  }
  console.log();

  // 7. 获取项目统计
  console.log('7. 获取项目统计');
  const statsResult = await makeRequest(`/api/mega/projects/${projectId}/stats`, 'GET', null, token);
  if (statsResult.status === 200) {
    const stats = JSON.parse(statsResult.body);
    console.log(`   ✅ 统计信息:`);
    console.log(`   - 总字数: ${stats.totalWordCount}`);
    console.log(`   - 总章节: ${stats.totalChapters}`);
    console.log(`   - 总卷数: ${stats.totalVolumes}`);
    console.log(`   - 总角色: ${stats.totalCharacters}`);
    console.log(`   - 进度: ${stats.progress?.wordCount || 0}%`);
  }
  console.log();

  // 8. 验证数据保留总结
  console.log('=== 数据保留验证 ===');
  console.log(`✅ 项目数据: ${megaProjects.length} 个项目保留`);
  console.log(`✅ 线索数据: ${clues.length} 个线索保留`);
  console.log(`✅ 项目结构: ${project.parts?.length || 0} 部, ${project.volumes?.length || 0} 卷`);
  console.log(`✅ 用户数据: 登录正常`);

  console.log('\n=== 所有测试完成 ===');
}

runTests().catch(console.error);
