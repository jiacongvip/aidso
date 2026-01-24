
import React from 'react';

export const BrandMonitoringSkeleton = () => {
  return (
    <div className="flex-1 lg:ml-64 p-6 overflow-y-auto animate-pulse">
      {/* Header Controls Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-9 w-32 bg-gray-200 rounded-lg"></div>
          <div className="h-9 w-32 bg-gray-200 rounded-lg"></div>
          <div className="h-9 w-32 bg-gray-200 rounded-lg"></div>
          <div className="h-9 w-56 bg-gray-200 rounded-lg"></div>
        </div>
      </div>

      {/* Top Metrics Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[140px]">
            <div className="h-3 w-24 bg-gray-100 rounded mb-4"></div>
            <div className="h-10 w-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* Monitoring Status Skeleton */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-4 w-16 bg-gray-300 rounded"></div>
        <div className="h-3 w-3 bg-gray-200 rounded-full"></div>
        <div className="h-3 w-32 bg-gray-100 rounded"></div>
        <div className="h-3 w-px bg-gray-200"></div>
        <div className="h-3 w-32 bg-gray-100 rounded"></div>
        <div className="h-3 w-px bg-gray-200"></div>
        <div className="h-3 w-32 bg-gray-100 rounded"></div>
      </div>

      {/* Platform Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-gray-200"></div>
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-4">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex justify-between items-center">
                  <div className="h-3 w-20 bg-gray-100 rounded"></div>
                  <div className="h-3 w-12 bg-gray-100 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Details Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 min-h-[350px] flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <div className="h-5 w-32 bg-gray-200 rounded"></div>
                {i === 3 && <div className="h-6 w-24 bg-gray-100 rounded"></div>}
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-50">
                <div className="w-32 h-32 bg-gray-50 rounded-2xl rotate-3"></div>
                <div className="h-3 w-40 bg-gray-100 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
