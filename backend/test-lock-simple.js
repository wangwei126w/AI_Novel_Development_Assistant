// 简单锁定功能测试
const BASE_URL = 'http://localhost:3001';

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

async function test() {
  console.log('=== 锁定功能测试 ===\n');
  
  // 1. 登录
  console.log('1. 登录 admin...');
  const login = await request('POST', '/api/auth/login', { 
    username: 'admin', password: 'admin123' 
  });
  
  if (login.status !== 200) {
    console.log('登录失败:', login.data?.error);
    return;
  }
  const token = login.data.token;
  console.log('✓ 登录成功\n');
  
  // 2. 获取项目列表
  console.log('2. 获取项目列表...');
  const projects = await request('GET', '/api/projects', null, token);
  
  if (projects.status !== 200 || !projects.data.length) {
    console.log('没有项目');
    return;
  }
  
  const project = projects.data[0];
  console.log(`✓ 找到项目: ${project.title} (ID: ${project.id})`);
  console.log(`  当前锁定状态: ${project.locked ? '已锁定' : '未锁定'}\n`);
  
  // 3. 如果未锁定，先锁定
  if (!project.locked) {
    console.log('3. 锁定项目...');
    const lock = await request('PUT', `/api/projects/${project.id}`, { locked: true }, token);
    if (lock.status === 200) {
      console.log('✓ 项目已锁定\n');
    } else {
      console.log('✗ 锁定失败:', lock.data?.error, '\n');
    }
  }
  
  // 4. 尝试删除锁定的项目
  console.log('4. 尝试删除锁定的项目...');
  const del = await request('DELETE', `/api/projects/${project.id}`, null, token);
  
  if (del.status === 403) {
    console.log('✓ 正确阻止删除，返回403:', del.data?.error, '\n');
  } else if (del.status === 200) {
    console.log('✗ 错误：锁定的项目被删除了！\n');
  } else {
    console.log('? 意外状态码:', del.status, del.data?.error, '\n');
  }
  
  // 5. 解锁项目
  console.log('5. 解锁项目...');
  const unlock = await request('PUT', `/api/projects/${project.id}`, { locked: false }, token);
  if (unlock.status === 200) {
    console.log('✓ 项目已解锁\n');
  } else {
    console.log('✗ 解锁失败:', unlock.data?.error, '\n');
  }
  
  console.log('=== 测试完成 ===');
}

test().catch(console.error);
