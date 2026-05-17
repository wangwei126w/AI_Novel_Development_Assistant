/**
 * 简单测试超大小说API
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

  // 1. 登录获取token
  console.log('1. 测试登录获取token');
  const loginResult = await makeRequest('/api/auth/login', 'POST', {
    username: 'admin',
    password: 'admin123'
  });
  console.log(`   状态码: ${loginResult.status}`);
  
  let token = null;
  if (loginResult.status === 200) {
    const loginData = JSON.parse(loginResult.body);
    token = loginData.token;
    console.log(`   获取token成功\n`);
  } else {
    console.log(`   登录失败: ${loginResult.body}\n`);
    return;
  }

  // 2. 测试获取项目列表
  console.log('2. 测试获取普通项目列表');
  const projectsResult = await makeRequest('/api/projects', 'GET', null, token);
  console.log(`   状态码: ${projectsResult.status}`);
  if (projectsResult.status === 200) {
    const projects = JSON.parse(projectsResult.body);
    console.log(`   项目数量: ${projects.length}`);
  }
  console.log();

  // 3. 测试创建超大项目
  console.log('3. 测试创建超大项目');
  const createResult = await makeRequest('/api/mega/projects', 'POST', {
    title: '测试1000万字小说2',
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
  if (createResult.status === 200 || createResult.status === 201) {
    const project = JSON.parse(createResult.body);
    console.log(`   项目ID: ${project.project?.id || project.id}`);
    console.log(`   标题: ${project.project?.title || project.title}`);
    console.log(`   目标字数: ${project.project?.targetWordCount || project.targetWordCount}`);
  } else {
    console.log(`   响应: ${createResult.body.substring(0, 200)}`);
  }
  console.log();

  // 4. 测试获取超大项目
  console.log('4. 测试获取超大项目列表');
  const megaProjectsResult = await makeRequest('/api/mega/projects', 'GET', null, token);
  console.log(`   状态码: ${megaProjectsResult.status}`);
  if (megaProjectsResult.status === 200) {
    try {
      const megaProjects = JSON.parse(megaProjectsResult.body);
      console.log(`   超大项目数量: ${megaProjects.length || 'N/A'}`);
    } catch (e) {
      console.log(`   响应: ${megaProjectsResult.body.substring(0, 200)}`);
    }
  } else {
    console.log(`   响应: ${megaProjectsResult.body.substring(0, 200)}`);
  }

  console.log('\n=== 测试完成 ===');
}

runTests().catch(console.error);
