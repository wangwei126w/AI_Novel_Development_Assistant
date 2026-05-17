// Admin 功能测试脚本
const BASE_URL = 'http://localhost:3001';

// 颜色输出
const colors = {
  green: (msg) => `\x1b[32m${msg}\x1b[0m`,
  red: (msg) => `\x1b[31m${msg}\x1b[0m`,
  yellow: (msg) => `\x1b[33m${msg}\x1b[0m`,
  blue: (msg) => `\x1b[34m${msg}\x1b[0m`
};

let authToken = null;
let testProjectId = null;
let testChapterId = null;

// 辅助函数
async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = {
    method,
    headers
  };
  
  if (body) options.body = JSON.stringify(body);
  
  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  } catch (e) {
    return { status: -1, error: e.message };
  }
}

function logResult(testName, success, details = '') {
  if (success) {
    console.log(colors.green(`✓ ${testName}`));
  } else {
    console.log(colors.red(`✗ ${testName}`));
    if (details) console.log(colors.red(`  错误: ${details}`));
  }
}

// 测试套件
async function runTests() {
  console.log(colors.blue('=== Admin 功能测试开始 ===\n'));
  
  // 1. 登录 admin 账号
  console.log(colors.yellow('1. 测试 Admin 登录'));
  const loginRes = await request('POST', '/api/auth/login', { 
    username: 'admin', 
    password: 'admin123' 
  });
  
  if (loginRes.status === 200 && loginRes.data.token) {
    authToken = loginRes.data.token;
    logResult('Admin 登录', true);
    console.log(`  用户名: ${loginRes.data.user.username}`);
    console.log(`  角色: ${loginRes.data.user.role}`);
  } else {
    logResult('Admin 登录', false, loginRes.data?.error || `状态码: ${loginRes.status}`);
    return;
  }
  
  // 2. 获取所有项目列表
  console.log('\n' + colors.yellow('2. 测试获取所有项目'));
  const projectsRes = await request('GET', '/api/projects', null, authToken);
  logResult('获取项目列表', projectsRes.status === 200);
  
  if (projectsRes.status === 200 && projectsRes.data.length > 0) {
    // 使用第一个项目作为测试项目
    testProjectId = projectsRes.data[0].id;
    console.log(`  找到 ${projectsRes.data.length} 个项目`);
    console.log(`  测试项目ID: ${testProjectId}`);
    console.log(`  项目所有者: ${projectsRes.data[0].userId}`);
  } else {
    console.log(colors.yellow('  没有找到项目，将创建新项目测试'));
  }
  
  // 3. 如果没有项目，创建新项目
  if (!testProjectId) {
    console.log('\n' + colors.yellow('3. 测试创建项目'));
    const createRes = await request('POST', '/api/projects', {
      title: 'Admin测试项目',
      description: '用于测试admin权限的项目',
      genre: '测试',
      targetWordCount: 10000
    }, authToken);
    
    if (createRes.status === 201) {
      testProjectId = createRes.data.id;
      logResult('创建项目', true);
      console.log(`  项目ID: ${testProjectId}`);
    } else {
      logResult('创建项目', false, createRes.data?.error);
    }
  }
  
  if (!testProjectId) {
    console.log(colors.red('\n无法获取或创建测试项目，测试中止'));
    return;
  }
  
  // 4. 获取项目详情
  console.log('\n' + colors.yellow('4. 测试获取项目详情'));
  const projectRes = await request('GET', `/api/projects/${testProjectId}`, null, authToken);
  logResult('获取项目详情', projectRes.status === 200);
  if (projectRes.status === 200) {
    console.log(`  项目标题: ${projectRes.data.title}`);
    console.log(`  章节数: ${projectRes.data.chapters?.length || 0}`);
  }
  
  // 5. 获取项目元数据
  console.log('\n' + colors.yellow('5. 测试获取项目元数据'));
  const metaRes = await request('GET', `/api/projects/${testProjectId}/meta`, null, authToken);
  logResult('获取项目元数据', metaRes.status === 200);
  
  // 6. 创建章节
  console.log('\n' + colors.yellow('6. 测试创建章节'));
  const chapterRes = await request('POST', `/api/projects/${testProjectId}/chapters`, {
    title: 'Admin测试章节',
    content: '这是admin创建的测试章节内容。'
  }, authToken);
  
  if (chapterRes.status === 201) {
    testChapterId = chapterRes.data.id;
    logResult('创建章节', true);
    console.log(`  章节ID: ${testChapterId}`);
  } else {
    logResult('创建章节', false, chapterRes.data?.error);
  }
  
  // 7. 获取章节详情
  if (testChapterId) {
    console.log('\n' + colors.yellow('7. 测试获取章节详情'));
    const chapterDetailRes = await request('GET', `/api/projects/${testProjectId}/chapters/${testChapterId}`, null, authToken);
    logResult('获取章节详情', chapterDetailRes.status === 200);
    if (chapterDetailRes.status === 200) {
      console.log(`  章节标题: ${chapterDetailRes.data.title}`);
    }
  }
  
  // 8. 更新项目
  console.log('\n' + colors.yellow('8. 测试更新项目'));
  const updateRes = await request('PUT', `/api/projects/${testProjectId}`, {
    title: 'Admin测试项目(已更新)',
    description: '更新后的描述'
  }, authToken);
  logResult('更新项目', updateRes.status === 200);
  
  // 9. 搜索功能
  console.log('\n' + colors.yellow('9. 测试搜索功能'));
  const searchRes = await request('GET', `/api/projects/${testProjectId}/search?q=测试`, null, authToken);
  logResult('搜索功能', searchRes.status === 200);
  if (searchRes.status === 200) {
    console.log(`  找到 ${searchRes.data.results?.length || 0} 个结果`);
  }
  
  // 10. 统计功能
  console.log('\n' + colors.yellow('10. 测试统计功能'));
  const statsRes = await request('GET', `/api/projects/${testProjectId}/stats`, null, authToken);
  logResult('统计功能', statsRes.status === 200);
  if (statsRes.status === 200) {
    console.log(`  总字数: ${statsRes.data.totalWords}`);
    console.log(`  章节数: ${statsRes.data.totalChapters}`);
  }
  
  // 11. AI 续写功能（可选，因为需要AI配置）
  console.log('\n' + colors.yellow('11. 测试AI续写功能'));
  const aiRes = await request('POST', '/api/ai/continue', {
    projectId: testProjectId,
    chapterId: testChapterId,
    mode: 'continue',
    prompt: '继续写下去'
  }, authToken);
  // AI功能可能因配置问题失败，所以只检查权限检查是否通过（不是403）
  if (aiRes.status !== 403) {
    logResult('AI续写权限检查', true, `状态码: ${aiRes.status}`);
  } else {
    logResult('AI续写权限检查', false, '返回403无权访问');
  }
  
  // 12. 检查角色一致性（可选）
  console.log('\n' + colors.yellow('12. 测试角色一致性检查'));
  const checkRes = await request('POST', '/api/ai/check-consistency', {
    projectId: testProjectId,
    content: '测试内容'
  }, authToken);
  if (checkRes.status !== 403) {
    logResult('角色一致性检查权限', true, `状态码: ${checkRes.status}`);
  } else {
    logResult('角色一致性检查权限', false, '返回403无权访问');
  }
  
  // 13. 删除章节
  if (testChapterId) {
    console.log('\n' + colors.yellow('13. 测试删除章节'));
    const deleteChapterRes = await request('DELETE', `/api/projects/${testProjectId}/chapters/${testChapterId}`, null, authToken);
    logResult('删除章节', deleteChapterRes.status === 200);
  }
  
  console.log('\n' + colors.blue('=== Admin 功能测试完成 ==='));
}

// 运行测试
runTests().catch(console.error);
