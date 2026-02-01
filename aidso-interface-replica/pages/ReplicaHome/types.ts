import React from 'react';

export interface Platform {
  id: string;
  name: string;
  type: 'Web' | 'App'; // '网页版' or '手机版'
  iconColor: string;
  iconLetter: string;
}

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}