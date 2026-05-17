const BASE_URL = 'http://localhost:3001/api';

// 从 localStorage 获取 token（这里模拟）
const token = prompt('请输入你的登录token（从浏览器localStorage获取auth_token）:');

async function testSearch() {
  const projectId = 'mp6mz87j'; // 从截图看到的项目ID
  const keyword = '这是一段';

  console.log('测试搜索功能...');
  console.log('项目ID:', projectId);
  console.log('关键词:', keyword);

  try {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/search?q=${encodeURIComponent(keyword)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    console.log('状态码:', res.status);
    console.log('搜索结果:', JSON.stringify(data, null, 2));

    if (data.results && data.results.length > 0) {
      console.log('✅ 搜索成功，找到', data.results.length, '条结果');
    } else {
      console.log('❌ 未找到结果');
    }
  } catch (e) {
    console.error('请求失败:', e);
  }
}

testSearch();
