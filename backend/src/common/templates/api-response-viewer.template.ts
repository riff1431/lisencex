import mongoose from 'mongoose';

export function getApiResponseViewerTemplate(
  url: string,
  method: string,
  status: number,
  resData: any,
  latencyMs: number,
  clientIp: string,
  requestHeaders: any,
): string {
  // Determine status color theme
  let statusBg = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  if (status >= 400 && status < 500) {
    statusBg = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
  } else if (status >= 500) {
    statusBg = 'bg-rose-500/10 border-rose-500/20 text-rose-400';
  }

  // Determine method color theme
  let methodBg = 'bg-blue-500/10 border-blue-500/20 text-blue-400';
  if (method === 'POST') {
    methodBg = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  } else if (method === 'GET') {
    methodBg = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
  } else if (method === 'DELETE' || method === 'PUT') {
    methodBg = 'bg-rose-500/10 border-rose-500/20 text-rose-400';
  }

  // Check database connection state across all active connections
  const isConnected = mongoose.connections.some(conn => conn.readyState === 1);
  const isConnecting = mongoose.connections.some(conn => conn.readyState === 2);
  
  let dbStatusText = 'Disconnected';
  let dbStatusColor = 'bg-rose-500';
  if (isConnected) {
    dbStatusText = 'Connected';
    dbStatusColor = 'bg-emerald-500';
  } else if (isConnecting) {
    dbStatusText = 'Connecting';
    dbStatusColor = 'bg-amber-500';
  }

  const serializedData = JSON.stringify(resData, null, 2);
  const serializedHeaders = JSON.stringify(requestHeaders || {}, null, 2);

  return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Test Report - ${method} ${url}</title>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!-- Tailwind CSS via CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Outfit', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
          colors: {
            space: {
              950: '#070a13',
              900: '#0e1424',
              800: '#1f2937',
              700: '#374151',
            }
          }
        }
      }
    }
  </script>
  <style>
    /* Scrollbars */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: #070a13;
    }
    ::-webkit-scrollbar-thumb {
      background: #1f2937;
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #6366f1;
    }
    
    /* Code highlight */
    .json-key { color: #818cf8; font-weight: 500; }
    .json-string { color: #34d399; }
    .json-number { color: #fbbf24; }
    .json-boolean { color: #60a5fa; }
    .json-null { color: #f87171; }
  </style>
</head>
<body class="h-full bg-space-950 text-slate-200 font-sans p-6 overflow-y-auto">

  <div class="max-w-6xl mx-auto space-y-6">
    <!-- Header/Logo area -->
    <div class="flex items-center justify-between pb-4 border-b border-space-800">
      <div class="flex items-center gap-2">
        <div class="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/10">
          <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <div>
          <span class="text-sm font-bold text-white tracking-tight">LicenseNest API Inspector</span>
          <span class="text-[10px] text-indigo-400 font-mono ml-1">v1.0</span>
        </div>
      </div>
      
      <div class="flex items-center gap-3 text-xs">
        <button onclick="window.location.reload()" class="px-3 py-1.5 rounded-lg bg-space-900 border border-space-800 text-slate-300 hover:text-white hover:border-space-700 flex items-center gap-1.5 transition">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3m0 0l3 3m-3-3v12" />
          </svg>
          Re-test Endpoint
        </button>
        <a href="/api/v1/public/docs" class="px-3 py-1.5 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20 transition">
          API Developer Portal
        </a>
      </div>
    </div>

    <!-- Quick Info Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- Status Card -->
      <div class="p-4 border border-space-800 rounded-xl bg-space-900/40 space-y-1">
        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">HTTP Status</p>
        <div class="flex items-center">
          <span class="px-2 py-0.5 text-sm font-bold rounded border ${statusBg}">
            ${status}
          </span>
        </div>
      </div>

      <!-- Latency Card -->
      <div class="p-4 border border-space-800 rounded-xl bg-space-900/40 space-y-1">
        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Response Time</p>
        <p class="text-xl font-bold text-white font-mono">${latencyMs} <span class="text-xs text-slate-400">ms</span></p>
      </div>

      <!-- Database Connection Card -->
      <div class="p-4 border border-space-800 rounded-xl bg-space-900/40 space-y-1">
        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Database Connection</p>
        <div class="flex items-center gap-2">
          <span class="h-2.5 w-2.5 rounded-full ${dbStatusColor}"></span>
          <p class="text-base font-bold text-white">${dbStatusText}</p>
        </div>
      </div>

      <!-- Client IP Card -->
      <div class="p-4 border border-space-800 rounded-xl bg-space-900/40 space-y-1">
        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Client IP</p>
        <p class="text-base font-bold text-white truncate font-mono">${clientIp || '127.0.0.1'}</p>
      </div>
    </div>

    <!-- Request Details & Headers / Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Left sidebar: Endpoint Details & Headers -->
      <div class="space-y-6 lg:col-span-1">
        <!-- Endpoint Details -->
        <div class="p-5 border border-space-800 rounded-xl bg-space-900/30 space-y-4">
          <h3 class="text-xs font-semibold text-slate-300 uppercase tracking-wider">Test Report Summary</h3>
          <div class="space-y-3 text-xs">
            <div class="flex justify-between border-b border-space-800/50 pb-2">
              <span class="text-slate-400">Request Method</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${methodBg}">${method}</span>
            </div>
            <div class="flex justify-between border-b border-space-800/50 pb-2">
              <span class="text-slate-400">Request Path</span>
              <span class="font-mono text-slate-200 select-all">${url}</span>
            </div>
            <div class="flex justify-between border-b border-space-800/50 pb-2">
              <span class="text-slate-400">Response Type</span>
              <span class="font-mono text-slate-300">JSON</span>
            </div>
            <div class="flex justify-between pb-1">
              <span class="text-slate-400">Timestamp</span>
              <span class="font-mono text-slate-300">${new Date().toISOString().split('T')[1].slice(0, -1)}</span>
            </div>
          </div>
        </div>

        <!-- Request Headers -->
        <div class="p-5 border border-space-800 rounded-xl bg-space-900/30 space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="text-xs font-semibold text-slate-300 uppercase tracking-wider">Request Headers</h3>
            <span class="text-[10px] text-slate-500 font-mono">JSON</span>
          </div>
          <div class="bg-space-950 rounded-lg p-3 overflow-x-auto border border-space-800/40 text-[10px] font-mono text-slate-400 max-h-48">
            <pre><code id="headers-code-block"></code></pre>
          </div>
        </div>
      </div>

      <!-- Right Panel: Test Result JSON Output -->
      <div class="lg:col-span-2 space-y-3 flex flex-col h-[500px]">
        <div class="flex justify-between items-center shrink-0">
          <h3 class="text-xs font-semibold text-slate-300 uppercase tracking-wider">API JSON Result</h3>
          <button onclick="copyResponseText()" class="px-2 py-1 rounded bg-space-900 border border-space-800 text-[10px] text-slate-400 hover:text-white transition flex items-center gap-1">
            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Copy JSON
          </button>
        </div>

        <div class="flex-1 bg-space-950 border border-space-800 rounded-xl overflow-auto p-5 font-mono text-xs relative select-text">
          <pre class="h-full"><code id="response-code-block"></code></pre>
        </div>
      </div>
    </div>
  </div>

  <script>
    const resData = ${serializedData};
    const headersData = ${serializedHeaders};

    window.addEventListener('load', () => {
      document.getElementById('response-code-block').innerHTML = syntaxHighlightJson(resData);
      document.getElementById('headers-code-block').innerHTML = syntaxHighlightJson(headersData);
    });

    function syntaxHighlightJson(json) {
      if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2);
      }
      json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return json.replace(/("(\\\\(?:[uU][a-zA-Z0-9]{4}|[^uU]))"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
      });
    }

    function copyResponseText() {
      const text = JSON.stringify(resData, null, 2);
      navigator.clipboard.writeText(text).then(() => {
        alert('JSON response copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy: ', err);
      });
    }
  </script>
</body>
</html>`;
}
