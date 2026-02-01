import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Crown } from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import { LogoIcon, BadgeDSO, BadgeGEO } from './Icons';

const Navbar: React.FC = () => {
  const navigate = useNavigate();

  const handleNav = (label: string) => {
    switch (label) {
      case '首页':
        navigate('/');
        break;
      case '实时搜索':
      case 'AI问题':
        navigate('/results');
        break;
      case '品牌诊断':
      case '品牌监测':
        navigate('/monitoring');
        break;
      default:
        break;
    }
  };

  return (
    <nav className="w-full h-[60px] bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-8 fixed top-0 z-50 shadow-sm">
      {/* Left: Logo & Nav */}
      <div className="flex items-center gap-8">
        <div className="flex items-center cursor-pointer" onClick={() => handleNav('首页')}>
          <LogoIcon />
          <div className="flex items-center ml-[-10px] mb-2">
            <BadgeDSO />
            <BadgeGEO />
          </div>
        </div>
        
        <div className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              onClick={(e) => { e.preventDefault(); handleNav(item.label); }}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                item.active 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      {/* Right: Search & Actions */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="hidden md:flex items-center bg-gray-100 rounded-full pl-4 pr-1 py-1 w-[300px]">
          <span className="text-xs text-gray-500 font-medium bg-gray-200 px-2 py-0.5 rounded text-nowrap mr-2">
            All问题
          </span>
          <input 
            type="text" 
            placeholder="向AI咨询的问题"
            className="bg-transparent text-sm outline-none text-gray-700 w-full placeholder-gray-400"
          />
          <button
            className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white hover:bg-purple-700 transition-colors"
            onClick={() => handleNav('实时搜索')}
          >
            <Search size={16} />
          </button>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-1 bg-[#3f3b35] text-[#ebdcb0] px-3 py-1.5 rounded-full text-xs font-bold hover:opacity-90"
            onClick={() => navigate('/pricing')}
          >
             <Crown size={14} fill="#ebdcb0" />
             <span>会员特权</span>
          </button>
          
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <span>6931</span>
          </div>

          <button className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200" onClick={() => handleNav('品牌诊断')}>
            <User size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
