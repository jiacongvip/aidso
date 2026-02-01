import React from 'react';
import { BookOpen, Headset, MessageSquare } from 'lucide-react';

const FloatingSidebar: React.FC = () => {
  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col gap-0 bg-white rounded-l-2xl shadow-lg border border-gray-100 overflow-hidden">
      
      <button className="flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 group">
        <BookOpen size={20} className="text-gray-600 group-hover:text-purple-600 mb-1" />
        <span className="text-xs text-gray-500 group-hover:text-purple-600">帮助</span>
      </button>

      <button className="flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 group">
        <Headset size={20} className="text-gray-600 group-hover:text-purple-600 mb-1" />
        <span className="text-xs text-gray-500 group-hover:text-purple-600">客服</span>
      </button>

      <button className="flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-colors group">
        <MessageSquare size={20} className="text-gray-600 group-hover:text-purple-600 mb-1" />
        <span className="text-xs text-gray-500 group-hover:text-purple-600 text-nowrap">公众号</span>
      </button>

    </div>
  );
};

export default FloatingSidebar;