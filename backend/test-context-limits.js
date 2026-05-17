/**
 * 测试上下文限制是否已加倍
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
  console.log('=== 测试上下文限制加倍 ===\n');

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

  // 3. 测试AI写作，检查上下文大小
  console.log('3. 测试AI写作上下文大小');
  const aiResult = await makeRequest('/api/ai/write', 'POST', {
    projectId: projectId,
    chapterId: null,
    mode: 'continue',
    useEnhancedContext: true,
    content: '测试上下文限制'
  }, token);
  
  if (aiResult.status === 200) {
    const aiResponse = JSON.parse(aiResult.body);
    console.log(`   ✅ AI写作成功`);
    console.log(`   内容长度: ${aiResponse.content?.length || 0} 字符`);
    console.log(`   上下文大小: ${aiResponse.contextSize || 'N/A'} 字符`);
    if (aiResponse.contextInfo) {
      console.log(`   上下文层级: ${aiResponse.contextInfo.levels?.join(', ') || 'N/A'}`);
      console.log(`   线索数量: ${aiResponse.contextInfo.clues || 0}`);
      console.log(`   提醒数量: ${aiResponse.contextInfo.reminders || 0}`);
    }
    
    // 验证上下文是否变大
    if (aiResponse.contextSize > 3000) {
      console.log(`   ✅ 上下文已增强（>3000字符）`);
    } else {
      console.log(`   ⚠️ 上下文较小（${aiResponse.contextSize}字符）`);
    }
  }
  console.log();

  // 4. 测试深度上下文
  console.log('4. 测试深度上下文模式');
  const deepResult = await makeRequest('/api/mega/ai/write', 'POST', {
    projectId: projectId,
    chapterId: null,
    mode: 'continue',
    content: '测试深度上下文',
    contextDepth: 'deep'
  }, token);
  
  if (deepResult.status === 200) {
    const deepResponse = JSON.parse(deepResult.body);
    console.log(`   ✅ 深度上下文成功`);
    console.log(`   内容长度: ${deepResponse.content?.length || 0} 字符`);
    console.log(`   上下文大小: ${deepResponse.contextSize || 'N/A'} 字符`);
  } else {
    console.log(`   ⚠️ 需要创建章节才能测试`);
  }
  console.log();

  // 5. 读取源码验证限制
  console.log('5. 验证源码中的限制配置');
  const fs = await import('fs/promises');
  const content = await fs.readFile('./mega-context-builder.js', 'utf-8');
  
  // 检查关键限制
  const checks = [
    { name: '核心角色', pattern: /characters\?\.slice\(0,\s*(\d+)\)/, expected: 10 },
    { name: '主线大纲', pattern: /slice\(0,\s*(\d+)\).*level === 0/, expected: 10 },
    { name: '本部角色', pattern: /partChars\.slice\(0,\s*(\d+)\)/, expected: 20 },
    { name: '本部情节', pattern: /partPlots.*slice\(0,\s*(\d+)\)/, expected: 10 },
    { name: '最近章节', pattern: /slice\(-(\d+)\)/, expected: 20 },
    { name: 'Token预算', pattern: /maxTokens\s*=\s*(\d+)/, expected: 20000 },
  ];
  
  for (const check of checks) {
    const match = content.match(check.pattern);
    if (match) {
      const value = parseInt(match[1]);
      const status = value >= check.expected ? '✅' : '❌';
      console.log(`   ${status} ${check.name}: ${value} (目标: >=${check.expected})`);
    } else {
      console.log(`   ⚠️ ${check.name}: 未找到配置`);
    }
  }

  console.log('\n=== 测试完成 ===');
}

runTests().catch(console.error);
