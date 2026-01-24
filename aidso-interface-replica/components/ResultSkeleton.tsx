
import React from 'react';

export const ResultSkeleton = () => (
    <div className="w-full max-w-5xl mx-auto mt-6 bg-white rounded-2xl shadow-card ring-1 ring-black/5 p-6 animate-pulse">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="space-y-4 w-full md:w-auto">
                <div className="h-7 w-3/4 md:w-96 bg-gray-100 rounded-lg"></div>
                <div className="flex gap-3">
                    <div className="h-8 w-24 bg-gray-50 rounded-full border border-gray-100"></div>
                    <div className="h-8 w-24 bg-gray-50 rounded-full border border-gray-100"></div>
                </div>
            </div>
            <div className="flex gap-0 border-l border-gray-100 pl-4 hidden md:flex">
                 <div className="px-6 space-y-2">
                     <div className="h-6 w-12 bg-gray-100 rounded mx-auto"></div>
                     <div className="h-3 w-10 bg-gray-50 rounded mx-auto"></div>
                 </div>
                 <div className="px-6 space-y-2 border-l border-gray-100">
                     <div className="h-6 w-12 bg-gray-100 rounded mx-auto"></div>
                     <div className="h-3 w-10 bg-gray-50 rounded mx-auto"></div>
                 </div>
                 <div className="px-6 space-y-2 border-l border-gray-100">
                     <div className="h-6 w-12 bg-gray-100 rounded mx-auto"></div>
                     <div className="h-3 w-10 bg-gray-50 rounded mx-auto"></div>
                 </div>
            </div>
        </div>
        <div className="space-y-0">
             <div className="bg-gray-50 px-6 py-3 grid grid-cols-12 gap-4 border-y border-gray-100 mb-2">
                 <div className="col-span-2 h-4 bg-gray-200 rounded w-20"></div>
                 <div className="col-span-2 h-4 bg-gray-200 rounded w-20 mx-auto hidden md:block"></div>
                 <div className="col-span-2 h-4 bg-gray-200 rounded w-20 mx-auto hidden md:block"></div>
                 <div className="col-span-3 h-4 bg-gray-200 rounded w-24 hidden md:block"></div>
                 <div className="col-span-3 h-4 bg-gray-200 rounded w-24 ml-auto"></div>
             </div>
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="px-6 py-4 grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-6 md:col-span-2 flex items-center gap-3">
                        <div className="h-8 w-8 bg-gray-100 rounded-full flex-shrink-0"></div>
                        <div className="h-4 w-24 bg-gray-100 rounded"></div>
                    </div>
                    <div className="hidden md:block col-span-2">
                        <div className="h-4 w-12 bg-gray-50 rounded mx-auto"></div>
                    </div>
                    <div className="hidden md:block col-span-2">
                         <div className="h-4 w-8 bg-gray-50 rounded mx-auto"></div>
                    </div>
                    <div className="hidden md:block col-span-3">
                        <div className="flex gap-2">
                             <div className="h-5 w-16 bg-gray-50 rounded"></div>
                             <div className="h-5 w-16 bg-gray-50 rounded"></div>
                        </div>
                    </div>
                    <div className="col-span-6 md:col-span-3">
                        <div className="h-4 w-full bg-gray-50 rounded"></div>
                    </div>
                </div>
            ))}
        </div>
        <div className="mt-4 flex justify-center">
            <div className="h-3 w-32 bg-gray-100 rounded"></div>
        </div>
    </div>
);
