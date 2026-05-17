import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 调用 AI 服务
 * 支持多种 API 配置
 */
export async function callAI({ systemPrompt, userPrompt, model, temperature = 0.8, maxTokens = 2000 }) {
  const apiKey = process.env.KIMI_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY;
  const apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const aiModel = model || process.env.AI_MODEL || 'gpt-4';
  
  if (!apiKey) {
    throw new Error('未配置 AI API Key');
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }
    
    return await response.json();
  } catch (e) {
    throw new Error(`AI 调用失败: ${e.message}`);
  }
}

/**
 * 从 AI 响应中提取内容
 */
export function extractAIContent(response) {
  if (response.choices && response.choices[0]) {
    return response.choices[0].message.content;
  }
  if (response.content) {
    return response.content;
  }
  throw new Error('无法解析 AI 响应');
}

/**
 * 检查是否可以使用外部 API
 */
export function getAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.MOONSHOT_API_KEY;
  const apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const model = process.env.AI_MODEL || 'gpt-4';
  
  return { apiKey, apiUrl, model };
}
