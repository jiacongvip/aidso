import React from 'react';
import { Platform, NavItem } from './types';

export const PLATFORMS: Platform[] = [
  { id: 'doubao-web', name: '豆包', type: 'Web', iconColor: 'bg-blue-500', iconLetter: 'D' },
  { id: 'doubao-app', name: '豆包', type: 'App', iconColor: 'bg-blue-500', iconLetter: 'D' },
  { id: 'deepseek-web', name: 'DeepSeek', type: 'Web', iconColor: 'bg-blue-600', iconLetter: 'DS' },
  { id: 'deepseek-app', name: 'DeepSeek', type: 'App', iconColor: 'bg-blue-600', iconLetter: 'DS' },
  { id: 'yuanbao-web', name: '腾讯元宝', type: 'Web', iconColor: 'bg-green-500', iconLetter: 'T' },
  { id: 'qianwen-web', name: '千问', type: 'Web', iconColor: 'bg-purple-600', iconLetter: 'Q' },
  { id: 'baidu-web', name: '百度AI', type: 'Web', iconColor: 'bg-blue-400', iconLetter: 'B' },
  { id: 'wenxin-web', name: '文心', type: 'Web', iconColor: 'bg-blue-500', iconLetter: 'W' },
  { id: 'kimi-web', name: 'Kimi', type: 'Web', iconColor: 'bg-gray-800', iconLetter: 'K' },
  { id: 'douyin-web', name: 'AI抖音', type: 'Web', iconColor: 'bg-black', iconLetter: 'dy' },
];

export const NAV_ITEMS: NavItem[] = [
  { label: '首页', href: '#', active: true },
  { label: '实时搜索', href: '#' },
  { label: '品牌诊断', href: '#' },
  { label: '品牌监测', href: '#' },
];
