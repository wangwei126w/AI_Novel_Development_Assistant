/**
 * 测试超大小说API
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
  console.log('=== 测试超大小说API ===\n');

  // 1. 测试没有认证的情况
  console.log('1. 测试无认证访问 /api/mega/projects');
  const noAuthResult = await makeRequest('/api/mega/projects');
  console.log(`   状态码: ${noAuthResult.status}`);
  console.log(`   响应: ${noAuthResult.body.substring(0, 100)}...\n`);

  // 2. 测试登录获取token
  console.log('2. 测试登录获取token');
  const loginResult = await makeRequest('/api/auth/login', 'POST', {
    username: 'admin',
    password: 'admin123'
  });
  console.log(`   状态码: ${loginResult.status}`);
  
  let token = null;
  if (loginResult.status === 200) {
    try {
      const loginData = JSON.parse(loginResult.body);
      token = loginData.token;
      console.log(`   获取token成功: ${token.substring(0, 30)}...\n`);
    } catch (e) {
      console.log(`   登录响应: ${loginResult.body}\n`);
    }
  } else {
    console.log(`   登录失败: ${loginResult.body}\n`);
  }

  // 3. 测试带认证的超大项目API
  if (token) {
    console.log('3. 测试带认证访问 /api/mega/projects');
    const authResult = await makeRequest('/api/mega/projects', 'GET', null, token);
    console.log(`   状态码: ${authResult.status}`);
    console.log(`   响应: ${authResult.body.substring(0, 200)}...\n`);

    // 4. 测试创建超大项目
    console.log('4. 测试创建超大项目');
    const createResult = await makeRequest('/api/mega/projects', 'POST', {
      title: '测试1000万字小说',
      summary: '这是一个测试用的超大型小说项目',
      targetWordCount: 10000000,
      structure: {
        parts: [
          { id: 'part1', name: '第一卷：起源', summary: '故事的开端' },
          { id: 'part2', name: '第二卷：成长', summary: '主角的成长历程' }
        ],
        volumes: [
          { id: 'vol1', name: '第一册', partId: 'part1', chapterRange: [1, 100] },
          { id: 'vol2', name: '第二册', partId: 'part1', chapterRange: [101, 200] }
        ]
      }
    }, token);
    console.log(`   状态码: ${createResult.status}`);
    console.log(`   响应: ${createResult.body}\n`);

    // 5. 测试普通AI写作接口（验证增强功能）
    console.log('5. 测试普通AI写作接口');
    // 先获取现有项目ID
    const projectsResult = await makeRequest('/api/projects', 'GET', null, token);
    if (projectsResult.status === 200) {
      try {
        const projects = JSON.parse(projectsResult.body);
        if (projects.length > 0) {
          const projectId = projects[0].id;
          console.log(`   使用项目ID: ${projectId}`);
          
          // 测试AI写作
          const aiResult = await makeRequest('/api/ai/write', 'POST', {
            projectId: projectId,
            chapterId: projects[0].chapters?.[0]?.id,
            mode: 'continue',
            useEnhancedContext: true
          }, token);
          console.log(`   AI写作状态码: ${aiResult.status}`);
          console.log(`   响应: ${aiResult.body.substring(0, 300)}...`);
        }
      } catch (e) {
        console.log(`   解析项目列表失败: ${e.message}`);
      }
    }
  }

  console.log('\n=== 测试完成 ===');
}

runTests().catch(console.error);
