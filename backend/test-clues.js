/**
 * 测试线索追踪系统
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
  console.log('=== 测试线索追踪系统 ===\n');

  // 1. 登录
  const loginResult = await makeRequest('/api/auth/login', 'POST', {
    username: 'admin',
    password: 'admin123'
  });
  const loginData = JSON.parse(loginResult.body);
  const token = loginData.token;
  console.log('1. 登录成功\n');

  // 2. 获取超大项目
  const megaProjectsResult = await makeRequest('/api/mega/projects', 'GET', null, token);
  const megaProjects = JSON.parse(megaProjectsResult.body);
  const projectId = megaProjects[0].id;
  console.log(`2. 使用项目: ${megaProjects[0].title} (${projectId})\n`);

  // 3. 创建线索（挖坑）
  console.log('3. 创建线索（挖坑）');
  const clue1 = await makeRequest(`/api/mega/projects/${projectId}/clues`, 'POST', {
    type: 'foreshadowing',
    title: '神秘黑袍人的身份',
    description: '第15章出现的神秘黑袍人给了主角一枚玉佩，暗示与主角身世有关',
    chapterId: 'ch_15',
    chapterNumber: 15,
    relatedCharacters: ['主角'],
    importance: 5,
    expectedResolveChapter: 100,
    remindBeforeChapter: 5
  }, token);
  console.log(`   状态码: ${clue1.status}`);
  if (clue1.status === 201) {
    const clue = JSON.parse(clue1.body);
    console.log(`   线索ID: ${clue.id}`);
    console.log(`   标题: ${clue.title}`);
    console.log(`   重要性: ${clue.importance}`);
  }
  console.log();

  // 4. 创建第二个线索
  console.log('4. 创建第二个线索');
  const clue2 = await makeRequest(`/api/mega/projects/${projectId}/clues`, 'POST', {
    type: 'mystery',
    title: '消失的秘境',
    description: '第20章提到上古秘境突然消失，可能与即将到来的大劫有关',
    chapterId: 'ch_20',
    chapterNumber: 20,
    importance: 4,
    expectedResolveChapter: 80,
    remindBeforeChapter: 3
  }, token);
  console.log(`   状态码: ${clue2.status}`);
  if (clue2.status === 201) {
    const clue = JSON.parse(clue2.body);
    console.log(`   线索ID: ${clue.id}`);
    console.log(`   标题: ${clue.title}`);
  }
  console.log();

  // 5. 获取所有线索
  console.log('5. 获取所有线索');
  const cluesResult = await makeRequest(`/api/mega/projects/${projectId}/clues`, 'GET', null, token);
  console.log(`   状态码: ${cluesResult.status}`);
  if (cluesResult.status === 200) {
    const clues = JSON.parse(cluesResult.body);
    console.log(`   线索总数: ${clues.length}`);
    for (const clue of clues) {
      console.log(`   - [${clue.type}] ${clue.title} (重要性:${clue.importance}, 状态:${clue.status})`);
    }
  }
  console.log();

  // 6. 获取提醒（模拟当前在第95章）
  console.log('6. 获取需要提醒的线索（当前第95章）');
  const remindersResult = await makeRequest(`/api/mega/projects/${projectId}/clues/reminders?currentChapter=95`, 'GET', null, token);
  console.log(`   状态码: ${remindersResult.status}`);
  if (remindersResult.status === 200) {
    const reminders = JSON.parse(remindersResult.body);
    console.log(`   需要提醒的线索: ${reminders.length}个`);
    for (const clue of reminders) {
      const chaptersUntil = clue.expectedResolveChapter - 95;
      console.log(`   - ⚠️ ${clue.title} (还剩${chaptersUntil}章需要解决)`);
    }
  }
  console.log();

  // 7. 解决线索（填坑）
  console.log('7. 解决线索（填坑）');
  const clues = JSON.parse((await makeRequest(`/api/mega/projects/${projectId}/clues`, 'GET', null, token)).body);
  if (clues.length > 0) {
    const resolveResult = await makeRequest(`/api/mega/projects/${projectId}/clues/${clues[0].id}/resolve`, 'POST', {
      chapterId: 'ch_100',
      chapterNumber: 100,
      resolution: '神秘黑袍人是主角的亲生父亲，当年为了保护家族不得不隐姓埋名'
    }, token);
    console.log(`   状态码: ${resolveResult.status}`);
    if (resolveResult.status === 200) {
      const resolved = JSON.parse(resolveResult.body);
      console.log(`   线索 "${resolved.title}" 已解决`);
      console.log(`   解决方式: ${resolved.resolution}`);
    }
  }
  console.log();

  // 8. 再次获取所有线索
  console.log('8. 再次获取所有线索（查看状态变化）');
  const finalCluesResult = await makeRequest(`/api/mega/projects/${projectId}/clues`, 'GET', null, token);
  if (finalCluesResult.status === 200) {
    const finalClues = JSON.parse(finalCluesResult.body);
    const active = finalClues.filter(c => c.status === 'active');
    const resolved = finalClues.filter(c => c.status === 'resolved');
    console.log(`   活跃线索: ${active.length}个`);
    console.log(`   已解决: ${resolved.length}个`);
    for (const clue of finalClues) {
      const status = clue.status === 'resolved' ? '✅' : '📌';
      console.log(`   ${status} [${clue.type}] ${clue.title}`);
    }
  }

  console.log('\n=== 测试完成 ===');
}

runTests().catch(console.error);
