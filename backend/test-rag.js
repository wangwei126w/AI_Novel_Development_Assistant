/**
 * 测试RAG向量检索系统
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
  console.log('=== 测试RAG向量检索系统 ===\n');

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

  // 3. 构建向量索引
  console.log('3. 构建向量索引');
  const indexResult = await makeRequest(`/api/mega/projects/${projectId}/index`, 'POST', {}, token);
  console.log(`   状态码: ${indexResult.status}`);
  if (indexResult.status === 200) {
    const indexData = JSON.parse(indexResult.body);
    console.log(`   ✅ 索引构建完成`);
    console.log(`   总块数: ${indexData.totalChunks}`);
    console.log(`   章节数: ${indexData.stats?.chapterCount}`);
    console.log(`   向量数: ${indexData.stats?.totalVectors}`);
  }
  console.log();

  // 4. 获取索引统计
  console.log('4. 获取索引统计');
  const statsResult = await makeRequest(`/api/mega/projects/${projectId}/index-stats`, 'GET', null, token);
  if (statsResult.status === 200) {
    const stats = JSON.parse(statsResult.body);
    console.log(`   ✅ 索引统计:`);
    console.log(`   - 总向量: ${stats.totalVectors}`);
    console.log(`   - 总块数: ${stats.totalChunks}`);
    console.log(`   - 章节数: ${stats.chapterCount}`);
    console.log(`   - 维度: ${stats.dimension}`);
  }
  console.log();

  // 5. 向量搜索测试
  console.log('5. 向量搜索测试');
  const searchResult = await makeRequest(`/api/mega/projects/${projectId}/search-vector`, 'POST', {
    query: '黑袍人 玉佩 身份',
    keywords: ['黑袍人', '玉佩'],
    topK: 3
  }, token);
  
  if (searchResult.status === 200) {
    const searchData = JSON.parse(searchResult.body);
    console.log(`   ✅ 搜索完成`);
    console.log(`   查询: ${searchData.query}`);
    console.log(`   结果数: ${searchData.resultsCount}`);
    
    for (let i = 0; i < searchData.results.length; i++) {
      const r = searchData.results[i];
      console.log(`   [${i+1}] 相似度: ${(r.score * 100).toFixed(1)}%`);
      console.log(`       内容: ${r.content.substring(0, 100)}...`);
    }
  }
  console.log();

  // 6. 获取RAG上下文
  console.log('6. 获取RAG上下文');
  const ragResult = await makeRequest(`/api/mega/projects/${projectId}/rag-context`, 'POST', {
    chapterId: null,
    currentText: '林渊握紧了手中的玉佩，想起了那个神秘的黑袍人。'
  }, token);
  
  if (ragResult.status === 200) {
    const ragData = JSON.parse(ragResult.body);
    console.log(`   ✅ RAG上下文生成成功`);
    console.log(`   上下文长度: ${ragData.contextLength} 字符`);
    console.log(`   预估Token: ${ragData.estimatedTokens}`);
    console.log(`   内容预览:`);
    console.log(`   ${ragData.context.substring(0, 300)}...`);
  }
  console.log();

  // 7. 使用RAG进行AI写作
  console.log('7. 使用RAG进行AI写作');
  const ragWriteResult = await makeRequest('/api/mega/ai/write-rag', 'POST', {
    projectId: projectId,
    chapterId: null,
    mode: 'continue',
    content: '林渊握紧了手中的玉佩，想起了那个神秘的黑袍人。他到底是谁？为什么要给我这枚玉佩？',
    contextDepth: 'deep'
  }, token);
  
  if (ragWriteResult.status === 200) {
    const ragWriteData = JSON.parse(ragWriteResult.body);
    console.log(`   ✅ RAG AI写作成功`);
    console.log(`   内容长度: ${ragWriteData.content?.length || 0} 字符`);
    console.log(`   上下文长度: ${ragWriteData.contextLength} 字符`);
    console.log(`   内容预览:`);
    console.log(`   ${ragWriteData.content?.substring(0, 200)}...`);
  } else {
    console.log(`   ⚠️ 状态码: ${ragWriteResult.status}`);
    console.log(`   错误: ${ragWriteResult.body.substring(0, 200)}`);
  }

  console.log('\n=== RAG测试完成 ===');
}

runTests().catch(console.error);
