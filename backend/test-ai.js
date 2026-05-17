// 测试直接调用 Kimi API
async function testKimi() {
  const apiKey = 'sk-kimi-PfLQHZ1vfUtPb8bcLMUhQ5vlFzaqeqFmpF8H5r65G7Pr6bNH3scYR2rvYXAjAynY';
  
  // 尝试不同的 endpoint
  const endpoints = [
    'https://api.moonshot.cn/v1/chat/completions',
    'https://www.kimi.com/api/chat',
  ];
  
  const models = [
    'moonshot-v1-8k',
    'kimi-k2.6',
    'kimi-k2',
  ];
  
  for (const url of endpoints) {
    for (const model of models) {
      try {
        console.log(`\n测试: ${url} / ${model}`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: '你好' }],
            max_tokens: 50
          })
        });
        
        const data = await response.json();
        console.log('状态:', response.status);
        console.log('响应:', JSON.stringify(data).slice(0, 200));
        
        if (response.ok) {
          console.log('✅ 成功!');
          return { url, model };
        }
      } catch (e) {
        console.log('❌ 错误:', e.message);
      }
    }
  }
  
  return null;
}

testKimi().then(result => {
  if (result) {
    console.log('\n✅ 找到可用配置:', result);
  } else {
    console.log('\n❌ 所有配置都失败了');
  }
});
