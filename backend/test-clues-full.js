/**
 * 测试完整的线索追踪流程
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
      options.headers['Authorization'] = `Bearer ${token}`;ssssssssssssssssssss
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
  console.log('=== 测试完整线索追踪流程 ===\n');

  // 1. 登录
  const loginResult = await makeRequest('/api/auth/login', 'POST', {
    username: 'admin',
    password: 'admin123'
  });
  const loginData = JSON.parse(loginResult.body);
  const token = loginData.token;
  console.log('✅ 登录成功\n');

  // 2. 获取项目
  const megaProjectsResult = await makeRequest('/api/mega/projects', 'GET', null, token);
  const megaProjects = JSON.parse(megaProjectsResult.body);
  const projectId = megaProjects[0].id;
  console.log(`✅ 使用项目: ${megaProjects[0].title}\n`);

  // 3. 创建新线索（挖坑）
  console.log('3. 创建新线索（挖坑）');
  const newClue = await makeRequest(`/api/mega/projects/${projectId}/clues`, 'POST', {
    type: 'foreshadowing',
    title: '上古神器的下落',
    description: '第50章提到上古神器"混沌珠"被封印在禁地深处，主角需要找到三把钥匙才能解封',
    chapterId: 'ch_50',
    chapterNumber: 50,
    importance: 5,
    expectedResolveChapter: 200,
    remindBeforeChapter: 5,
    relatedCharacters: ['主角']
  }, token);
  
  if (newClue.status === 201) {
    const clue = JSON.parse(newClue.body);
    console.log(`   ✅ 线索创建成功: ${clue.title}`);
    console.log(`   ID: ${clue.id}`);
    console.log(`   重要性: ${clue.importance}`);
    console.log(`   预计解决: 第${clue.expectedResolveChapter}章`);
  }
  console.log();

  // 4. 创建第二个线索
  console.log('4. 创建第二个线索');
  const newClue2 = await makeRequest(`/api/mega/projects/${projectId}/clues`, 'POST', {
    type: 'mystery',
    title: '师父的真实身份',
    description: '第30章暗示师父可能是千年前的魔道至尊转世',
    chapterId: 'ch_30',
    chapterNumber: 30,
    importance: 4,
    expectedResolveChapter: 150,
    remindBeforeChapter: 3
  }, token);
  
  if (newClue2.status === 201) {
    const clue = JSON.parse(newClue2.body);
    console.log(`   ✅ 线索创建成功: ${clue.title}`);
  }
  console.log();

  // 5. 获取所有线索
  console.log('5. 获取所有线索');
  const cluesResult = await makeRequest(`/api/mega/projects/${projectId}/clues`, 'GET', null, token);
  if (cluesResult.status === 200) {
    const clues = JSON.parse(cluesResult.body);
    console.log(`   ✅ 获取到 ${clues.length} 个线索`);
    clues.forEach((clue, i) => {
      console.log(`   [${i+1}] ${clue.title} (${clue.type}) - ${clue.status}`);
    });
  }
  console.log();

  // 6. 模拟写到第145章，获取提醒
  console.log('6. 模拟写到第145章，获取即将到期的提醒');
  const remindersResult = await makeRequest(`/api/mega/projects/${projectId}/clues/reminders?currentChapter=145`, 'GET', null, token);
  if (remindersResult.status === 200) {
    const reminders = JSON.parse(remindersResult.body);
    console.log(`   ✅ 需要提醒的线索: ${reminders.length}个`);
    reminders.forEach(clue => {
      const remain = clue.expectedResolveChapter - 145;
      console.log(`   ⚠️ ${clue.title} (还剩${remain}章需要解决)`);
    });
  }
  console.log();

  // 7. 模拟写到第195章，获取提醒
  console.log('7. 模拟写到第195章，获取即将到期的提醒');
  const reminders2Result = await makeRequest(`/api/mega/projects/${projectId}/clues/reminders?currentChapter=195`, 'GET', null, token);
  if (reminders2Result.status === 200) {
    const reminders = JSON.parse(reminders2Result.body);
    console.log(`   ✅ 需要提醒的线索: ${reminders.length}个`);
    reminders.forEach(clue => {
      const remain = clue.expectedResolveChapter - 195;
      console.log(`   ⚠️ ${clue.title} (还剩${remain}章需要解决)`);
    });
  }
  console.log();

  // 8. 解决线索（填坑）
  console.log('8. 解决线索（填坑）');
  const clues = JSON.parse((await makeRequest(`/api/mega/projects/${projectId}/clues`, 'GET', null, token)).body);
  const clueToResolve = clues.find(c => c.title === '师父的真实身份');
  
  if (clueToResolve) {
    const resolveResult = await makeRequest(`/api/mega/projects/${projectId}/clues/${clueToResolve.id}/resolve`, 'POST', {
      chapterId: 'ch_150',
      chapterNumber: 150,
      resolution: '师父确实是魔道至尊转世，但他已经放下执念，选择守护正道。他将毕生修为传给主角后消散于天地间。'
    }, token);
    
    if (resolveResult.status === 200) {
      const resolved = JSON.parse(resolveResult.body);
      console.log(`   ✅ 线索已解决: ${resolved.title}`);
      console.log(`   解决方式: ${resolved.resolution.substring(0, 50)}...`);
    }
  }
  console.log();

  // 9. 验证线索状态变化
  console.log('9. 验证线索状态');
  const finalCluesResult = await makeRequest(`/api/mega/projects/${projectId}/clues`, 'GET', null, token);
  if (finalCluesResult.status === 200) {
    const finalClues = JSON.parse(finalCluesResult.body);
    const active = finalClues.filter(c => c.status === 'active');
    const resolved = finalClues.filter(c => c.status === 'resolved');
    console.log(`   ✅ 活跃线索: ${active.length}个`);
    console.log(`   ✅ 已解决: ${resolved.length}个`);
    finalClues.forEach(clue => {
      const icon = clue.status === 'resolved' ? '✅' : '📌';
      console.log(`   ${icon} ${clue.title}`);
    });
  }

  console.log('\n=== 测试完成 ===');
  console.log('前端页面: http://localhost:3000/project/{id}/clues');
}

runTests().catch(console.error);
