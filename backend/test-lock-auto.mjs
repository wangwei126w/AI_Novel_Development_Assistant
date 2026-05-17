// 自动测试锁定功能（使用内置 fetch）
const BASE_URL = 'http://localhost:3001';
let authToken = null;
let testProjectId = null;

async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  } catch (e) {
    return { status: -1, error: e.message };
  }
}

async function runTests() {
  console.log('=== 锁定功能自动测试 ===\n');
  
  // 1. 登录
  console.log('1. 登录 admin 用户...');
  const loginRes = await request('POST', '/api/auth/login', { 
    username: 'admin', 
    password: 'admin123' 
  });
  
  if (loginRes.status !== 200 || !loginRes.data?.token) {
    console.log('❌ 登录失败:', loginRes.data?.error || '未知错误');
    return;
  }
  authToken = loginRes.data.token;
  console.log('✅ 登录成功\n');
  
  // 2. 获取项目列表
  console.log('2. 获取项目列表...');
  const projectsRes = await request('GET', '/api/projects', null, authToken);
  
  if (projectsRes.status !== 200 || !Array.isArray(projectsRes.data)) {
    console.log('❌ 获取项目列表失败:', projectsRes.data?.error || '未知错误');
    return;
  }
  
  const projects = projectsRes.data;
  console.log(`✅ 获取到 ${projects.length} 个项目`);
  
  // 显示项目锁定状态
  projects.forEach(p => {
    console.log(`   - ${p.title}: locked=${p.locked} (类型: ${typeof p.locked})`);
  });
  console.log('');
  
  // 3. 找一个未锁定的项目测试
  const unlockedProject = projects.find(p => !p.locked);
  if (!unlockedProject) {
    console.log('❌ 没有找到未锁定的项目');
    return;
  }
  
  testProjectId = unlockedProject.id;
  console.log(`3. 测试项目: ${unlockedProject.title} (ID: ${testProjectId})`);
  console.log(`   当前锁定状态: ${unlockedProject.locked}\n`);
  
  // 4. 锁定项目
  console.log('4. 锁定项目...');
  const lockRes = await request('PUT', `/api/projects/${testProjectId}`, { locked: true }, authToken);
  if (lockRes.status === 200) {
    console.log('✅ 项目已锁定\n');
  } else {
    console.log('❌ 锁定失败:', lockRes.data?.error, '\n');
  }
  
  // 5. 验证项目已锁定
  console.log('5. 验证项目锁定状态...');
  const projectRes = await request('GET', `/api/projects/${testProjectId}`, null, authToken);
  if (projectRes.status === 200 && projectRes.data.locked === true) {
    console.log('✅ 项目确认已锁定\n');
  } else {
    console.log('❌ 项目锁定状态异常:', projectRes.data?.locked, '\n');
  }
  
  // 6. 尝试删除锁定的项目（应该失败）
  console.log('6. 测试删除锁定的项目...');
  const deleteRes = await request('DELETE', `/api/projects/${testProjectId}`, null, authToken);
  if (deleteRes.status === 403) {
    console.log('✅ 正确阻止删除，返回403:', deleteRes.data?.error, '\n');
  } else if (deleteRes.status === 200) {
    console.log('❌ 错误：锁定的项目被删除了！\n');
    return;
  } else {
    console.log('❌ 意外状态码:', deleteRes.status, deleteRes.data?.error, '\n');
  }
  
  // 7. 解锁项目
  console.log('7. 解锁项目...');
  const unlockRes = await request('PUT', `/api/projects/${testProjectId}`, { locked: false }, authToken);
  if (unlockRes.status === 200) {
    console.log('✅ 项目已解锁\n');
  } else {
    console.log('❌ 解锁失败:', unlockRes.data?.error, '\n');
  }
  
  // 8. 验证项目已解锁
  console.log('8. 验证项目解锁状态...');
  const projectRes2 = await request('GET', `/api/projects/${testProjectId}`, null, authToken);
  if (projectRes2.status === 200 && projectRes2.data.locked !== true) {
    console.log('✅ 项目确认已解锁\n');
  } else {
    console.log('❌ 项目解锁状态异常:', projectRes2.data?.locked, '\n');
  }
  
  console.log('=== 测试完成 ===');
}

runTests().catch(console.error);
