"use client";

import { useState } from "react";

export default function TestAPIPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult("Testing connection...\n\n");
    
    const baseURL = "http://localhost:5000";
    
    try {
      // Test 0: Use Next.js API route as proxy (bypasses CORS)
      setResult(prev => prev + "0. Testing via Next.js API proxy (bypasses CORS)...\n");
      try {
        const proxyRes = await fetch("/api/test-backend");
        const proxyData = await proxyRes.json();
        if (proxyData.success) {
          setResult(prev => prev + `   ✅ Proxy test SUCCESS: Backend is reachable!\n`);
          setResult(prev => prev + `   Health: ${JSON.stringify(proxyData.health)}\n`);
          setResult(prev => prev + `   API Test: ${JSON.stringify(proxyData.apiTest)}\n`);
        } else {
          setResult(prev => prev + `   ❌ Proxy test failed: ${proxyData.message}\n`);
        }
      } catch (e: any) {
        setResult(prev => prev + `   ❌ Proxy error: ${e.message}\n`);
      }
      
      // Test 1: Direct health endpoint (with cache bypass)
      setResult(prev => prev + "\n1. Testing direct /health endpoint...\n");
      try {
        const healthRes = await fetch(`${baseURL}/health?t=${Date.now()}`, {
          method: "GET",
          mode: "cors",
          credentials: "include",
          cache: "no-cache",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setResult(prev => prev + `   ✅ Health check: ${JSON.stringify(healthData)}\n`);
          // Check CORS headers
          const corsOrigin = healthRes.headers.get("Access-Control-Allow-Origin");
          const corsCreds = healthRes.headers.get("Access-Control-Allow-Credentials");
          setResult(prev => prev + `   CORS Headers - Origin: ${corsOrigin}, Credentials: ${corsCreds}\n`);
        } else {
          setResult(prev => prev + `   ⚠️ Health check failed: ${healthRes.status} ${healthRes.statusText}\n`);
        }
      } catch (e: any) {
        setResult(prev => prev + `   ❌ Health check error: ${e.message}\n`);
        setResult(prev => prev + `   Error type: ${e.name}\n`);
        setResult(prev => prev + `   This suggests a CORS or network issue.\n`);
        setResult(prev => prev + `   💡 Try: Clear browser cache, disable extensions, or check browser console\n`);
      }
      
      // Test 2: API test endpoint (with cache bypass)
      setResult(prev => prev + "\n2. Testing /api/test endpoint...\n");
      try {
        const testRes = await fetch(`${baseURL}/api/test?t=${Date.now()}`, {
          method: "GET",
          mode: "cors",
          credentials: "include",
          cache: "no-cache",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        });
        if (testRes.ok) {
          const testData = await testRes.json();
          setResult(prev => prev + `   ✅ API test: ${JSON.stringify(testData)}\n`);
          
          // Test 3: CORS headers
          setResult(prev => prev + "\n3. Checking CORS headers...\n");
          const corsHeaders = {
            "Access-Control-Allow-Origin": testRes.headers.get("Access-Control-Allow-Origin"),
            "Access-Control-Allow-Credentials": testRes.headers.get("Access-Control-Allow-Credentials"),
            "Access-Control-Allow-Methods": testRes.headers.get("Access-Control-Allow-Methods"),
          };
          setResult(prev => prev + `   ✅ CORS headers: ${JSON.stringify(corsHeaders, null, 2)}\n`);
        } else {
          setResult(prev => prev + `   ⚠️ API test failed: ${testRes.status} ${testRes.statusText}\n`);
        }
      } catch (e: any) {
        setResult(prev => prev + `   ❌ API test error: ${e.message}\n`);
        setResult(prev => prev + `   Error name: ${e.name}\n`);
        if (e.cause) {
          setResult(prev => prev + `   Error cause: ${JSON.stringify(e.cause)}\n`);
        }
      }
      
      // Test 3: CORS diagnostic endpoint
      setResult(prev => prev + "\n4. Testing CORS diagnostic endpoint...\n");
      try {
        const corsTestRes = await fetch(`${baseURL}/api/cors-test`, {
          method: "GET",
          mode: "cors",
          credentials: "include",
        });
        if (corsTestRes.ok) {
          const corsTestData = await corsTestRes.json();
          setResult(prev => prev + `   ✅ CORS diagnostic: ${JSON.stringify(corsTestData, null, 2)}\n`);
        } else {
          setResult(prev => prev + `   ⚠️ CORS diagnostic failed: ${corsTestRes.status}\n`);
        }
      } catch (e: any) {
        setResult(prev => prev + `   ❌ CORS diagnostic error: ${e.message}\n`);
      }
      
      setResult(prev => prev + "\n✅ Tests completed. Check results above.\n");
      setResult(prev => prev + "\n💡 If proxy test works but direct tests fail, it's a CORS issue.\n");
      setResult(prev => prev + "💡 If all tests fail, the backend might not be running.\n");
    } catch (error: any) {
      setResult(prev => prev + `\n❌ Unexpected error: ${error.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">API Connection Test</h1>
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="font-semibold mb-2">⚠️ If direct tests fail, try:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Open browser DevTools (F12) → Network tab → Check failed requests</li>
            <li>Clear browser cache: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)</li>
            <li>Try incognito/private browsing mode</li>
            <li>Disable browser extensions (especially ad blockers or privacy tools)</li>
            <li>Test with direct HTML file: <a href="/test-cors.html" className="text-blue-600 underline" target="_blank">/test-cors.html</a></li>
          </ul>
        </div>
        <button
          onClick={testConnection}
          disabled={loading}
          className="px-6 py-3 bg-cyan-500 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? "Testing..." : "Test Connection"}
        </button>
        <pre className="mt-4 p-4 bg-gray-900 text-green-400 rounded-lg overflow-auto">
          {result || "Click 'Test Connection' to check backend connectivity"}
        </pre>
      </div>
    </div>
  );
}
