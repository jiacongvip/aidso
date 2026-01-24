
import React from 'react';
import { Navbar } from '../components/Navbar';

type ViewState = 'landing' | 'results' | 'login' | 'pricing' | 'api' | 'monitoring';

export const ApiDocPage = ({ onNavigate }: { onNavigate: (page: ViewState) => void }) => {
    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col">
            <Navbar onNavigate={onNavigate} />
            <div className="flex-1 flex max-w-7xl mx-auto w-full pt-6 px-6 gap-8">
                {/* Sidebar */}
                <div className="w-64 hidden md:block sticky top-24 h-[calc(100vh-100px)]">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Documentation</div>
                    <ul className="space-y-1">
                        {['Introduction', 'Authentication', 'Rate Limits', 'Errors'].map((item) => (
                            <li key={item} className="px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer">{item}</li>
                        ))}
                    </ul>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-6 mb-4">Endpoints</div>
                    <ul className="space-y-1">
                        <li className="px-3 py-2 text-sm font-medium text-brand-purple bg-purple-50 rounded-lg cursor-pointer">POST /v1/search</li>
                        <li className="px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer">GET /v1/analysis</li>
                        <li className="px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer">GET /v1/trends</li>
                    </ul>
                </div>

                {/* Main Content */}
                <div className="flex-1 pb-20">
                    <div className="mb-10">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Search Endpoint</h1>
                        <p className="text-gray-600 leading-relaxed">
                            Perform a real-time GEO search across multiple AI engines including DeepSeek, Doubao, and WeChat. This endpoint returns aggregated results, DOM snapshots, and reasoning traces.
                        </p>
                    </div>

                    <div className="space-y-8">
                        {/* Request Section */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                                <span className="font-bold text-sm text-gray-700">Request</span>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-mono font-bold rounded">POST</span>
                                    <span className="text-xs font-mono text-gray-500">https://api.aigeo.com/v1/search</span>
                                </div>
                            </div>
                            <div className="p-6 bg-[#1e1e1e] overflow-x-auto">
                                <pre className="text-xs font-mono text-blue-300">
{`curl -X POST https://api.aigeo.com/v1/search \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "Best Mini Program Dev in Changzhou",
    "engines": ["deepseek", "doubao", "wechat"],
    "mode": "deep"
  }'`}
                                </pre>
                            </div>
                        </div>

                        {/* Response Section */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <span className="font-bold text-sm text-gray-700">Response</span>
                            </div>
                            <div className="p-6 bg-[#1e1e1e] overflow-x-auto h-96">
                                <pre className="text-xs font-mono text-green-300">
{`{
  "id": "req_882190",
  "status": "success",
  "data": {
    "summary": "Based on analysis from DeepSeek and Doubao...",
    "sources": [
      {
        "title": "2025 Top Dev Companies",
        "url": "https://...",
        "engine": "deepseek"
      }
    ],
    "geo_score": 92,
    "trace_log": [
      {
        "step": 1,
        "action": "identify_intent",
        "details": "User seeks service providers..."
      }
    ]
  }
}`}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
