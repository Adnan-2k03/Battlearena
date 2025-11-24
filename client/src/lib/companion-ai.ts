export interface CompanionAIConfig {
  enabled: boolean;
  apiKey?: string;
}

export async function getAIResponse(
  userMessage: string,
  personality: string,
  config: CompanionAIConfig
): Promise<string | null> {
  if (!config.enabled || !config.apiKey) {
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a ${personality} laptop companion in a typing battle game. You help users improve their typing skills and provide encouragement. Keep responses short (1-2 sentences), friendly, and motivating. Give practical typing tips when asked.`
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 100,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      console.error('AI API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('AI integration error:', error);
    return null;
  }
}

export function isAIEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('companion_ai_enabled') === 'true';
}

export function getAIApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('companion_ai_key');
}

export function setAIEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('companion_ai_enabled', enabled.toString());
}

export function setAIApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('companion_ai_key', key);
}
