import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';

export function generateThreadName(content: string): string {
  const trimmed = content.trim();
  const firstLine = trimmed.split('\n')[0];
  const words = firstLine.split(/\s+/);
  if (words.length <= 8) return firstLine;
  let summary = firstLine.substring(0, 60).trim();
  const lastSpace = summary.lastIndexOf(' ');
  if (lastSpace > 20) summary = summary.substring(0, lastSpace);
  return summary + '...';
}

export async function createOrUpdateThread(
  threadId: string | null,
  threadName: string,
  selectedModel: string,
  systemInstruction: string,
  userId: string
): Promise<ObjectId> {
  const db = await getDb();
  const activeThreadId = threadId ? new ObjectId(threadId) : new ObjectId();
  const isNewThread = !threadId;
  const userIdObj = new ObjectId(userId);

  if (isNewThread) {
    await db.collection('threads').insertOne({
      _id: activeThreadId,
      userId: userIdObj,
      name: threadName,
      currentModel: selectedModel,
      systemInstruction: systemInstruction || "You are a helpful assistant.",
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } else {
    await db.collection('threads').updateOne(
      { _id: activeThreadId, userId: userIdObj },
      { $set: { currentModel: selectedModel, systemInstruction: systemInstruction || "You are a helpful assistant.", updatedAt: new Date() } }
    );
  }

  return activeThreadId;
}

export async function saveUserMessage(threadId: ObjectId, content: string, userId: string) {
  const db = await getDb();
  await db.collection('messages').insertOne({
    threadId,
    userId: new ObjectId(userId),
    role: 'user',
    content,
    createdAt: new Date()
  });
}

export async function getThreadHistory(threadId: ObjectId, userId: string) {
  const db = await getDb();
  return await db.collection('messages')
    .find({ threadId, userId: new ObjectId(userId) })
    .sort({ createdAt: 1 })
    .toArray();
}