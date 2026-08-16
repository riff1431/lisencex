export function getApiDocsTemplate(spec: any, baseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${spec.title} - Developer Portal</title>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
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
            brand: {
              50: '#f5f3ff',
              100: '#ede9fe',
              200: '#ddd6fe',
              500: '#6366f1',
              600: '#4f46e5',
              700: '#4338ca',
              800: '#3730a3',
              900: '#312e81',
              950: '#0f0b26',
            },
            space: {
              950: '#070a13',
              900: '#0e1424',
              800: '#1e293b',
              700: '#334155',
            }
          }
        }
      }
    }
  </script>
  <style>
    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: #070a13;
    }
    ::-webkit-scrollbar-thumb {
      background: #1e293b;
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #6366f1;
    }
    
    /* Glowing accents */
    .glow-purple {
      box-shadow: 0 0 40px -5px rgba(139, 92, 246, 0.15);
    }
    .glow-indigo {
      box-shadow: 0 0 50px -10px rgba(99, 102, 241, 0.2);
    }
    .glass {
      background: rgba(14, 20, 36, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    
    /* Code highlight styles */
    .json-key { color: #818cf8; font-weight: 500; }
    .json-string { color: #34d399; }
    .json-number { color: #fbbf24; }
    .json-boolean { color: #60a5fa; }
    .json-null { color: #f87171; }
  </style>
</head>
<body class="h-full bg-space-950 text-slate-100 font-sans selection:bg-brand-600 selection:text-white flex flex-col overflow-hidden glow-indigo">

  <!-- Header -->
  <header class="h-16 flex items-center justify-between px-6 border-b border-space-800 bg-space-900/80 backdrop-blur z-20 shrink-0">
    <div class="flex items-center gap-3">
      <!-- Shield Logo -->
      <div class="h-9 w-9 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-600/20">
        <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <div>
        <h1 class="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">LicenseNest</h1>
        <p class="text-[11px] text-slate-400 font-mono -mt-0.5">Developer Hub</p>
      </div>
    </div>

    <div class="flex items-center gap-4">
      <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        API Online
      </span>
      <span class="text-xs font-mono text-slate-500">v\${spec.version}</span>
    </div>
  </header>

  <!-- Shell Layout -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Sidebar Navigation -->
    <aside class="w-64 border-r border-space-800 bg-space-900/50 flex flex-col shrink-0">
      <div class="p-4 border-b border-space-800/60">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">End-User & Public APIs</p>
      </div>
      <div class="flex-1 overflow-y-auto p-2 space-y-1" id="sidebar-endpoints">
        <!-- Dynamically rendered -->
      </div>
      
      <!-- Footer / Reference navigation -->
      <div class="p-3 border-t border-space-800 bg-space-950/30 space-y-1">
        <button id="btn-show-sdks" onclick="selectSection('sdks')" class="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-space-800 transition flex items-center gap-2">
          <svg class="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Client Integration SDKs
        </button>
        <button id="btn-show-errors" onclick="selectSection('errors')" class="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-space-800 transition flex items-center gap-2">
          <svg class="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Error Status Codes
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 flex overflow-hidden">
      
      <!-- Endpoint Documentation Details (Left/Center Pane) -->
      <div class="flex-1 overflow-y-auto p-8 lg:p-12 space-y-8" id="doc-pane">
        <!-- Dynamically rendered endpoint detail or SDK / Error view -->
      </div>

      <!-- Playground / Sandbox Console (Right Pane) -->
      <div class="w-[450px] xl:w-[500px] border-l border-space-800 bg-space-900/60 flex flex-col shrink-0 overflow-hidden glass">
        <!-- Interactive Tabs -->
        <div class="flex border-b border-space-800 shrink-0">
          <button id="tab-sandbox-btn" onclick="switchRightTab('sandbox')" class="flex-1 text-center py-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 border-brand-500 text-slate-100 bg-space-950/20">
            API Sandbox
          </button>
          <button id="tab-snippets-btn" onclick="switchRightTab('snippets')" class="flex-1 text-center py-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 border-transparent text-slate-400 hover:text-slate-200">
            Code Snippets
          </button>
        </div>

        <!-- Sandbox Panel -->
        <div id="panel-sandbox" class="flex-1 flex flex-col overflow-hidden">
          <!-- Sandbox Parameters Form -->
          <div class="flex-1 overflow-y-auto p-5 space-y-5">
            <!-- Headers config -->
            <div class="space-y-3">
              <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Client Authentication Headers</h3>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[10px] font-mono text-slate-400 mb-1">X-Client-ID</label>
                  <input type="text" id="header-client-id" placeholder="prod_cli_..." value="test_client_id_123" class="w-full bg-space-950/80 border border-space-800 rounded px-3 py-1.5 text-xs font-mono text-indigo-200 focus:outline-none focus:border-brand-500 transition">
                </div>
                <div>
                  <label class="block text-[10px] font-mono text-slate-400 mb-1">X-API-Key</label>
                  <input type="text" id="header-api-key" placeholder="prod_key_..." value="test_api_key_456" class="w-full bg-space-950/80 border border-space-800 rounded px-3 py-1.5 text-xs font-mono text-indigo-200 focus:outline-none focus:border-brand-500 transition">
                </div>
              </div>
            </div>

            <!-- Endpoint Body inputs container -->
            <div class="space-y-3">
              <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parameters</h3>
              <div id="sandbox-params-container" class="space-y-3">
                <!-- Dynamically populated based on input spec -->
              </div>
            </div>
          </div>

          <!-- Execution Console -->
          <div class="h-[260px] xl:h-[300px] border-t border-space-800 bg-space-950 flex flex-col shrink-0">
            <!-- Execute Bar -->
            <div class="flex items-center justify-between px-4 py-2.5 border-b border-space-800 bg-space-900/40">
              <span class="text-xs font-semibold text-slate-400">Response</span>
              <button onclick="executeApiCall()" class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 font-medium text-xs shadow-lg shadow-brand-600/10 flex items-center gap-1.5 transition">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
                Send Request
              </button>
            </div>
            <!-- Response Console Output -->
            <div class="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 space-y-1 relative" id="console-response">
              <div class="absolute inset-0 flex flex-col items-center justify-center text-slate-500" id="console-placeholder">
                <svg class="h-8 w-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Click "Send Request" to test endpoint</span>
              </div>
              <div id="console-result" class="hidden h-full flex flex-col">
                <div class="flex items-center gap-2 mb-2 pb-2 border-b border-space-800/50">
                  <span id="response-status-badge" class="px-1.5 py-0.5 rounded text-[10px] font-bold"></span>
                  <span id="response-time" class="text-[10px] text-slate-500"></span>
                </div>
                <pre class="flex-1 overflow-auto select-text"><code id="response-body-highlighted"></code></pre>
              </div>
            </div>
          </div>
        </div>

        <!-- Snippets Panel -->
        <div id="panel-snippets" class="flex-1 flex flex-col overflow-hidden hidden">
          <!-- Snippets Selector -->
          <div class="flex border-b border-space-800 bg-space-950/40 px-3 py-1.5 gap-2 shrink-0">
            <button onclick="switchLanguage('javascript')" id="lang-btn-javascript" class="px-2.5 py-1 rounded text-xs font-medium bg-brand-500/10 border border-brand-500/20 text-brand-400">JavaScript</button>
            <button onclick="switchLanguage('nextjs')" id="lang-btn-nextjs" class="px-2.5 py-1 rounded text-xs font-medium text-slate-400 hover:text-slate-200">Next.js</button>
            <button onclick="switchLanguage('wordpress')" id="lang-btn-wordpress" class="px-2.5 py-1 rounded text-xs font-medium text-slate-400 hover:text-slate-200">WordPress/PHP</button>
          </div>

          <!-- Code Display -->
          <div class="flex-1 bg-space-950 overflow-auto p-5 font-mono text-[11px] leading-relaxed relative">
            <button onclick="copySnippet()" class="absolute top-4 right-4 p-1.5 rounded bg-space-900 border border-space-800 text-slate-400 hover:text-white transition" title="Copy code">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
            <pre class="h-full"><code id="code-snippet-container" class="text-slate-300"></code></pre>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- Client-side Javascript -->
  <script>
    // Injected specification and config
    const spec = \${JSON.stringify(spec)};
    const baseUrl = '\${baseUrl}';
    
    // Page state
    let activeSection = 'endpoint'; // 'endpoint', 'sdks', 'errors'
    let currentEndpointIndex = 0;
    let rightTab = 'sandbox'; // 'sandbox', 'snippets'
    let snippetLanguage = 'javascript'; // 'javascript', 'nextjs', 'wordpress'
    const sandboxData = {};

    // Initialize UI
    window.addEventListener('load', () => {
      renderSidebar();
      loadEndpoint(0);
    });

    function renderSidebar() {
      const container = document.getElementById('sidebar-endpoints');
      container.innerHTML = '';
      
      spec.endpoints.forEach((ep, idx) => {
        const isActive = activeSection === 'endpoint' && currentEndpointIndex === idx;
        const isPost = ep.method === 'POST';
        
        const methodBadge = isPost 
          ? '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase w-12 text-center shrink-0">POST</span>' 
          : '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase w-12 text-center shrink-0">GET</span>';
        
        const cleanPath = ep.path.replace(spec.baseUrl, '');
        
        const btn = document.createElement('button');
        btn.onclick = () => loadEndpoint(idx);
        btn.className = \\\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition text-xs font-medium \\\${
          isActive 
            ? 'bg-space-900 border border-space-800 text-white glow-purple' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-space-800/30'
        }\\\`;
        btn.innerHTML = \\\`
          \\\${methodBadge}
          <div class="truncate">
            <p class="truncate text-slate-100 font-semibold">\\\${ep.summary}</p>
            <p class="font-mono text-[9px] text-slate-400 truncate mt-0.5">\\\${cleanPath}</p>
          </div>
        \\\`;
        container.appendChild(btn);
      });
    }

    function loadEndpoint(index) {
      activeSection = 'endpoint';
      currentEndpointIndex = index;
      
      // Update sidebar styling
      renderSidebar();
      document.getElementById('btn-show-sdks').classList.remove('bg-space-800', 'text-white');
      document.getElementById('btn-show-errors').classList.remove('bg-space-800', 'text-white');
      
      const ep = spec.endpoints[index];
      
      // Render details in main column
      renderEndpointDetails(ep);
      
      // Render parameters in Sandbox
      renderSandboxInputs(ep);

      // Generate snippets
      updateCodeSnippet();
    }

    function selectSection(section) {
      activeSection = section;
      renderSidebar();
      
      const btnSdks = document.getElementById('btn-show-sdks');
      const btnErrors = document.getElementById('btn-show-errors');
      
      if (section === 'sdks') {
        btnSdks.classList.add('bg-space-800', 'text-white');
        btnErrors.classList.remove('bg-space-800', 'text-white');
        renderSdkDetails();
      } else {
        btnErrors.classList.add('bg-space-800', 'text-white');
        btnSdks.classList.remove('bg-space-800', 'text-white');
        renderErrorDetails();
      }
    }

    function renderEndpointDetails(ep) {
      const pane = document.getElementById('doc-pane');
      const isPost = ep.method === 'POST';
      const cleanPath = ep.path.replace(spec.baseUrl, '');
      
      const methodBadge = isPost 
        ? '<span class="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">POST</span>' 
        : '<span class="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">GET</span>';

      let paramsHtml = '';
      if (ep.requestBody || ep.queryParams) {
        const fields = ep.requestBody || ep.queryParams;
        paramsHtml = \\\`
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-slate-300 uppercase tracking-wider">Parameters</h3>
            <div class="overflow-hidden border border-space-800 rounded-xl bg-space-900/30">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-space-900 border-b border-space-800 text-[11px] font-semibold text-slate-400 uppercase">
                    <th class="p-3">Field</th>
                    <th class="p-3">Type</th>
                    <th class="p-3">Requirement</th>
                    <th class="p-3">Description</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-space-800/50 text-xs font-medium">
                  \\\${Object.entries(fields).map(([name, schema]) => {
                    const isRequired = schema.required;
                    return \\\`
                      <tr class="hover:bg-space-900/10">
                        <td class="p-3 font-mono text-indigo-400 font-semibold">\\\${name}</td>
                        <td class="p-3 text-slate-400 font-mono text-[10px]">\\\${schema.type || 'string'}</td>
                        <td class="p-3">
                          \\\${isRequired 
                            ? '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 uppercase">Required</span>' 
                            : '<span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-500/10 border border-slate-500/20 text-slate-400 uppercase">Optional</span>'}
                        </td>
                        <td class="p-3 text-slate-300">\\\${schema.description || '-'}</td>
                      </tr>
                    \\\`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        \\\`;
      } else {
        paramsHtml = \\\`
          <div class="py-6 text-center border border-dashed border-space-800 rounded-xl text-slate-500 text-xs">
            No parameters required for this endpoint.
          </div>
        \\\`;
      }

      pane.innerHTML = \\\`
        <!-- Endpoint Header -->
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            \\\${methodBadge}
            <span class="font-mono text-sm text-slate-400">api/v1\\\${cleanPath}</span>
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-white">\\\${ep.summary}</h2>
          <p class="text-sm text-slate-300 leading-relaxed max-w-3xl">\\\${ep.description || 'Request interface details below.'}</p>
        </div>

        <hr class="border-space-800">

        <!-- Authentication block -->
        <div class="p-4 border border-indigo-500/10 rounded-xl bg-indigo-500/5 flex items-start gap-3">
          <svg class="h-5 w-5 text-brand-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <h4 class="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Authentication Requirement</h4>
            <p class="text-xs text-slate-300 mt-1">\\\${spec.authentication.description}</p>
            <div class="flex gap-4 mt-2">
              \\\${spec.authentication.headers.map(h => \\\`<span class="font-mono text-[10px] bg-space-950 px-2 py-0.5 rounded border border-space-800 text-indigo-200">\\\${h}</span>\\\`).join('')}
            </div>
          </div>
        </div>

        <!-- Params -->
        \\\${paramsHtml}
      \\\`;
    }

    function renderSandboxInputs(ep) {
      const container = document.getElementById('sandbox-params-container');
      container.innerHTML = '';
      
      const fields = ep.requestBody || ep.queryParams || {};
      
      // Wipe old sandbox inputs and load defaults
      Object.keys(sandboxData).forEach(k => delete sandboxData[k]);
      
      Object.entries(fields).forEach(([name, schema]) => {
        let defaultVal = '';
        if (name === 'productSlug') defaultVal = 'premium-addons';
        if (name === 'licenseKey') defaultVal = 'LNC-9872-XPQZ-3321-7788';
        if (name === 'installationId') defaultVal = 'uuid-f81d4fae-7dec-11d0-a765';
        if (name === 'domain') defaultVal = 'client-site.com';
        if (name === 'token') defaultVal = 'tok_dev_active_1122';
        
        sandboxData[name] = defaultVal;

        const inputGroup = document.createElement('div');
        inputGroup.className = 'space-y-1.5';
        
        const label = document.createElement('label');
        label.className = 'block text-[11px] font-medium text-slate-300';
        label.innerHTML = \\\`\\\${name} \\\${schema.required ? '<span class="text-rose-400">*</span>' : ''}\\\`;
        
        let input;
        if (schema.values) {
          // Enum dropdown
          input = document.createElement('select');
          input.className = 'w-full bg-space-950 border border-space-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500';
          schema.values.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.innerText = v;
            input.appendChild(opt);
          });
        } else {
          // Regular text field
          input = document.createElement('input');
          input.type = 'text';
          input.value = defaultVal;
          input.placeholder = schema.description || '';
          input.className = 'w-full bg-space-950 border border-space-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-500';
        }
        
        input.oninput = (e) => {
          sandboxData[name] = e.target.value;
          updateCodeSnippet();
        };
        
        inputGroup.appendChild(label);
        inputGroup.appendChild(input);
        container.appendChild(inputGroup);
      });
    }

    function renderSdkDetails() {
      const pane = document.getElementById('doc-pane');
      pane.innerHTML = \\\`
        <div class="space-y-3">
          <h2 class="text-2xl font-bold tracking-tight text-white">LicenseNest Client SDK Types</h2>
          <p class="text-sm text-slate-300 max-w-3xl">Integration is simplified using pre-built classes optimized for diverse environment runtimes.</p>
        </div>

        <hr class="border-space-800">

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          \\\${spec.sdkTypes.map(sdk => \\\`
            <div class="p-6 border border-space-800 rounded-xl bg-space-900/30 space-y-4 hover:border-brand-500/30 transition">
              <div class="flex items-center justify-between">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">\\\${sdk.language}</span>
                <span class="text-xs text-slate-400 font-medium">\\\${sdk.type}</span>
              </div>
              <div>
                <h4 class="font-bold text-white text-base font-mono">\\\${sdk.sdkClass}</h4>
                <p class="text-xs text-slate-300 mt-1">Ready-to-use SDK implementation class mapped inside the SDK folder structure.</p>
              </div>
            </div>
          \\\`).join('')}
        </div>
      \\\`;
    }

    function renderErrorDetails() {
      const pane = document.getElementById('doc-pane');
      pane.innerHTML = \\\`
        <div class="space-y-3">
          <h2 class="text-2xl font-bold tracking-tight text-white">Error Code Reference</h2>
          <p class="text-sm text-slate-300 max-w-3xl">Comprehensive list of specific internal system error codes returned by endpoint validations.</p>
        </div>

        <hr class="border-space-800">

        <div class="overflow-hidden border border-space-800 rounded-xl bg-space-900/30">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-space-900 border-b border-space-800 text-[11px] font-semibold text-slate-400 uppercase">
                <th class="p-3.5">Internal Code</th>
                <th class="p-3.5">HTTP Status</th>
                <th class="p-3.5">Explanation / Troubleshooting</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-space-800/50 text-xs font-medium">
              \\\${spec.errorCodes.map(err => \\\`
                <tr class="hover:bg-space-900/10">
                  <td class="p-3.5 font-mono text-rose-400 font-semibold">\\\${err.code}</td>
                  <td class="p-3.5 font-mono text-slate-400">\\\${err.httpStatus}</td>
                  <td class="p-3.5 text-slate-300">\\\${err.description}</td>
                </tr>
              \\\`).join('')}
            </tbody>
          </table>
        </div>
      \\\`;
    }

    function switchRightTab(tab) {
      rightTab = tab;
      
      const sandboxBtn = document.getElementById('tab-sandbox-btn');
      const snippetsBtn = document.getElementById('tab-snippets-btn');
      
      const sandboxPanel = document.getElementById('panel-sandbox');
      const snippetsPanel = document.getElementById('panel-snippets');
      
      if (tab === 'sandbox') {
        sandboxBtn.classList.add('border-brand-500', 'text-slate-100');
        sandboxBtn.classList.remove('border-transparent', 'text-slate-400');
        snippetsBtn.classList.remove('border-brand-500', 'text-slate-100');
        snippetsBtn.classList.add('border-transparent', 'text-slate-400');
        
        sandboxPanel.classList.remove('hidden');
        snippetsPanel.classList.add('hidden');
      } else {
        snippetsBtn.classList.add('border-brand-500', 'text-slate-100');
        snippetsBtn.classList.remove('border-transparent', 'text-slate-400');
        sandboxBtn.classList.remove('border-brand-500', 'text-slate-100');
        sandboxBtn.classList.add('border-transparent', 'text-slate-400');
        
        snippetsPanel.classList.remove('hidden');
        sandboxPanel.classList.add('hidden');
        updateCodeSnippet();
      }
    }

    function switchLanguage(lang) {
      snippetLanguage = lang;
      
      ['javascript', 'nextjs', 'wordpress'].forEach(l => {
        const btn = document.getElementById(\\\`lang-btn-\\\${l}\\\`);
        if (l === lang) {
          btn.className = 'px-2.5 py-1 rounded text-xs font-medium bg-brand-500/10 border border-brand-500/20 text-brand-400';
        } else {
          btn.className = 'px-2.5 py-1 rounded text-xs font-medium text-slate-400 hover:text-slate-200';
        }
      });
      
      updateCodeSnippet();
    }

    function updateCodeSnippet() {
      if (activeSection !== 'endpoint') return;
      
      const ep = spec.endpoints[currentEndpointIndex];
      const cleanPath = ep.path.replace(spec.baseUrl, '');
      const fullUrl = window.location.origin + spec.baseUrl + cleanPath;
      
      const codeBox = document.getElementById('code-snippet-container');
      const clientId = document.getElementById('header-client-id').value;
      const apiKey = document.getElementById('header-api-key').value;

      let code = '';
      
      if (snippetLanguage === 'javascript') {
        code = \\\`// JavaScript Integration - API Client call
const apiEndpoint = '\\\${fullUrl}';

const requestPayload = \\\${JSON.stringify(sandboxData, null, 2)};

fetch(apiEndpoint, {
  method: '\\\${ep.method}',
  headers: {
    'Content-Type': 'application/json',
    'X-Client-ID': '\\\${clientId}',
    'X-API-Key': '\\\${apiKey}'
  }\\\${ep.method === 'POST' ? ',\\\\n  body: JSON.stringify(requestPayload)' : ''}
})
.then(response => {
  if (!response.ok) {
    throw new Error(\\\\\\\`HTTP error! status: \\\\\\\${response.status}\\\\\\\`);
  }
  return response.json();
})
.then(data => {
  console.log('License verification response:', data);
})
.catch(error => {
  console.error('Request failed:', error);
});\\\`;
      } else if (snippetLanguage === 'nextjs') {
        code = \\\`// Next.js (App Router Server Action/Route Handler)
import { NextResponse } from 'next/web';

export async function POST() {
  const apiEndpoint = '\\\${fullUrl}';
  
  try {
    const res = await fetch(apiEndpoint, {
      method: '\\\${ep.method}',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': '\\\${clientId}',
        'X-API-Key': '\\\${apiKey}'
      },
      next: { revalidate: 3600 }, // Cache check for 1 hour
      \\\${ep.method === 'POST' ? 'body: JSON.stringify(' + JSON.stringify(sandboxData, null, 2) + ')' : ''}
    });

    const result = await res.json();
    
    if (result.success) {
      return NextResponse.json({ active: true, payload: result.data });
    }
    
    return NextResponse.json({ active: false, error: result.error?.message });
  } catch (err) {
    return NextResponse.json({ active: false, error: 'License verification connection failure' }, { status: 500 });
  }
}\\\`;
      } else if (snippetLanguage === 'wordpress') {
        code = \\\`<?php
/**
 * WordPress Theme or Plugin licensing integration pattern
 */

$api_endpoint = '\\\${fullUrl}';

$payload = array(
\\\${Object.entries(sandboxData).map(([k, v]) => \\\`    '\\\${k}' => '\\\${v}'\\\`).join(',\\\\n')}
);

$response = wp_remote_post($api_endpoint, array(
    'method'    => '\\\${ep.method}',
    'timeout'   => 15,
    'headers'   => array(
        'Content-Type' => 'application/json',
        'X-Client-ID'  => '\\\${clientId}',
        'X-API-Key'    => '\\\${apiKey}'
    ),
    'body'      => json_encode($payload),
));

if (is_wp_error($response)) {
    $error_message = $response->get_error_message();
    error_log("License verification connection failed: " . $error_message);
    return false;
}

$response_code = wp_remote_retrieve_response_code($response);
$response_body = wp_remote_retrieve_body($response);

$data = json_decode($response_body, true);

if ($response_code === 200 && isset($data['success']) && $data['success'] === true) {
    // Save license status
    update_option('licensenest_activation_token', $data['data']['token'] ?? '');
    return true;
} else {
    // Process licensing errors
    $err_code = $data['error']['code'] ?? 'UNKNOWN_ERROR';
    $err_msg  = $data['error']['message'] ?? 'Error verifying license';
    wp_die("Licensing failed: [" . $err_code . "] " . $err_msg);
}\\\`;
      }

      codeBox.innerText = code;
    }

    async function executeApiCall() {
      if (activeSection !== 'endpoint') return;
      
      const ep = spec.endpoints[currentEndpointIndex];
      const cleanPath = ep.path.replace(spec.baseUrl, '');
      const origin = window.location.origin;
      const fullUrl = origin + spec.baseUrl + cleanPath;
      
      const consolePlaceholder = document.getElementById('console-placeholder');
      const consoleResult = document.getElementById('console-result');
      const statusBadge = document.getElementById('response-status-badge');
      const timeBadge = document.getElementById('response-time');
      const responseBodyCode = document.getElementById('response-body-highlighted');

      consolePlaceholder.classList.add('hidden');
      consoleResult.classList.remove('hidden');
      
      statusBadge.innerText = 'FETCHING...';
      statusBadge.className = 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400';
      timeBadge.innerText = '';
      responseBodyCode.innerHTML = 'Executing request to the server...';

      const clientId = document.getElementById('header-client-id').value;
      const apiKey = document.getElementById('header-api-key').value;

      const startTime = performance.now();
      try {
        const fetchOptions = {
          method: ep.method,
          headers: {
            'Content-Type': 'application/json',
            'X-Client-ID': clientId,
            'X-API-Key': apiKey
          }
        };

        if (ep.method === 'POST') {
          fetchOptions.body = JSON.stringify(sandboxData);
        }

        const res = await fetch(fullUrl, fetchOptions);
        const duration = Math.round(performance.now() - startTime);
        
        let jsonRes;
        try {
          jsonRes = await res.json();
        } catch (e) {
          jsonRes = { error: 'Failed to parse JSON response', raw: await res.text() };
        }

        // Render Status Code
        statusBadge.innerText = \\\`HTTP \\\${res.status} \\\${res.statusText || ''}\\\`;
        if (res.ok) {
          statusBadge.className = 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400';
        } else {
          statusBadge.className = 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400';
        }

        timeBadge.innerText = \\\`\\\${duration} ms\\\`;
        responseBodyCode.innerHTML = syntaxHighlightJson(jsonRes);
        
      } catch (err) {
        statusBadge.innerText = 'CONNECTION REFUSED';
        statusBadge.className = 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400';
        responseBodyCode.innerHTML = syntaxHighlightJson({ 
          error: 'Connection error during sandbox request',
          message: err.message,
          explanation: 'Is the NestJS API server running locally on the expected port?'
        });
      }
    }

    function syntaxHighlightJson(json) {
      if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2);
      }
      json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return json.replace(/("(\\\\(?:[uU][a-zA-Z0-9]{4}|[^uU]))"(\\\\s*:)?|\\\\b(true|false|null)\\\\b|-?\\\\d+(?:\\\\.\\\\d*)?(?:[eE][+-]?\\\\d+)?)/g, function (match) {
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

    function copySnippet() {
      const text = document.getElementById('code-snippet-container').innerText;
      navigator.clipboard.writeText(text).then(() => {
        alert('Copied snippet to clipboard!');
      }).catch(err => {
        console.error('Copy failed:', err);
      });
    }
  </script>
</body>
</html>`;
}
