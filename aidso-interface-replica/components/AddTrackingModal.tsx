
import React, { useState } from 'react';
import { X, Trash2, Plus, Sparkles, FolderUp, PenTool } from 'lucide-react';

interface AddTrackingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddTrackingModal = ({ isOpen, onClose }: AddTrackingModalProps) => {
    const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
    const [rows, setRows] = useState([
        { link: '', title: '' },
        { link: '', title: '' },
        { link: '', title: '' },
        { link: '', title: '' },
        { link: '', title: '' },
    ]);

    if (!isOpen) return null;

    const handleAddRow = () => {
        setRows([...rows, { link: '', title: '' }]);
    };

    const handleDeleteRow = (index: number) => {
        const newRows = rows.filter((_, i) => i !== index);
        setRows(newRows);
    };

    const handleChange = (index: number, field: 'link' | 'title', value: string) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl animate-scale-in flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="text-center pt-8 pb-4 relative px-6">
                    <h2 className="text-xl font-bold text-gray-900">添加追踪作品</h2>
                    <p className="text-gray-400 text-xs mt-2">添加创作或推广作品标题和链接，自动监测文章在AI问题的收录情况</p>
                    <button onClick={onClose} className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-8 mb-6">
                    <div className="flex border border-gray-200 rounded-lg overflow-hidden p-1 bg-gray-50">
                        <button 
                            onClick={() => setActiveTab('manual')}
                            className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'manual' ? 'bg-[#7c3aed] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                        >
                            <PenTool size={16} /> 手动添加
                        </button>
                        <button 
                            onClick={() => setActiveTab('upload')}
                            className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'upload' ? 'bg-[#7c3aed] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                        >
                            <FolderUp size={16} /> 上传添加
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto px-8 pb-4 scrollbar-hide">
                    {activeTab === 'manual' ? (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* Table Header */}
                            <div className="flex bg-gray-50/80 border-b border-gray-200">
                                <div className="flex-1 py-3 pl-4 text-xs font-bold text-gray-600">
                                    <span className="text-red-500 mr-1">*</span>作品链接
                                </div>
                                <div className="flex-1 py-3 pl-4 text-xs font-bold text-gray-600 border-l border-gray-200">
                                    <span className="text-red-500 mr-1">*</span>作品标题
                                </div>
                                <div className="w-14"></div>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-gray-100 bg-white">
                                {rows.map((row, index) => (
                                    <div key={index} className="flex items-center group hover:bg-gray-50/50 transition-colors">
                                        <div className="flex-1 p-2">
                                            <input 
                                                type="text" 
                                                value={row.link}
                                                onChange={(e) => handleChange(index, 'link', e.target.value)}
                                                placeholder="请输入作品链接"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] focus:bg-white focus:ring-1 focus:ring-purple-100 transition-all placeholder-gray-400"
                                            />
                                        </div>
                                        <div className="flex-1 p-2 border-l border-gray-100">
                                            <input 
                                                type="text" 
                                                value={row.title}
                                                onChange={(e) => handleChange(index, 'title', e.target.value)}
                                                placeholder="请输入作品标题"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] focus:bg-white focus:ring-1 focus:ring-purple-100 transition-all placeholder-gray-400"
                                            />
                                        </div>
                                        <div className="w-14 flex items-center justify-center">
                                            <button 
                                                onClick={() => handleDeleteRow(index)}
                                                className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                         <div className="h-72 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-50/80 transition-colors cursor-pointer group">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                <FolderUp size={32} className="text-[#7c3aed]" />
                            </div>
                            <p className="text-sm text-gray-700 font-bold">点击或拖拽 Excel 文件到此处上传</p>
                            <p className="text-xs text-gray-400 mt-2">支持 .xlsx, .csv 格式，请确保包含标题和链接列</p>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="mt-4 flex items-center justify-between">
                         <div className="flex items-center gap-2 text-xs text-[#7c3aed] cursor-pointer hover:underline font-medium">
                            <Sparkles size={14} /> 使用AI通过作品链接解析标题
                        </div>
                        
                        {activeTab === 'manual' && (
                            <button 
                                onClick={handleAddRow}
                                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 border border-dashed border-gray-300 px-4 py-2 rounded-lg hover:border-[#7c3aed] hover:text-[#7c3aed] hover:bg-purple-50 transition-all bg-white"
                            >
                                <Plus size={14} /> 添加一行
                            </button>
                        )}
                    </div>
                </div>

                {/* Confirm Button Area */}
                <div className="p-6 text-center border-t border-gray-50 bg-gray-50/30">
                    <button 
                        onClick={onClose}
                        className="bg-[#7c3aed] text-white px-12 py-2.5 rounded-lg text-sm font-bold hover:bg-[#6d28d9] transition-all shadow-lg shadow-purple-200 active:scale-95"
                    >
                        确 认
                    </button>
                </div>
            </div>
        </div>
    );
};
