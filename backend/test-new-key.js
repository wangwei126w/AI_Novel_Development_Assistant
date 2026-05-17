async function test() {
  const apiKey = 'sk-kimi-CGwSmCfJ08aLgxOvi8bzqR1sfcPPCIAfapPRc5VfxYl2iGhYIn8gcwmVfl3GYhia';
  
  // 测试不同的请求格式
  const tests = [
    {
      name: '标准格式',
      body: {
        model: 'kimi-k2.6',
        messages: [{ role: 'user', content: '你好' }]
      }
    },
    {
      name: '带 name 字段',
      body: {
        name: 'test',
        model: 'kimi-k2.6',
        messages: [{ role: 'user', content: '你好' }]
      }
    },
    {
      name: 'kimi.com 格式',
      body: {
        name: 'novel-assistant',
        model: 'kimi-k2.6',
        messages: [{ role: 'user', content: '写一句古诗' }],
        temperature: 0.8
      }
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`\n测试: ${test.name}`);
      const response = await fetch('https://www.kimi.com/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(test.body)
      });
      
      const data = await response.json();
      console.log('状态:', response.status);
      
      if (response.ok) {
        console.log('✅ 成功!');
        console.log('响应:', JSON.stringify(data).slice(0, 300));
        return test.body;
      } else {
        console.log('❌ 失败:', JSON.stringify(data).slice(0, 200));
      }
    } catch (e) {
      console.log('❌ 错误:', e.message);
    }
  }
  
  return null;
}

test().then(result => {
  if (!result) {
    console.log('\n所有测试都失败了');
  }
});
