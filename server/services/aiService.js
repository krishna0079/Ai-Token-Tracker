import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// SDK factory helpers — accept an optional key override
const getOpenAI = (apiKey) => new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
const getAnthropic = (apiKey) => new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
const getGemini = (apiKey) => new GoogleGenerativeAI(apiKey || process.env.GEMINI_API_KEY);
const getDeepseek = (apiKey) => new OpenAI({ apiKey: apiKey || process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' });
const getGroq = (apiKey) => new OpenAI({ apiKey: apiKey || process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });

export const streamChatResponse = async ({ provider, messages, onChunk, onComplete, onError, apiKey, retries = 0 }) => {
  let chunksSent = false;
  const wrappedOnChunk = (text) => {
    chunksSent = true;
    onChunk(text);
  };

  try {
    if (provider === 'openai') {
      const openai = getOpenAI(apiKey);
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o', // or gpt-3.5-turbo
        messages: messages.map(m => ({ role: m.role, content: m.text })),
        stream: true,
        stream_options: { include_usage: true },
      });

      let fullText = '';
      let usage = null;
      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          const text = chunk.choices[0].delta.content;
          fullText += text;
          wrappedOnChunk(text);
        }
        if (chunk.usage) {
          usage = chunk.usage;
        }
      }
      onComplete(fullText, { usage });
    } 
    else if (provider === 'claude') {
      const anthropic = getAnthropic(apiKey);
      const stream = await anthropic.messages.create({
        max_tokens: 1024,
        model: 'claude-3-5-sonnet-20240620',
        messages: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.text })),
        stream: true,
      });

      let fullText = '';
      let inputTokens = 0;
      let outputTokens = 0;

      for await (const chunk of stream) {
        if (chunk.type === 'message_start') {
          inputTokens = chunk.message.usage.input_tokens;
        } else if (chunk.type === 'content_block_delta' && chunk.delta.text) {
          fullText += chunk.delta.text;
          wrappedOnChunk(chunk.delta.text);
        } else if (chunk.type === 'message_delta' && chunk.usage) {
          outputTokens = chunk.usage.output_tokens;
        }
      }
      onComplete(fullText, { usage: { input_tokens: inputTokens, output_tokens: outputTokens } });
    }
    else if (provider === 'gemini') {
      const genAI = getGemini(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      // Gemini expects format { role: 'user' | 'model', parts: [{text}] }
      const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));
      const currentMessage = messages[messages.length - 1].text;
      const chat = model.startChat({ history });

      const result = await chat.sendMessageStream(currentMessage);
      
      let fullText = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullText += chunkText;
          wrappedOnChunk(chunkText);
        }
      }
      
      const response = await result.response;
      if (!fullText.trim()) {
        console.error("Gemini returned empty response. Response object:", JSON.stringify(response));
        throw new Error("The AI generated an empty response. This may be due to safety filters or a model error.");
      }
      onComplete(fullText, { usageMetadata: response.usageMetadata });
    } else if (provider === 'groq') {
      const groq = getGroq(apiKey);
      const stream = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: messages.map(m => ({ role: m.role, content: m.text })),
        stream: true,
        stream_options: { include_usage: true },
      });

      let fullText = '';
      let usage = null;
      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          const text = chunk.choices[0].delta.content;
          fullText += text;
          wrappedOnChunk(text);
        }
        if (chunk.usage) {
          usage = chunk.usage;
        }
      }
      onComplete(fullText, { usage });
    } else if (provider === 'deepseek') {
      const deepseek = getDeepseek(apiKey);
      const stream = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: messages.map(m => ({ role: m.role, content: m.text })),
        stream: true,
        stream_options: { include_usage: true },
      });

      let fullText = '';
      let usage = null;
      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          const text = chunk.choices[0].delta.content;
          fullText += text;
          wrappedOnChunk(text);
        }
        if (chunk.usage) {
          usage = chunk.usage;
        }
      }
      onComplete(fullText, { usage });
    } else {
      throw new Error("Unsupported provider");
    }
  } catch (err) {
    const isRateLimit = err.status === 429 || 
      (err.message && (
        err.message.toLowerCase().includes('quota') || 
        err.message.toLowerCase().includes('rate limit') || 
        err.message.toLowerCase().includes('too many requests')
      ));

    if (!chunksSent && isRateLimit && retries < 2) {
      // Parse the retry delay Google suggests (e.g. "Please retry in 43.192227837s")
      let delay = Math.pow(2, retries) * 15000; // default: 15s, 30s
      const retryMatch = err.message?.match(/retry in (\d+\.?\d*)s/i);
      if (retryMatch) {
        delay = Math.ceil(parseFloat(retryMatch[1])) * 1000 + 2000; // Google's suggested delay + 2s buffer
      }
      console.warn(`[Rate Limit] Retrying ${provider} in ${delay}ms... (Attempt ${retries + 1}/2)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return streamChatResponse({ provider, messages, onChunk, onComplete, onError, apiKey, retries: retries + 1 });
    }

    console.error("AI Service Error:", {
      message: err.message,
      status: err.status,
      code: err.code,
      statusCode: err.statusCode,
      responseData: err.response?.data,
      stack: err.stack?.split('\n').slice(0,3).join('\n')
    });
    onError(err);
  }
};

export const sendChatMessage = async ({ provider, messages, apiKey }) => {
  return new Promise((resolve, reject) => {
    let fullText = '';
    let rawUsage = null;

    streamChatResponse({
      provider,
      messages,
      apiKey,
      onChunk: (chunk) => { fullText += chunk; },
      onComplete: (text, usage) => {
        resolve({ text: fullText || text, usage });
      },
      onError: (err) => {
        reject(err);
      },
    });
  });
};
