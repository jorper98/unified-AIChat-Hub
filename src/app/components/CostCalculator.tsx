'use client';

import { useState, useMemo } from 'react';
import { formatTokenCount, estimateTokens, MODEL_PRICING } from '@/lib/tokens';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
  perplexityUsed?: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    imageTokens?: number;
    actualCost?: number;
    perplexityTokens?: number;
    perplexityCost?: number;
    routerTokens?: number;
    routerCost?: number;
    imageGenTokens?: number;
    imageGenCost?: number;
    imageGenModel?: string;
  };
}

interface CostCalculatorProps {
  messages: Message[];
}

export function CostCalculator({ messages }: CostCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const modelCosts = useMemo(() => {
    const modelUsage: Record<string, { inputTokens: number; outputTokens: number; imageTokens: number; actualCost: number }> = {};
    let perplexityInputTokens = 0;
    let perplexityOutputTokens = 0;
    let perplexityTotalCost = 0;
    let perplexityCount = 0;
    let routerTotalTokens = 0;
    let routerTotalCost = 0;
    let routerCount = 0;
    let imageGenTotalTokens = 0;
    let imageGenTotalCost = 0;
    let imageGenCount = 0;
    let imageGenModelName = '';

    let cumulativeContext = 0;

    for (const msg of messages) {
      const msgTokens = estimateTokens(msg.content);

      if (msg.role === 'user') {
        cumulativeContext += msgTokens;
      } else if (msg.role === 'assistant' && msg.modelUsed) {
        const modelId = msg.modelUsed;
        if (!modelUsage[modelId]) {
          modelUsage[modelId] = { inputTokens: 0, outputTokens: 0, imageTokens: 0, actualCost: 0 };
        }

        if (msg.usage && msg.usage.promptTokens > 0) {
          modelUsage[modelId].inputTokens += msg.usage.promptTokens;
          modelUsage[modelId].outputTokens += msg.usage.completionTokens || 0;
          modelUsage[modelId].imageTokens += msg.usage.imageTokens || 0;
          modelUsage[modelId].actualCost += msg.usage.actualCost || 0;
        } else {
          modelUsage[modelId].inputTokens += cumulativeContext;
          modelUsage[modelId].outputTokens += msgTokens;
        }
        cumulativeContext += msgTokens;

        // Track Perplexity usage separately
        if (msg.usage?.perplexityCost && msg.usage.perplexityCost > 0) {
          perplexityOutputTokens += msg.usage.perplexityTokens || 0;
          perplexityTotalCost += msg.usage.perplexityCost || 0;
          perplexityCount++;
        }

        // Track Router usage separately
        if (msg.usage?.routerCost && msg.usage.routerCost > 0) {
          routerTotalTokens += msg.usage.routerTokens || 0;
          routerTotalCost += msg.usage.routerCost || 0;
          routerCount++;
        }

        // Track Image Generation usage separately
        if (msg.usage?.imageGenCost && msg.usage.imageGenCost > 0) {
          imageGenTotalTokens += msg.usage.imageGenTokens || 0;
          imageGenTotalCost += msg.usage.imageGenCost || 0;
          imageGenCount++;
          if (msg.usage.imageGenModel) {
            imageGenModelName = msg.usage.imageGenModel;
          }
        }
      }
    }

    // Perplexity Sonar via OpenRouter pricing: $1/1M input, $1/1M output
    const perplexityInputCost = (perplexityInputTokens / 1_000_000) * 1.0;
    const perplexityOutputCost = (perplexityOutputTokens / 1_000_000) * 1.0;

    const results: Array<{
      modelId: string;
      modelName: string;
      inputTokens: number;
      outputTokens: number;
      imageTokens: number;
      inputCost: number;
      outputCost: number;
      totalCost: number;
      hasActualCost: boolean;
    }> = [];

    let grandTotal = 0;

    for (const [modelId, usage] of Object.entries(modelUsage)) {
      const pricing = MODEL_PRICING[modelId];
      const modelName = pricing?.name || modelId.split('/')[1] || modelId;

      const inputCost = pricing ? (usage.inputTokens / 1_000_000) * pricing.input : 0;
      const outputCost = pricing ? (usage.outputTokens / 1_000_000) * pricing.output : 0;
      const totalCost = usage.actualCost > 0 ? usage.actualCost : inputCost + outputCost;
      grandTotal += totalCost;

      results.push({
        modelId,
        modelName,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        imageTokens: usage.imageTokens,
        inputCost,
        outputCost,
        totalCost,
        hasActualCost: usage.actualCost > 0,
      });
    }

    // Add Perplexity row if used
    if (perplexityCount > 0) {
      grandTotal += perplexityTotalCost;
      results.push({
        modelId: 'perplexity/sonar',
        modelName: `Perplexity Sonar (${perplexityCount}×)`,
        inputTokens: perplexityInputTokens,
        outputTokens: perplexityOutputTokens,
        imageTokens: 0,
        inputCost: perplexityInputCost,
        outputCost: perplexityOutputCost,
        totalCost: perplexityTotalCost,
        hasActualCost: true,
      });
    }

    // Add Router row if used
    if (routerCount > 0) {
      grandTotal += routerTotalCost;
      results.push({
        modelId: 'router',
        modelName: `Router (${routerCount}×)`,
        inputTokens: routerTotalTokens,
        outputTokens: 0,
        imageTokens: 0,
        inputCost: 0,
        outputCost: 0,
        totalCost: routerTotalCost,
        hasActualCost: true,
      });
    }

    // Add Image Generation row if used
    if (imageGenCount > 0) {
      grandTotal += imageGenTotalCost;
      const imgName = imageGenModelName ? imageGenModelName.split('/')[1] || imageGenModelName : 'Image Gen';
      results.push({
        modelId: 'image_generation',
        modelName: `Image Gen ${imgName} (${imageGenCount}×)`,
        inputTokens: imageGenTotalTokens,
        outputTokens: 0,
        imageTokens: 0,
        inputCost: 0,
        outputCost: 0,
        totalCost: imageGenTotalCost,
        hasActualCost: true,
      });
    }

    console.log('[CostCalculator] Router tracking:', { routerCount, routerTotalTokens, routerTotalCost });
    console.log('[CostCalculator] Perplexity tracking:', { perplexityCount, perplexityTotalCost });
    console.log('[CostCalculator] Image Gen tracking:', { imageGenCount, imageGenTotalCost, imageGenModelName });

    return { models: results, grandTotal };
  }, [messages]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="border px-1.5 py-0.5 rounded text-[9px] font-mono transition shrink-0 border-gray-700 text-gray-400 hover:text-yellow-400 hover:border-yellow-500/50"
        title="Cost Calculator"
      >
        $
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-gray-200">Thread Cost Breakdown</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-700">
                      <th className="text-left py-2 font-medium">Model</th>
                      <th className="text-right py-2 font-medium">In</th>
                      <th className="text-right py-2 font-medium">Out</th>
                      <th className="text-right py-2 font-medium">Img</th>
                      <th className="text-right py-2 font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelCosts.models.map(m => (
                      <tr key={m.modelId} className="border-b border-gray-800">
                        <td className="py-2 text-gray-300">
                          {m.modelName}
                          {m.hasActualCost && (
                            <span className="text-[9px] text-indigo-400 ml-1" title="Actual cost from OpenRouter">*</span>
                          )}
                        </td>
                        <td className="py-2 text-right text-gray-500 font-mono">{formatTokenCount(m.inputTokens)}</td>
                        <td className="py-2 text-right text-gray-500 font-mono">{formatTokenCount(m.outputTokens)}</td>
                        <td className="py-2 text-right text-gray-500 font-mono">{m.imageTokens > 0 ? formatTokenCount(m.imageTokens) : '—'}</td>
                        <td className="py-2 text-right font-mono text-green-400">${m.totalCost.toFixed(10)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-600">
                      <td className="py-2 text-gray-200 font-semibold">Total</td>
                      <td className="py-2"></td>
                      <td className="py-2"></td>
                      <td className="py-2"></td>
                      <td className="py-2 text-right font-mono text-green-400 font-semibold">${modelCosts.grandTotal.toFixed(10)}</td>
                    </tr>
                  </tfoot>
            </table>

            <p className="text-[9px] text-gray-600 mt-3 italic">
              * Actual cost from OpenRouter (includes image tokens). Prices per 1M tokens.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
