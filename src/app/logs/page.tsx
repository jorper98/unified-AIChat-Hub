'use client';

import { useState, useEffect } from 'react';

export default function ServerLogsPage() {
  const [logs, setLogs] = useState('');
  const [error, setError] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isDark, setIsDark] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs?limit=2000');
      if (res.status === 403) {
        setError('Admin access required');
        return;
      }
      const data = await res.json();
      if (data.logs) {
        setError('');
        console.log('[Logs] Received', data.logs.length, 'chars');
        setLogs(data.logs);
      } else {
        console.log('[Logs] No logs in response');
      }
    } catch (e: any) {
      console.error('Failed to fetch logs:', e);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const clearLogs = async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs('');
      fetchLogs();
    } catch (e) {
      console.error('Failed to clear logs:', e);
    }
  };

  const lines = logs ? logs.split('\n').filter(l => l.trim()) : [];
  const filteredLines = logFilter === 'all' ? lines : lines.filter(line => {
    if (logFilter === 'info') return line.includes('[INFO]');
    if (logFilter === 'warn') return line.includes('[WARN]');
    if (logFilter === 'error') return line.includes('[ERROR]');
    return true;
  });

  console.log('[Logs] State:', { logsLength: logs.length, linesCount: lines.length, filteredCount: filteredLines.length });

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-500 mb-2">Access Denied</h2>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
          </div>
        </div>
      )}
      {!error && (
        <>
          <header className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-indigo-400">Server Logs</h1>
          <span className={`text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>data/logs/server.log</span>
          <span className={`text-[9px] ${autoRefresh ? 'text-green-400' : 'text-gray-500'}`}>
            {autoRefresh ? '● Live' : '○ Paused'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Filter:</label>
          <select
            value={logFilter}
            onChange={(e) => setLogFilter(e.target.value as 'all' | 'info' | 'warn' | 'error')}
            className={`text-[10px] px-1.5 py-1 rounded border ${isDark ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'}`}
          >
            <option value="all">All</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`text-[10px] px-2 py-1 rounded border transition ${autoRefresh ? 'border-green-500 text-green-400 bg-green-950/30' : (isDark ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500')}`}
          >
            {autoRefresh ? 'Pause' : 'Resume'}
          </button>
          <button onClick={fetchLogs} className={`text-[10px] px-2 py-1 rounded border transition ${isDark ? 'border-gray-600 text-gray-400 hover:text-white' : 'border-gray-300 text-gray-500 hover:text-gray-800'}`}>
            Refresh
          </button>
          <button onClick={clearLogs} className="text-[10px] px-2 py-1 rounded bg-red-600/80 text-white hover:bg-red-500 transition">Clear</button>
          <button onClick={() => setIsDark(!isDark)} className={`text-[10px] px-2 py-1 rounded border transition ${isDark ? 'border-gray-600 text-gray-400 hover:text-white' : 'border-gray-300 text-gray-500 hover:text-gray-800'}`}>
            {isDark ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>
      <div className={`flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
        {filteredLines.length > 0 ? filteredLines.map((line, idx) => {
          let lineClass = isDark ? 'text-gray-400' : 'text-gray-600';
          if (line.includes('[ERROR]')) lineClass = 'text-red-400';
          else if (line.includes('[WARN]')) lineClass = 'text-yellow-400';
          else if (line.includes('[INFO]')) lineClass = isDark ? 'text-gray-300' : 'text-gray-700';
          return <div key={idx} className={`${lineClass} whitespace-pre break-all`}>{line}</div>;
        }) : (
          <p className={`text-center py-8 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>No logs</p>
        )}
      </div>
      <footer className={`px-4 py-1 border-t text-[9px] ${isDark ? 'bg-gray-900 border-gray-800 text-gray-600' : 'bg-white border-gray-200 text-gray-400'}`}>
        {logs ? `${filteredLines.length} lines shown` : 'No logs available'} · Auto-refresh: {autoRefresh ? '2s' : 'off'}
      </footer>
        </>
      )}
    </div>
  );
}
