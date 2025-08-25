import { NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LANGCHAIN_API_KEY = process.env.LANGCHAIN_API_KEY;
const LANGCHAIN_TRACING_V2 = process.env.LANGCHAIN_TRACING_V2 || 'true';
const LANGCHAIN_ENDPOINT = process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com';
const LANGCHAIN_PROJECT = process.env.LANGCHAIN_PROJECT || 'damp-mould-ai';

// Initialize LangChain tracing
if (LANGCHAIN_API_KEY) {
  process.env.LANGCHAIN_TRACING_V2 = LANGCHAIN_TRACING_V2;
  process.env.LANGCHAIN_ENDPOINT = LANGCHAIN_ENDPOINT;
  process.env.LANGCHAIN_PROJECT = LANGCHAIN_PROJECT;
}

// Optimized system prompt - more concise and focused
const SYSTEM_PROMPT = `You are D&M AI, a damp and mould expert. Provide:

1. Direct, actionable answers
2. Specific solutions with steps
3. Safety warnings when needed
4. Professional consultation advice for serious issues
5. Prevention tips

Consider the conversation context and previous chat history when responding.
Keep responses under 150 words. Be practical and to-the-point.`;

// Response cache for common queries (in-memory, consider Redis for production)
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean expired cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of responseCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      responseCache.delete(key);
    }
  }
}, 60000); // Clean every minute

export async function POST(request) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { action, sessionId, chatInput, conversationHistory = [] } = body;

    if (!chatInput?.trim() || !sessionId) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `${sessionId}:${chatInput.trim().toLowerCase()}`;
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse && (Date.now() - cachedResponse.timestamp) < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        output: cachedResponse.output,
        sessionId,
        timestamp: new Date().toISOString(),
        cached: true
      });
    }

    // Initialize optimized OpenAI model
    const llm = new ChatOpenAI({
      openAIApiKey: OPENAI_API_KEY,
      modelName: 'gpt-3.5-turbo',
      temperature: 0.3, // Lower temperature for more focused responses
      maxTokens: 300, // Reduced for faster, more concise responses
      timeout: 10000, // 10 second timeout
    });

    // Build messages array with conversation history
    const messages = [new SystemMessage(SYSTEM_PROMPT)];
    
    // Add conversation history (last 10 messages to stay within token limits)
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-10); // Last 10 messages
      recentHistory.forEach(msg => {
        if (msg.role === 'user') {
          messages.push(new HumanMessage(msg.content));
        } else if (msg.role === 'assistant') {
          messages.push(new SystemMessage(msg.content));
        }
      });
    }
    
    // Add current message
    messages.push(new HumanMessage(chatInput.trim()));

    const response = await llm.invoke(messages);
    const output = response.content;

    // Cache the response
    responseCache.set(cacheKey, {
      output,
      timestamp: Date.now()
    });

    return NextResponse.json({
      success: true,
      output,
      sessionId,
      timestamp: new Date().toISOString(),
      cached: false
    });

  } catch (error) {
    console.error('❌ [Karla API] Error:', error.message);
    
    // Optimized error responses
    if (error.message.includes('timeout')) {
      return NextResponse.json(
        { error: 'Request timeout - please try again' },
        { status: 408 }
      );
    }
    
    if (error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Service busy - please wait a moment' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 500 }
    );
  }
}

// Optimized health check
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'D&M AI',
    timestamp: new Date().toISOString(),
    cache: {
      size: responseCache.size,
      ttl: CACHE_TTL / 1000
    }
  });
}
