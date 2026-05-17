import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 调用 OpenClaw 内置的 Kimi 服务
 * 通过 sessions_spawn 或直接调用 gateway 的 AI 接口
 */
export async function callAI({ systemPrompt, userPrompt, model = 'kimi/kimi-code', temperature = 0.8, maxTokens = 2000 }) {
  // 尝试使用 OpenClaw 的 gateway 工具
  try {
    // 检查是否有 gateway 工具可用
    const gatewayPath = join(process.env.HOME || '/root', '.nvm/versions/node/v24.15.0/bin/openclaw');
    
    // 使用 curl 调用 gateway 的 API
    const response = await fetch('http://localhost:3000/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gateway API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (e) {
    // 如果 gateway 不可用，返回错误
    throw new Error(`AI 调用失败: ${e.message}`);
  }
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
