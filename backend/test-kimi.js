// 测试 kimi.com API 的正确格式
async function testKimiCom() {
  const apiKey = 'sk-kimi-PfLQHZ1vfUtPb8bcLMUhQ5vlFzaqeqFmpF8H5r65G7Pr6bNH3scYR2rvYXAjAynY';
  
  try {
    console.log('测试 kimi.com API...');
    const response = await fetch('https://www.kimi.com/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name: 'test-chat',
        model: 'kimi-k2.6',
        messages: [{ role: 'user', content: '你好，请写一句古诗' }]
      })
    });
    
    const data = await response.json();
    console.log('状态:', response.status);
    console.log('响应:', JSON.stringify(data, null, 2).slice(0, 500));
    
    if (response.ok) {
      console.log('✅ 成功!');
    }
  } catch (e) {
    console.log('❌ 错误:', e.message);
  }
}

testKimiCom();
