import React from 'react';
import { LogoIcon } from './Icons';

const PromoBanner: React.FC = () => {
  return (
    <div className="w-full bg-[#fff1e6] py-3 px-6 flex items-center justify-center gap-6 relative overflow-hidden">
        {/* Subtle decorative background circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-100/50 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-2 relative z-10 scale-75 origin-right md:scale-90">
             <LogoIcon />
        </div>
        
        <div className="text-sm md:text-base text-purple-900 font-medium relative z-10">
            会员限时优惠价，低至126元/月
        </div>

        <button className="relative z-10 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs md:text-sm px-6 py-1.5 rounded-full shadow-md transition-colors">
            查看详情
        </button>
        
        {/* Black blob at bottom (from reference image) */}
         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-32 h-16 bg-black rounded-[100%]">
             <div className="text-white text-[8px] text-center pt-2 tracking-widest">......</div>
         </div>
    </div>
  );
};

export default PromoBanner;