"use client";

import React, { useState, useEffect, useMemo } from "react";
import styles from "./api-tester.module.css";
import { parseCurl } from "@/lib/curlParser";

interface ParamHeader {
  id: string;
  key: string;
  value: string;
  description: string;
  active: boolean;
}

interface EnvVariable {
  id: string;
  key: string;
  value: string;
}

interface Environment {
  id: string;
  name: string;
  variables: EnvVariable[];
}

interface SavedRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  params: ParamHeader[];
  headers: ParamHeader[];
  body: string;
}

interface CollectionFolder {
  id: string;
  name: string;
  requests: SavedRequest[];
  isOpen: boolean;
}

export default function ApiTesterPage() {
  // Collection State
  const [collections, setCollections] = useState<CollectionFolder[]>([
    { id: "default", name: "My Collection", requests: [], isOpen: true }
  ]);
  const [activeReqId, setActiveReqId] = useState<string | null>(null);

  // Current Request State
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [params, setParams] = useState<ParamHeader[]>([]);
  const [headers, setHeaders] = useState<ParamHeader[]>([]);
  const [body, setBody] = useState("");

  // Environment State
  const [environments, setEnvironments] = useState<Environment[]>([
    { id: "1", name: "Global", variables: [] }
  ]);
  const [activeEnvId, setActiveEnvId] = useState<string>("1");
  const [showEnvModal, setShowEnvModal] = useState(false);

  // Modal states for Collection
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showReqModal, setShowReqModal] = useState(false);
  const [folderInput, setFolderInput] = useState("");
  const [reqInput, setReqInput] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");

  // UI State
  const [reqTab, setReqTab] = useState<"params" | "headers" | "body">("params");
  const [resTab, setResTab] = useState<"body" | "headers">("body");
  const [snippetLang, setSnippetLang] = useState<"curl" | "fetch" | "dart">("curl");
  const [showImport, setShowImport] = useState(false);
  const [curlInput, setCurlInput] = useState("");

  // Response State
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{
    status: number;
    statusText: string;
    time: number;
    size: number;
    data: any;
    headers: Record<string, string>;
  } | null>(null);

  // Load from local storage
  useEffect(() => {
    const savedColls = localStorage.getItem("api_tester_collections");
    if (savedColls) {
      try { setCollections(JSON.parse(savedColls)); } catch (e) {}
    }
    const savedEnvs = localStorage.getItem("api_tester_envs");
    if (savedEnvs) {
      try { setEnvironments(JSON.parse(savedEnvs)); } catch (e) {}
    }
    const savedActiveEnv = localStorage.getItem("api_tester_active_env");
    if (savedActiveEnv) {
      setActiveEnvId(savedActiveEnv);
    }
  }, []);

  const saveEnvironments = (newEnvs: Environment[]) => {
    setEnvironments(newEnvs);
    localStorage.setItem("api_tester_envs", JSON.stringify(newEnvs));
  };
  
  const handleEnvChange = (envId: string) => {
    setActiveEnvId(envId);
    localStorage.setItem("api_tester_active_env", envId);
  };

  const replaceEnv = (text: string) => {
    if (!text) return text;
    const activeEnv = environments.find(e => e.id === activeEnvId);
    if (!activeEnv) return text;
    
    let result = text;
    activeEnv.variables.forEach(v => {
      if (v.key) {
        const regex = new RegExp(`{{${v.key}}}`, 'g');
        result = result.replace(regex, v.value);
      }
    });
    return result;
  };

  const saveCollections = (newColls: CollectionFolder[]) => {
    setCollections(newColls);
    localStorage.setItem("api_tester_collections", JSON.stringify(newColls));
  };

  // URL <-> Params Sync
  useEffect(() => {
    try {
      if (!url) return;
      // Extract base url and hash
      const urlObj = new URL(url.startsWith("http") ? url : `http://${url}`);
      
      // We don't want to parse and overwrite params if the user is currently typing in the params table.
      // So we only sync URL -> Params if they differ to avoid circular updates breaking cursor position.
      
      // (For simplicity in this MVP, we won't aggressively parse URL while typing. 
      // But we will update the URL when params change via a getter instead).
    } catch (e) {}
  }, [url]);

  // Compute final URL for sending/snippets (including active params)
  const finalUrl = useMemo(() => {
    try {
      if (!url) return "";
      const base = url.split("?")[0];
      const activeParams = params.filter(p => p.active && p.key);
      if (activeParams.length === 0) return url; // Keep original if no params active, or base if there were but we unchecked
      
      const searchParams = new URLSearchParams();
      activeParams.forEach(p => searchParams.append(p.key, p.value));
      return `${base}?${searchParams.toString()}`;
    } catch(e) {
      return url;
    }
  }, [url, params]);

  const handleParamChange = (id: string, field: keyof ParamHeader, val: any) => {
    setParams(params.map(p => p.id === id ? { ...p, [field]: val } : p));
  };
  
  const handleHeaderChange = (id: string, field: keyof ParamHeader, val: any) => {
    setHeaders(headers.map(h => h.id === id ? { ...h, [field]: val } : h));
  };

  const addParam = () => setParams([...params, { id: Date.now().toString(), key: "", value: "", description: "", active: true }]);
  const addHeader = () => setHeaders([...headers, { id: Date.now().toString(), key: "", value: "", description: "", active: true }]);
  const removeParam = (id: string) => setParams(params.filter(p => p.id !== id));
  const removeHeader = (id: string) => setHeaders(headers.filter(h => h.id !== id));

  // cURL Import
  const handleParseCurl = () => {
    if (!curlInput.trim()) return;
    const parsed = parseCurl(curlInput);
    setMethod(parsed.method);
    
    // Extract query params from URL
    try {
      const u = new URL(parsed.url);
      setUrl(u.origin + u.pathname);
      const newParams: ParamHeader[] = [];
      u.searchParams.forEach((val, key) => {
        newParams.push({ id: Math.random().toString(), key, value: val, description: "", active: true });
      });
      setParams(newParams);
    } catch (e) {
      setUrl(parsed.url);
    }
    
    const parsedHeaders = Object.entries(parsed.headers).map(([k, v]) => ({
      id: Math.random().toString(),
      key: k,
      value: v,
      description: "",
      active: true
    }));
    setHeaders(parsedHeaders);
    setBody(parsed.body);
    setCurlInput("");
    setShowImport(false);
  };

  const handleSend = async () => {
    if (!finalUrl) return;
    setLoading(true);
    setResponse(null);
    
    const startTime = performance.now();
    const fetchHeaders: Record<string, string> = {};
    headers.filter(h => h.active && h.key).forEach(h => {
      fetchHeaders[h.key] = replaceEnv(h.value);
    });

    const sendingUrl = replaceEnv(finalUrl);
    const sendingBody = replaceEnv(body);

    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          url: sendingUrl,
          headers: fetchHeaders,
          payload: (method !== "GET" && method !== "HEAD" && sendingBody) ? sendingBody : undefined
        })
      });
      
      const proxyResponse = await res.json();
      
      if (res.status >= 500 && proxyResponse.status === 0) {
         throw new Error(proxyResponse.data);
      }

      setResponse(proxyResponse);


    } catch (err: any) {
      setResponse({
        status: 0,
        statusText: "Error",
        time: Math.round(performance.now() - startTime),
        size: 0,
        data: err.message || "Network error / CORS issue.",
        headers: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRequest = () => {
    if (!finalUrl) return;
    const newReq: SavedRequest = {
      id: activeReqId || Date.now().toString(),
      name: new URL(finalUrl.startsWith('http') ? finalUrl : `http://${finalUrl}`).pathname || finalUrl,
      method,
      url: finalUrl, // store final url to restore exactly
      params,
      headers,
      body
    };

    let updated = [...collections];
    // Find folder containing activeReqId
    let targetFolder = updated.find(f => f.requests.some(r => r.id === activeReqId));
    if (!targetFolder) targetFolder = updated[0]; // fallback to first
    
    if (activeReqId && targetFolder) {
      // update existing
      targetFolder.requests = targetFolder.requests.map(r => r.id === activeReqId ? newReq : r);
    } else if (targetFolder) {
      // create new
      targetFolder.requests.push(newReq);
      setActiveReqId(newReq.id);
    }
    
    saveCollections(updated);
  };

  const handleAddFolder = () => {
    if (!folderInput.trim()) return;
    const newFolder: CollectionFolder = {
      id: Date.now().toString(),
      name: folderInput.trim(),
      requests: [],
      isOpen: true
    };
    saveCollections([...collections, newFolder]);
    setFolderInput("");
    setShowFolderModal(false);
  };

  const handleAddRequest = () => {
    if (!reqInput.trim() || !selectedFolderId) return;
    const newReq: SavedRequest = {
      id: Date.now().toString(),
      name: reqInput.trim(),
      method: "GET",
      url: "",
      params: [],
      headers: [],
      body: ""
    };
    const updated = collections.map(c => {
      if (c.id === selectedFolderId) {
        return { ...c, requests: [...c.requests, newReq], isOpen: true };
      }
      return c;
    });
    saveCollections(updated);
    setActiveReqId(newReq.id);
    setMethod("GET");
    setUrl("");
    setParams([]);
    setHeaders([]);
    setBody("");
    setResponse(null);
    setReqInput("");
    setShowReqModal(false);
  };

  const loadRequest = (req: SavedRequest) => {
    setActiveReqId(req.id);
    setMethod(req.method);
    setUrl(req.url.split('?')[0]);
    setParams(req.params || []);
    setHeaders(req.headers || []);
    setBody(req.body || "");
    setResponse(null);
  };

  const toggleFolder = (folderId: string) => {
    const updated = collections.map(c => c.id === folderId ? { ...c, isOpen: !c.isOpen } : c);
    saveCollections(updated);
  };

  // Snippets
  const generateSnippet = () => {
    const h = headers.filter(hd => hd.active && hd.key);
    const sendingUrl = replaceEnv(finalUrl);
    const sendingBody = replaceEnv(body);
    
    if (snippetLang === "curl") {
      let cmd = `curl --location --request ${method} '${sendingUrl}' \\\n`;
      h.forEach(hd => {
        cmd += `--header '${hd.key}: ${replaceEnv(hd.value)}' \\\n`;
      });
      if (sendingBody) {
        cmd += `--data-raw '${sendingBody}'`;
      }
      return cmd.trim().replace(/\\\n$/, "");
    }
    
    if (snippetLang === "fetch") {
      let code = `const myHeaders = new Headers();\n`;
      h.forEach(hd => { code += `myHeaders.append("${hd.key}", "${replaceEnv(hd.value)}");\n`; });
      code += `\nconst requestOptions = {\n  method: '${method}',\n  headers: myHeaders,\n`;
      if (sendingBody) code += `  body: JSON.stringify(${JSON.stringify(sendingBody)}),\n`; // simplistic stringify
      code += `  redirect: 'follow'\n};\n\n`;
      code += `fetch("${sendingUrl}", requestOptions)\n  .then(response => response.text())\n  .then(result => console.log(result))\n  .catch(error => console.log('error', error));`;
      return code;
    }
    
    if (snippetLang === "dart") {
      let code = `import 'package:dio/dio.dart';\n\n`;
      code += `var headers = {\n`;
      h.forEach(hd => { code += `  '${hd.key}': '${replaceEnv(hd.value)}',\n`; });
      code += `};\n`;
      code += `var dio = Dio();\n`;
      code += `var response = await dio.request(\n  '${sendingUrl}',\n`;
      code += `  options: Options(\n    method: '${method}',\n    headers: headers,\n  ),\n`;
      if (sendingBody) {
        // basic escape
        let escapedBody = sendingBody.replace(/'/g, "\\'");
        code += `  data: '${escapedBody}',\n`;
      }
      code += `);\n\n`;
      code += `if (response.statusCode == 200) {\n  print(response.data);\n} else {\n  print(response.statusMessage);\n}`;
      return code;
    }
    
    return "";
  };

  const getMethodClass = (m: string) => styles[m.toLowerCase()] || styles.get;

  // JSON Highlighting (simple)
  const renderJson = (obj: any) => {
    const str = JSON.stringify(obj, null, 2);
    // Extremely simplistic syntax highlight for dark theme
    const formatted = str
      .replace(/"(.*?)":/g, '<span class="'+styles.jsonKey+'">"$1"</span>:')
      .replace(/: "(.*?)"/g, ': <span class="'+styles.jsonString+'">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="'+styles.jsonNumber+'">$1</span>')
      .replace(/: (true|false)/g, ': <span class="'+styles.jsonBoolean+'">$1</span>')
      .replace(/: null/g, ': <span class="'+styles.jsonNull+'">null</span>');
      
    return <pre className={styles.responseJson} dangerouslySetInnerHTML={{__html: formatted}} />;
  };

  return (
    <div className={styles.container}>
      
      {/* LEFT SIDEBAR - COLLECTIONS */}
      <div className={styles.leftSidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Collections</h2>
          <div style={{display: 'flex', gap: '0.25rem'}}>
            <button className={styles.iconBtn} onClick={() => setShowFolderModal(true)} title="New Folder"><span className="material-symbols-outlined">create_new_folder</span></button>
            <button className={styles.iconBtn} onClick={() => { 
                if (collections.length > 0) {
                    setSelectedFolderId(collections[0].id);
                    setShowReqModal(true);
                }
            }} title="New Request"><span className="material-symbols-outlined">note_add</span></button>
            <button className={styles.iconBtn} onClick={() => setShowImport(true)} title="Import cURL"><span className="material-symbols-outlined">data_object</span></button>
          </div>
        </div>
        
        <div className={styles.collectionsList}>
          {collections.map(folder => (
            <div key={folder.id} className={styles.collectionFolder}>
              <div className={styles.folderHeader} onClick={() => toggleFolder(folder.id)}>
                <span className="material-symbols-outlined">{folder.isOpen ? "keyboard_arrow_down" : "chevron_right"}</span>
                {folder.name}
              </div>
              {folder.isOpen && (
                <div className={styles.folderItems}>
                  {folder.requests.map(req => (
                    <div 
                      key={req.id} 
                      className={`${styles.requestItem} ${req.id === activeReqId ? styles.active : ""}`}
                      onClick={() => loadRequest(req)}
                    >
                      <span className={`${styles.methodText} ${getMethodClass(req.method)}`}>{req.method}</span>
                      <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{req.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CENTER - MAIN CONTENT */}
      <div className={styles.mainContent}>
        
        <div className={styles.topBar}>
          <div className={styles.urlBar}>
            <select className={styles.methodSelect} value={method} onChange={e => setMethod(e.target.value)}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
            <input 
              className={styles.urlInput} 
              value={finalUrl} // Show final URL here to reflect params
              onChange={e => setUrl(e.target.value)}
              placeholder="https://api.example.com/endpoint"
            />
          </div>
          <button className={styles.sendBtn} onClick={handleSend} disabled={loading || !url}>
            {loading ? <span className="material-symbols-outlined" style={{animation: 'spin 1s linear infinite'}}>refresh</span> : null}
            Send
          </button>
          <button className={styles.saveBtn} onClick={handleSaveRequest}>Save</button>
        </div>

        {/* REQUEST PANE */}
        <div className={styles.requestPane}>
          <div className={styles.tabsHeader}>
            <div className={`${styles.tab} ${reqTab === 'params' ? styles.active : ''}`} onClick={() => setReqTab('params')}>Params</div>
            <div className={`${styles.tab} ${reqTab === 'headers' ? styles.active : ''}`} onClick={() => setReqTab('headers')}>Headers</div>
            <div className={`${styles.tab} ${reqTab === 'body' ? styles.active : ''}`} onClick={() => setReqTab('body')}>Body</div>
          </div>
          <div className={styles.paneContent}>
            
            {(reqTab === 'params' || reqTab === 'headers') && (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th className={styles.checkboxCell}></th>
                    <th>Key</th>
                    <th>Value</th>
                    <th>Description</th>
                    <th className={styles.actionCell}></th>
                  </tr>
                </thead>
                <tbody>
                  {(reqTab === 'params' ? params : headers).map((item, idx, arr) => (
                    <tr key={item.id}>
                      <td className={styles.checkboxCell}>
                        <input type="checkbox" checked={item.active} onChange={e => (reqTab==='params'?handleParamChange:handleHeaderChange)(item.id, 'active', e.target.checked)} />
                      </td>
                      <td>
                        <input placeholder="Key" value={item.key} onChange={e => (reqTab==='params'?handleParamChange:handleHeaderChange)(item.id, 'key', e.target.value)} />
                      </td>
                      <td>
                        <input placeholder="Value" value={item.value} onChange={e => (reqTab==='params'?handleParamChange:handleHeaderChange)(item.id, 'value', e.target.value)} />
                      </td>
                      <td>
                        <input placeholder="Description" value={item.description} onChange={e => (reqTab==='params'?handleParamChange:handleHeaderChange)(item.id, 'description', e.target.value)} />
                      </td>
                      <td className={styles.actionCell}>
                        <button className={styles.iconBtn} onClick={() => (reqTab==='params'?removeParam:removeHeader)(item.id)}><span className="material-symbols-outlined" style={{fontSize:'1rem'}}>close</span></button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td></td>
                    <td colSpan={4} style={{padding: '0.5rem 0'}}>
                      <button className={styles.iconBtn} onClick={reqTab === 'params' ? addParam : addHeader} style={{width:'auto', color:'#0e639c', padding:0}}>+ Add row</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
            
            {reqTab === 'body' && (
              <textarea 
                className={styles.bodyTextarea} 
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="{}"
              />
            )}
            
          </div>
        </div>

        <div className={styles.paneResizer}></div>

        {/* RESPONSE PANE */}
        <div className={styles.responsePane}>
          <div className={styles.tabsHeader}>
            <div className={`${styles.tab} ${resTab === 'body' ? styles.active : ''}`} onClick={() => setResTab('body')}>Body</div>
            <div className={`${styles.tab} ${resTab === 'headers' ? styles.active : ''}`} onClick={() => setResTab('headers')}>Headers</div>
            
            {response && (
              <div className={styles.responseStatus}>
                <div className={styles.statusItem}>
                  Status: <span className={`${styles.statusValue} ${response.status >= 200 && response.status < 300 ? styles.success : styles.error}`}>{response.status} {response.statusText}</span>
                </div>
                <div className={styles.statusItem}>Time: <span className={styles.statusValue}>{response.time} ms</span></div>
                <div className={styles.statusItem}>Size: <span className={styles.statusValue}>{(response.size / 1024).toFixed(2)} KB</span></div>
              </div>
            )}
          </div>
          
          <div className={styles.paneContent} style={{background: '#ffffff'}}>
            {!response && !loading && (
              <div className={`${styles.emptyState} ${styles.animatedFadeIn}`}>
                <span className={`material-symbols-outlined ${styles.emptyStateIcon}`}>api</span>
                <div className={styles.emptyStateTitle}>Ready to Test</div>
                <div className={styles.emptyStateDesc}>Enter an endpoint URL and hit Send to see the magic happen.</div>
              </div>
            )}
            
            {loading && (
              <div className={`${styles.loadingState} ${styles.animatedFadeIn}`}>
                <div className={styles.spinner}></div>
                <div>Fetching response...</div>
              </div>
            )}
            
            {response && resTab === 'body' && (
              typeof response.data === 'object' ? renderJson(response.data) : <pre className={styles.responseJson} style={{color: '#ce9178'}}>{response.data}</pre>
            )}
            
            {response && resTab === 'headers' && (
              <table className={styles.dataTable}>
                <tbody>
                  {Object.entries(response.headers).map(([k, v]) => (
                    <tr key={k}>
                      <td style={{width: '200px', padding: '0.5rem', fontWeight: 600, color: '#9cdcfe'}}>{k}</td>
                      <td style={{padding: '0.5rem', color: '#d4d4d4'}}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR - CODE SNIPPETS & ENV */}
      <div className={styles.rightSidebar}>
        
        {/* Environment section */}
        <div className={styles.envHeader}>
          <h2>Environment</h2>
          <div className={styles.envRow} style={{marginTop: '0.5rem'}}>
            <select className={styles.envSelect} value={activeEnvId} onChange={e => handleEnvChange(e.target.value)}>
              {environments.map(env => (
                <option key={env.id} value={env.id}>{env.name}</option>
              ))}
            </select>
            <button className={styles.iconBtn} onClick={() => setShowEnvModal(true)} title="Manage Environments">
              <span className="material-symbols-outlined">visibility</span>
            </button>
          </div>
        </div>

        <div className={styles.snippetHeader}>
          <h2>Code Snippet</h2>
          <select className={styles.snippetSelect} value={snippetLang} onChange={e => setSnippetLang(e.target.value as any)}>
            <option value="curl">cURL</option>
            <option value="dart">Dart - Dio</option>
            <option value="fetch">JS - Fetch</option>
          </select>
        </div>
        <pre className={styles.snippetPre}>
          {generateSnippet()}
        </pre>
      </div>

      {/* Modals */}
      {showImport && (
        <div className={styles.modalOverlay} onClick={() => setShowImport(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3>Import cURL / Dart</h3>
            <textarea 
              className={styles.modalTextarea} 
              value={curlInput} 
              onChange={e => setCurlInput(e.target.value)}
              placeholder="Paste your cURL or Dart Dio code here..."
            />
            <div className={styles.modalActions}>
              <button className={styles.saveBtn} onClick={() => setShowImport(false)}>Cancel</button>
              <button className={styles.sendBtn} onClick={handleParseCurl}>Import</button>
            </div>
          </div>
        </div>
      )}

      {showFolderModal && (
        <div className={styles.modalOverlay} onClick={() => setShowFolderModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3>New Folder</h3>
            <input 
              className={styles.urlInput} 
              style={{width:'100%', marginBottom:'1rem', border:'1px solid #d1d5db', padding:'0.5rem', borderRadius:'6px'}} 
              value={folderInput} 
              onChange={e => setFolderInput(e.target.value)}
              placeholder="Folder Name"
            />
            <div className={styles.modalActions}>
              <button className={styles.saveBtn} onClick={() => setShowFolderModal(false)}>Cancel</button>
              <button className={styles.sendBtn} onClick={handleAddFolder}>Create Folder</button>
            </div>
          </div>
        </div>
      )}

      {showReqModal && (
        <div className={styles.modalOverlay} onClick={() => setShowReqModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3>New Request</h3>
            <select 
              style={{width:'100%', marginBottom:'1rem', padding:'0.5rem', borderRadius:'6px', border:'1px solid #d1d5db'}}
              value={selectedFolderId}
              onChange={e => setSelectedFolderId(e.target.value)}
            >
              {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input 
              className={styles.urlInput} 
              style={{width:'100%', marginBottom:'1rem', border:'1px solid #d1d5db', padding:'0.5rem', borderRadius:'6px'}} 
              value={reqInput} 
              onChange={e => setReqInput(e.target.value)}
              placeholder="Request Name"
            />
            <div className={styles.modalActions}>
              <button className={styles.saveBtn} onClick={() => setShowReqModal(false)}>Cancel</button>
              <button className={styles.sendBtn} onClick={handleAddRequest}>Create Request</button>
            </div>
          </div>
        </div>
      )}

      {showEnvModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEnvModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{width: '600px'}}>
            <h3>Manage Environments</h3>
            
            <div style={{display:'flex', gap:'1rem', marginBottom:'1rem'}}>
              <div style={{flex: 1}}>
                <div style={{fontWeight:600, marginBottom:'0.5rem', fontSize:'0.85rem', color:'#4b5563'}}>Environments</div>
                <div style={{border:'1px solid #e5e7eb', borderRadius:'6px', height:'200px', overflowY:'auto'}}>
                  {environments.map(env => (
                    <div 
                      key={env.id} 
                      onClick={() => handleEnvChange(env.id)}
                      style={{
                        padding:'0.5rem 1rem', 
                        cursor:'pointer', 
                        borderBottom:'1px solid #f3f4f6',
                        background: activeEnvId === env.id ? '#e0e7ff' : '#ffffff',
                        color: activeEnvId === env.id ? '#4f46e5' : '#374151',
                        fontWeight: activeEnvId === env.id ? 600 : 400
                      }}
                    >
                      {env.name}
                    </div>
                  ))}
                  <div style={{padding:'0.5rem 1rem'}}>
                    <button 
                      className={styles.iconBtn} 
                      style={{width:'auto', color:'#0ea5e9'}}
                      onClick={() => {
                        const newEnv: Environment = { id: Date.now().toString(), name: "New Environment", variables: [] };
                        saveEnvironments([...environments, newEnv]);
                      }}
                    >+ Add Env</button>
                  </div>
                </div>
              </div>
              <div style={{flex: 2}}>
                <div style={{fontWeight:600, marginBottom:'0.5rem', fontSize:'0.85rem', color:'#4b5563'}}>Variables (for {environments.find(e => e.id === activeEnvId)?.name})</div>
                <div style={{border:'1px solid #e5e7eb', borderRadius:'6px', height:'200px', overflowY:'auto', background:'#f9fafb'}}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Key (e.g. baseurl)</th>
                        <th>Value</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {environments.find(e => e.id === activeEnvId)?.variables.map((v, i) => (
                        <tr key={v.id}>
                          <td>
                            <input 
                              value={v.key} 
                              onChange={e => {
                                const newEnvs = [...environments];
                                const active = newEnvs.find(ev => ev.id === activeEnvId);
                                if (active) active.variables[i].key = e.target.value;
                                saveEnvironments(newEnvs);
                              }}
                              placeholder="Key" 
                            />
                          </td>
                          <td>
                            <input 
                              value={v.value} 
                              onChange={e => {
                                const newEnvs = [...environments];
                                const active = newEnvs.find(ev => ev.id === activeEnvId);
                                if (active) active.variables[i].value = e.target.value;
                                saveEnvironments(newEnvs);
                              }}
                              placeholder="Value" 
                            />
                          </td>
                          <td>
                            <button className={styles.iconBtn} onClick={() => {
                                const newEnvs = [...environments];
                                const active = newEnvs.find(ev => ev.id === activeEnvId);
                                if (active) active.variables = active.variables.filter(v2 => v2.id !== v.id);
                                saveEnvironments(newEnvs);
                            }}><span className="material-symbols-outlined" style={{fontSize:'1rem'}}>close</span></button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={3} style={{padding: '0.5rem'}}>
                          <button className={styles.iconBtn} onClick={() => {
                            const newEnvs = [...environments];
                            const active = newEnvs.find(ev => ev.id === activeEnvId);
                            if (active) active.variables.push({ id: Date.now().toString(), key: "", value: "" });
                            saveEnvironments(newEnvs);
                          }} style={{width:'auto', color:'#0ea5e9'}}>+ Add Variable</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.sendBtn} onClick={() => setShowEnvModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
