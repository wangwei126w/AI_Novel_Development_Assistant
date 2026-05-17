// 锁定功能测试脚本
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

// 辅助函数
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
  console.log(colors.blue('=== 锁定功能测试开始 ===\n'));
  
  // 1. 登录 admin 用户
  console.log(colors.yellow('1. 登录 admin 用户'));
  const loginRes = await request('POST', '/api/auth/login', { 
    username: 'admin', 
    password: 'admin123' 
  });
  
  if (loginRes.status === 200 && loginRes.data.token) {
    authToken = loginRes.data.token;
    logResult('Admin 登录', true);
  } else {
    logResult('Admin 登录失败', false, loginRes.data?.error);
    return;
  }
  
  // 2. 创建测试项目
  console.log('\n' + colors.yellow('2. 创建测试项目'));
  const createRes = await request('POST', '/api/projects', {
    title: '锁定功能测试项目',
    description: '用于测试锁定功能',
    genre: '测试',
    targetWordCount: 10000
  }, authToken);
  
  if (createRes.status === 201) {
    testProjectId = createRes.data.id;
    logResult('创建项目', true, `ID: ${testProjectId}`);
  } else {
    logResult('创建项目失败', false, createRes.data?.error);
    return;
  }
  
  // 3. 测试未锁定的项目可以删除
  console.log('\n' + colors.yellow('3. 测试未锁定项目可以删除'));
  const tempProjectRes = await request('POST', '/api/projects', {
    title: '临时测试项目',
    description: '用于删除测试',
    genre: '测试',
    targetWordCount: 1000
  }, authToken);
  
  if (tempProjectRes.status === 201) {
    const tempId = tempProjectRes.data.id;
    const deleteRes = await request('DELETE', `/api/projects/${tempId}`, null, authToken);
    if (deleteRes.status === 200) {
      logResult('删除未锁定项目', true);
    } else {
      logResult('删除未锁定项目', false, deleteRes.data?.error);
    }
  }
  
  // 4. 锁定项目
  console.log('\n' + colors.yellow('4. 锁定项目'));
  const lockRes = await request('PUT', `/api/projects/${testProjectId}`, {
    locked: true
  }, authToken);
  
  if (lockRes.status === 200) {
    logResult('锁定项目', true);
  } else {
    logResult('锁定项目', false, lockRes.data?.error);
  }
  
  // 5. 验证项目已锁定
  console.log('\n' + colors.yellow('5. 验证项目已锁定'));
  const getRes = await request('GET', `/api/projects/${testProjectId}`, null, authToken);
  if (getRes.status === 200 && getRes.data.locked === true) {
    logResult('验证项目锁定状态', true, `locked: ${getRes.data.locked}`);
  } else {
    logResult('验证项目锁定状态', false, `locked: ${getRes.data?.locked}`);
  }
  
  // 6. 测试锁定项目无法删除
  console.log('\n' + colors.yellow('6. 测试锁定项目无法删除'));
  const deleteLockedRes = await request('DELETE', `/api/projects/${testProjectId}`, null, authToken);
  if (deleteLockedRes.status === 403) {
    logResult('锁定项目删除被阻止', true, `返回403: ${deleteLockedRes.data?.error}`);
  } else {
    logResult('锁定项目删除被阻止', false, `期望403，实际: ${deleteLockedRes.status}`);
  }
  
  // 7. 解锁项目
  console.log('\n' + colors.yellow('7. 解锁项目'));
  const unlockRes = await request('PUT', `/api/projects/${testProjectId}`, {
    locked: false
  }, authToken);
  
  if (unlockRes.status === 200) {
    logResult('解锁项目', true);
  } else {
    logResult('解锁项目', false, unlockRes.data?.error);
  }
  
  // 8. 测试解锁后可以删除
  console.log('\n' + colors.yellow('8. 测试解锁后可以删除'));
  const deleteUnlockedRes = await request('DELETE', `/api/projects/${testProjectId}`, null, authToken);
  if (deleteUnlockedRes.status === 200) {
    logResult('删除已解锁项目', true);
  } else {
    logResult('删除已解锁项目', false, deleteUnlockedRes.data?.error);
  }
  
  console.log('\n' + colors.blue('=== 锁定功能测试完成 ==='));
}

// 运行测试
runTests().catch(console.error);
