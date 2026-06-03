import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const { threadId, messageContent, selectedModel, systemInstruction } = await request.json();
    const db = await getDb();
    
    const activeThreadId = threadId ? new ObjectId(threadId) : new ObjectId();

    await db.collection('threads').updateOne(
      { _id: activeThreadId },
      { 
        $set: { 
          name: "Active Discussion Thread",
          currentModel: selectedModel,
          systemInstruction: systemInstruction || "You are a helpful assistant.",
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );

    await db.collection('messages').insertOne({
      threadId: activeThreadId,
      role: 'user',
      content: messageContent,
      createdAt: new Date()
    });

    const rawHistory = await db.collection('messages')
      .find({ threadId: activeThreadId })
      .sort({ createdAt: 1 })
      .toArray();

    // Format history for OpenRouter payload (allowing user, assistant, or system)
    const formattedHistory = rawHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));

    if (systemInstruction) {
      formattedHistory.unshift({ role: 'system', content: systemInstruction });
    }

    // CRITICAL: We added HTTP-Referer and X-Title to comply with OpenRouter rules
    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3031", 
        "X-Title": "Unified Chat Hub"
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: formattedHistory
      })
    });

    const completionData = await openRouterResponse.json();

    // ERROR LOGGER: This will intercept OpenRouter errors and surface them clearly
    if (completionData.error) {
      console.error("--- OPENROUTER API ERROR ---");
      console.error(JSON.stringify(completionData.error, null, 2));
      console.error("----------------------------");
      
      return NextResponse.json({ 
        threadId: activeThreadId.toHexString(), 
        response: `OpenRouter Error [${completionData.error.code}]: ${completionData.error.message}` 
      });
    }

    const aiTextOutput = completionData.choices?.[0]?.message?.content || "API error or empty payload returned.";

    await db.collection('messages').insertOne({
      threadId: activeThreadId,
      role: 'assistant',
      content: aiTextOutput,
      modelUsed: selectedModel,
      createdAt: new Date()
    });

    return NextResponse.json({ 
      threadId: activeThreadId.toHexString(), 
      response: aiTextOutput 
    });

  } catch (error: any) {
    console.error("Backend runtime failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}