import { GoogleGenerativeAI } from '@google/generative-ai';

// AI 모델 타입 정의
export type AIModel = 'gemini-pro' | 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'claude-2';

// AI 제공자 타입 정의
export type AIProvider = 'google' | 'openai' | 'anthropic';

// AI 모델 설정 인터페이스
export interface AIModelConfig {
  provider: AIProvider;
  model: AIModel;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
}

// AI 응답 인터페이스
export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
}

// AI 제공자 인터페이스
export interface AIProviderInterface {
  generateContent(prompt: string, config?: Partial<AIModelConfig>): Promise<AIResponse>;
  getAvailableModels(): AIModel[];
}

// Google Gemini AI 제공자
export class GoogleAIProvider implements AIProviderInterface {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateContent(prompt: string, config?: Partial<AIModelConfig>): Promise<AIResponse> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: (config?.model as any) || 'gemini-pro' 
      });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return {
        content: text,
        model: config?.model || 'gemini-pro',
        provider: 'google'
      };
    } catch (error) {
      throw new Error(`Google AI 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  getAvailableModels(): AIModel[] {
    return ['gemini-pro'];
  }
}

// OpenAI GPT 제공자
export class OpenAIProvider implements AIProviderInterface {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL: string = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async generateContent(prompt: string, config?: Partial<AIModelConfig>): Promise<AIResponse> {
    try {
      const model = config?.model || 'gpt-3.5-turbo';
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: config?.maxTokens || 1000,
          temperature: config?.temperature || 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0].message.content,
        usage: data.usage,
        model: model,
        provider: 'openai'
      };
    } catch (error) {
      throw new Error(`OpenAI 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  getAvailableModels(): AIModel[] {
    return ['gpt-4', 'gpt-3.5-turbo'];
  }
}

// Anthropic Claude 제공자
export class AnthropicProvider implements AIProviderInterface {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL: string = 'https://api.anthropic.com/v1') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async generateContent(prompt: string, config?: Partial<AIModelConfig>): Promise<AIResponse> {
    try {
      const model = config?.model || 'claude-3-sonnet-20240229';
      
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: config?.maxTokens || 1000,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.content[0].text,
        usage: data.usage,
        model: model,
        provider: 'anthropic'
      };
    } catch (error) {
      throw new Error(`Anthropic 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  getAvailableModels(): AIModel[] {
    return ['claude-3', 'claude-2'];
  }
}

// AI 제공자 팩토리
export class AIProviderFactory {
  private static providers: Map<AIProvider, AIProviderInterface> = new Map();

  static initialize() {
    // Google Gemini
    if (process.env.GEMINI_API_KEY) {
      this.providers.set('google', new GoogleAIProvider(process.env.GEMINI_API_KEY));
    }

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.providers.set('openai', new OpenAIProvider(process.env.OPENAI_API_KEY));
    }

    // Anthropic Claude
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.set('anthropic', new AnthropicProvider(process.env.ANTHROPIC_API_KEY));
    }
  }

  static getProvider(provider: AIProvider): AIProviderInterface | null {
    return this.providers.get(provider) || null;
  }

  static getDefaultProvider(): AIProviderInterface | null {
    // 우선순위: Google > OpenAI > Anthropic
    return this.providers.get('google') || 
           this.providers.get('openai') || 
           this.providers.get('anthropic') || 
           null;
  }

  static getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }

  static getAvailableModels(): { provider: AIProvider; models: AIModel[] }[] {
    return Array.from(this.providers.entries()).map(([provider, instance]) => ({
      provider,
      models: instance.getAvailableModels()
    }));
  }
}

// AI 모델 선택 및 생성 헬퍼 함수
export class AIModelSelector {
  static async generateContent(
    prompt: string, 
    preferredProvider?: AIProvider,
    config?: Partial<AIModelConfig>
  ): Promise<AIResponse> {
    // 선호하는 제공자가 있으면 해당 제공자 사용
    if (preferredProvider) {
      const provider = AIProviderFactory.getProvider(preferredProvider);
      if (provider) {
        return await provider.generateContent(prompt, config);
      }
    }

    // 기본 제공자 사용
    const defaultProvider = AIProviderFactory.getDefaultProvider();
    if (!defaultProvider) {
      throw new Error('사용 가능한 AI 제공자가 없습니다. API 키를 확인해주세요.');
    }

    return await defaultProvider.generateContent(prompt, config);
  }

  static getProviderInfo(): {
    available: AIProvider[];
    default: AIProvider | null;
    models: { provider: AIProvider; models: AIModel[] }[];
  } {
    return {
      available: AIProviderFactory.getAvailableProviders(),
      default: AIProviderFactory.getDefaultProvider() ? 'google' : null,
      models: AIProviderFactory.getAvailableModels()
    };
  }
}

// 환경변수에서 AI 제공자 초기화
if (typeof window === 'undefined') {
  AIProviderFactory.initialize();
} 