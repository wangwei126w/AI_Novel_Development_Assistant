/**
 * 测试AI分层上下文功能
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
  console.log('=== 测试AI分层上下文功能 ===\n');

  // 1. 登录获取token
  const loginResult = await makeRequest('/api/auth/login', 'POST', {
    username: 'admin',
    password: 'admin123'
  });
  const loginData = JSON.parse(loginResult.body);
  const token = loginData.token;
  console.log('1. 登录成功，获取token\n');

  // 2. 获取超大项目
  const megaProjectsResult = await makeRequest('/api/mega/projects', 'GET', null, token);
  const megaProjects = JSON.parse(megaProjectsResult.body);
  console.log(`2. 获取到 ${megaProjects.length} 个超大项目`);
  
  if (megaProjects.length > 0) {
    const projectId = megaProjects[0].id;
    console.log(`   使用项目: ${megaProjects[0].title} (${projectId})\n`);

    // 3. 获取项目详情
    const projectResult = await makeRequest(`/api/mega/projects/${projectId}`, 'GET', null, token);
    const project = JSON.parse(projectResult.body);
    console.log(`3. 项目详情:`);
    console.log(`   - 部数: ${project.parts?.length || 0}`);
    console.log(`   - 卷数: ${project.volumes?.length || 0}`);
    console.log(`   - 章节数: ${project.chapters?.length || 0}`);
    console.log(`   - 角色数: ${project.characters?.length || 0}`);
    console.log();

    // 4. 测试普通AI写作（小项目模式）
    console.log('4. 测试普通AI写作接口（使用增强上下文）');
    const aiResult = await makeRequest('/api/ai/write', 'POST', {
      projectId: projectId,
      chapterId: null,
      mode: 'continue',
      useEnhancedContext: true,
      content: '这是一个测试内容'
    }, token);
    console.log(`   状态码: ${aiResult.status}`);
    if (aiResult.status === 200) {
      try {
        const aiResponse = JSON.parse(aiResult.body);
        console.log(`   响应类型: ${aiResponse.type || 'unknown'}`);
        console.log(`   内容长度: ${aiResponse.content?.length || 0} 字符`);
        console.log(`   内容预览: ${aiResponse.content?.substring(0, 100)}...`);
      } catch (e) {
        console.log(`   响应: ${aiResult.body.substring(0, 200)}`);
      }
    } else {
      console.log(`   错误: ${aiResult.body.substring(0, 200)}`);
    }
    console.log();

    // 5. 测试超大小说专用AI写作
    console.log('5. 测试超大小说专用AI写作接口');
    const megaAiResult = await makeRequest('/api/mega/ai/write', 'POST', {
      projectId: projectId,
      chapterId: null,
      mode: 'continue',
      content: '这是一个测试内容',
      contextDepth: 'deep'
    }, token);
    console.log(`   状态码: ${megaAiResult.status}`);
    if (megaAiResult.status === 200) {
      try {
        const megaAiResponse = JSON.parse(megaAiResult.body);
        console.log(`   响应类型: ${megaAiResponse.type || 'unknown'}`);
        console.log(`   内容长度: ${megaAiResponse.content?.length || 0} 字符`);
        console.log(`   上下文层级: ${megaAiResponse.contextInfo?.levels?.join(', ') || 'N/A'}`);
        console.log(`   内容预览: ${megaAiResponse.content?.substring(0, 100)}...`);
      } catch (e) {
        console.log(`   响应: ${megaAiResult.body.substring(0, 200)}`);
      }
    } else {
      console.log(`   错误: ${megaAiResult.body.substring(0, 200)}`);
    }
  }

  console.log('\n=== 测试完成 ===');
}

runTests().catch(console.error);
