const API_BASE = 'http://localhost:3001/api';

async function request(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function login(username, password) {
  const res = await request('POST', '/auth/login', { username, password });
  if (res.status === 200 && res.data?.token) {
    console.log(`✅ 登录成功: ${username}`);
    return res.data.token;
  }
  console.log('❌ 登录失败:', res.data?.error);
  return null;
}

async function runTests() {
  console.log('=== AI功能自动测试 ===\n');
  
  // 1. 登录
  const token = await login('admin', 'admin123');
  if (!token) return;
  
  // 2. 获取项目列表
  console.log('2. 获取项目列表...');
  const projectsRes = await request('GET', '/projects', null, token);
  if (projectsRes.status !== 200 || !projectsRes.data?.length) {
    console.log('❌ 没有项目可测试');
    return;
  }
  
  const testProject = projectsRes.data[0];
  console.log(`✅ 使用项目: ${testProject.title} (ID: ${testProject.id})`);
  console.log(`   - 项目包含 volumes 字段: ${testProject.volumes !== undefined}`);
  console.log(`   - volumes 类型: ${Array.isArray(testProject.volumes) ? 'array' : typeof testProject.volumes}\n`);
  
  // 3. 获取项目详情
  console.log('3. 获取项目详情...');
  const detailRes = await request('GET', `/projects/${testProject.id}`, null, token);
  if (detailRes.status === 200) {
    const project = detailRes.data;
    console.log(`✅ 项目详情获取成功`);
    console.log(`   - 章节数: ${project.chapters?.length || 0}`);
    console.log(`   - 角色数: ${project.characters?.length || 0}`);
    console.log(`   - 卷数: ${project.volumes?.length || 0}`);
    console.log(`   - 是否有卷字段: ${project.volumes !== undefined}\n`);
    
    // 4. 测试添加卷
    console.log('4. 测试添加卷...');
    const newVolume = {
      id: 'vol_' + Date.now(),
      number: (project.volumes?.length || 0) + 1,
      title: '测试卷 - 风云初起',
      summary: '这是一个测试卷，描述主角从平凡到崛起的过程',
      chapterIds: [],
      createdAt: Date.now()
    };
    
    const updatedVolumes = [...(project.volumes || []), newVolume];
    const updateRes = await request('PUT', `/projects/${testProject.id}`, {
      ...project,
      volumes: updatedVolumes
    }, token);
    
    if (updateRes.status === 200) {
      console.log(`✅ 添加卷成功: ${newVolume.title}`);
      
      // 验证卷是否保存
      const verifyRes = await request('GET', `/projects/${testProject.id}`, null, token);
      if (verifyRes.status === 200) {
        const savedVolumes = verifyRes.data.volumes || [];
        const foundVolume = savedVolumes.find(v => v.id === newVolume.id);
        if (foundVolume) {
          console.log(`✅ 卷已正确保存`);
          console.log(`   - 卷标题: ${foundVolume.title}`);
          console.log(`   - 卷编号: ${foundVolume.number}`);
          console.log(`   - 卷摘要: ${foundVolume.summary?.slice(0, 50)}...\n`);
        } else {
          console.log('❌ 卷未找到\n');
        }
      }
    } else {
      console.log('❌ 添加卷失败:', updateRes.data?.error, '\n');
    }
    
    // 5. 测试章节摘要生成（如果有章节）
    if (project.chapters?.length > 0) {
      console.log('5. 测试章节摘要生成...');
      const chapter = project.chapters[0];
      console.log(`   测试章节: ${chapter.title}`);
      console.log(`   当前摘要: ${chapter.summary || '无'}`);
      
      // 先获取章节内容
      const contentRes = await request('GET', `/projects/${testProject.id}/chapters/${chapter.id}`, null, token);
      if (contentRes.status === 200 && contentRes.data?.content) {
        console.log(`   章节内容长度: ${contentRes.data.content.length} 字`);
        
        // 测试单章摘要生成
        const summaryRes = await request('POST', '/ai/summarize', {
          content: contentRes.data.content
        }, token);
        
        if (summaryRes.status === 200 && summaryRes.data?.summary) {
          console.log(`✅ 摘要生成成功`);
          console.log(`   摘要: ${summaryRes.data.summary}`);
          console.log(`   关键词: ${summaryRes.data.keywords?.join(', ') || '无'}\n`);
        } else {
          console.log('❌ 摘要生成失败:', summaryRes.data?.error || '未知错误\n');
        }
        
        // 6. 测试批量摘要生成
        console.log('6. 测试批量摘要生成...');
        const batchRes = await request('POST', '/ai/generate-summaries', {
          projectId: testProject.id
        }, token);
        
        if (batchRes.status === 200) {
          console.log(`✅ 批量摘要生成完成`);
          console.log(`   生成数量: ${batchRes.data.generated}`);
          if (batchRes.data.results?.length > 0) {
            batchRes.data.results.forEach(r => {
              console.log(`   - ${r.title}: ${r.summary?.slice(0, 50)}...`);
            });
          } else {
            console.log(`   所有章节已有摘要，无需生成`);
          }
          console.log('');
        } else {
          console.log('❌ 批量摘要生成失败:', batchRes.data?.error, '\n');
        }
        
        // 7. 测试AI写作上下文
        console.log('7. 测试AI写作上下文构建...');
        const writeRes = await request('POST', '/ai/write', {
          projectId: testProject.id,
          chapterId: chapter.id,
          mode: 'outline',
          prompt: '生成一个简短的情节大纲'
        }, token);
        
        if (writeRes.status === 200 && writeRes.data?.content) {
          console.log(`✅ AI写作成功`);
          console.log(`   生成内容长度: ${writeRes.data.content.length} 字`);
          console.log(`   内容预览: ${writeRes.data.content.slice(0, 100)}...\n`);
        } else {
          console.log('❌ AI写作失败:', writeRes.data?.error || '未知错误\n');
        }
      } else {
        console.log('   章节无内容，跳过摘要测试\n');
      }
    } else {
      console.log('5-7. 项目无章节，跳过章节相关测试\n');
    }
  } else {
    console.log('❌ 获取项目详情失败:', detailRes.data?.error, '\n');
  }
  
  console.log('=== 测试完成 ===');
}

runTests().catch(console.error);
