import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { MODEL_PRICING } from '@/lib/tokens';
import { getCurrentUserId } from '@/lib/user';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'active';

    const db = await getDb();
    
    let threadMatch: any = { userId: new ObjectId(userId) };
    if (scope === 'active') {
      threadMatch.$or = [{ archived: { $exists: false } }, { archived: false }];
    } else if (scope === 'archived') {
      threadMatch.archived = true;
    }

    const threads = await db.collection('threads').find(threadMatch).project({ _id: 1 }).toArray();
    const threadIds = threads.map((t: any) => t._id);

    if (threadIds.length === 0) {
      return NextResponse.json({ models: [], grandTotal: 0 });
    }

    const pipeline = [
      { $match: { threadId: { $in: threadIds }, role: 'assistant', modelUsed: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$modelUsed',
          inputTokens: { $sum: { $ifNull: ['$usage.promptTokens', 0] } },
          outputTokens: { $sum: { $ifNull: ['$usage.completionTokens', 0] } },
          imageTokens: { $sum: { $ifNull: ['$usage.imageTokens', 0] } },
          actualCost: { $sum: { $ifNull: ['$usage.actualCost', 0] } },
          perplexityCost: { $sum: { $ifNull: ['$usage.perplexityCost', 0] } },
          perplexityTokens: { $sum: { $ifNull: ['$usage.perplexityTokens', 0] } },
          perplexityCount: { $sum: { $cond: [{ $gt: [{ $ifNull: ['$usage.perplexityCost', 0] }, 0] }, 1, 0] } },
          routerCost: { $sum: { $ifNull: ['$usage.routerCost', 0] } },
          routerTokens: { $sum: { $ifNull: ['$usage.routerTokens', 0] } },
          routerCount: { $sum: { $cond: [{ $gt: [{ $ifNull: ['$usage.routerCost', 0] }, 0] }, 1, 0] } },
          imageGenCost: { $sum: { $ifNull: ['$usage.imageGenCost', 0] } },
          imageGenTokens: { $sum: { $ifNull: ['$usage.imageGenTokens', 0] } },
          imageGenCount: { $sum: { $cond: [{ $gt: [{ $ifNull: ['$usage.imageGenCost', 0] }, 0] }, 1, 0] } },
          imageGenModel: { $first: '$usage.imageGenModel' }
        }
      }
    ];

    const results = await db.collection('messages').aggregate(pipeline).toArray();

    let globalPerplexityCost = 0;
    let globalPerplexityTokens = 0;
    let globalPerplexityCount = 0;
    let globalRouterCost = 0;
    let globalRouterTokens = 0;
    let globalRouterCount = 0;
    let globalImageGenCost = 0;
    let globalImageGenTokens = 0;
    let globalImageGenCount = 0;
    let globalImageGenModel = '';

    const formattedModels = results.map((r: any) => {
      globalPerplexityCost += r.perplexityCost || 0;
      globalPerplexityTokens += r.perplexityTokens || 0;
      globalPerplexityCount += r.perplexityCount || 0;
      globalRouterCost += r.routerCost || 0;
      globalRouterTokens += r.routerTokens || 0;
      globalRouterCount += r.routerCount || 0;
      globalImageGenCost += r.imageGenCost || 0;
      globalImageGenTokens += r.imageGenTokens || 0;
      globalImageGenCount += r.imageGenCount || 0;
      if (r.imageGenModel) globalImageGenModel = r.imageGenModel;

      const pricing = MODEL_PRICING[r._id];
      const modelName = pricing?.name || r._id.split('/')[1] || r._id;
      
      const inputCost = pricing ? (r.inputTokens / 1_000_000) * pricing.input : 0;
      const outputCost = pricing ? (r.outputTokens / 1_000_000) * pricing.output : 0;
      const totalCost = r.actualCost > 0 ? r.actualCost : inputCost + outputCost;

      return {
        modelId: r._id,
        modelName,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        imageTokens: r.imageTokens,
        totalCost,
        hasActualCost: r.actualCost > 0,
      };
    });

    if (globalPerplexityCount > 0) {
      formattedModels.push({
        modelId: 'perplexity/sonar',
        modelName: `Perplexity Sonar (${globalPerplexityCount}×)`,
        inputTokens: 0,
        outputTokens: globalPerplexityTokens,
        imageTokens: 0,
        totalCost: globalPerplexityCost,
        hasActualCost: true,
      });
    }

    if (globalRouterCount > 0) {
      formattedModels.push({
        modelId: 'router',
        modelName: `Router (${globalRouterCount}×)`,
        inputTokens: globalRouterTokens,
        outputTokens: 0,
        imageTokens: 0,
        totalCost: globalRouterCost,
        hasActualCost: true,
      });
    }

    if (globalImageGenCount > 0) {
      const imgName = globalImageGenModel ? globalImageGenModel.split('/')[1] || globalImageGenModel : 'Image Gen';
      formattedModels.push({
        modelId: 'image_generation',
        modelName: `Image Gen ${imgName} (${globalImageGenCount}×)`,
        inputTokens: globalImageGenTokens,
        outputTokens: 0,
        imageTokens: 0,
        totalCost: globalImageGenCost,
        hasActualCost: true,
      });
    }

    formattedModels.sort((a, b) => b.totalCost - a.totalCost);

    const grandTotal = formattedModels.reduce((sum, m) => sum + m.totalCost, 0);

    return NextResponse.json({ models: formattedModels, grandTotal });
  } catch (error: any) {
    console.error("Costs API route failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
