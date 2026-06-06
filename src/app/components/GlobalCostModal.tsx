'use client';

import { useState, useEffect } from 'react';
import { formatTokenCount } from '@/lib/tokens';

interface ModelCost {
  modelId: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  imageTokens: number;
  totalCost: number;
  hasActualCost: boolean;
}

interface GlobalCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export function GlobalCostModal({ isOpen, onClose, isDark }: GlobalCostModalProps) {
  const [scope, setScope] = useState<'active' | 'archived' | 'all'>('active');
  const [models, setModels] = useState<ModelCost[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch(`/api/costs?scope=${scope}`)
        .then(res => res.json())
        .then(data => {
          if (data.models) {
            setModels(data.models);
            setGrandTotal(data.grandTotal);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch costs:", err);
          setLoading(false);
        });
    }
  }, [isOpen, scope]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-5 max-w-lg w-full mx-4`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Global Cost Breakdown</h3>
          <button onClick={onClose} className={`${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as 'active' | 'archived' | 'all')}
            className={`w-full text-xs rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-900'}`}
          >
            <option value="active">Active Chats</option>
            <option value="archived">Archived Chats</option>
            <option value="all">All Chats</option>
          </select>
        </div>

        {loading ? (
          <div className={`text-center text-xs py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading costs...</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className={`${isDark ? 'text-gray-500 border-b border-gray-700' : 'text-gray-400 border-b border-gray-200'}`}>
                <th className="text-left py-2 font-medium">Model</th>
                <th className="text-right py-2 font-medium">In</th>
                <th className="text-right py-2 font-medium">Out</th>
                <th className="text-right py-2 font-medium">Img</th>
                <th className="text-right py-2 font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {models.map(m => (
                <tr key={m.modelId} className={`${isDark ? 'border-b border-gray-800' : 'border-b border-gray-100'}`}>
                  <td className={`py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {m.modelName}
                    {m.hasActualCost && (
                      <span className="text-[9px] text-indigo-400 ml-1" title="Actual cost from OpenRouter">*</span>
                    )}
                  </td>
                  <td className={`py-2 text-right font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{formatTokenCount(m.inputTokens)}</td>
                  <td className={`py-2 text-right font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{formatTokenCount(m.outputTokens)}</td>
                  <td className={`py-2 text-right font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{m.imageTokens > 0 ? formatTokenCount(m.imageTokens) : '—'}</td>
                  <td className="py-2 text-right font-mono text-green-400">${m.totalCost.toFixed(10)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={`${isDark ? 'border-t border-gray-600' : 'border-t border-gray-300'}`}>
                <td className={`py-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Total</td>
                <td className="py-2"></td>
                <td className="py-2"></td>
                <td className="py-2"></td>
                <td className="py-2 text-right font-mono text-green-400 font-semibold">${grandTotal.toFixed(10)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        <p className={`text-[9px] mt-3 italic ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>
          * Actual cost from OpenRouter (includes image tokens). Prices per 1M tokens.
        </p>
      </div>
    </div>
  );
}
