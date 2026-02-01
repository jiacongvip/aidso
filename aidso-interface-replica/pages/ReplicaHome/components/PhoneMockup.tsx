import React from 'react';

const PhoneMockup: React.FC = () => {
  return (
    <div className="relative w-[300px] h-[580px] bg-gray-900 rounded-[3rem] border-8 border-gray-800 shadow-2xl overflow-hidden ml-auto mr-10 hidden lg:block transform rotate-0 hover:scale-[1.02] transition-transform duration-500">
      {/* Screen */}
      <div className="w-full h-full bg-black relative">
        {/* Notch Area */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20"></div>

        {/* Video Player */}
        <div className="w-full h-full relative group">
            <video 
                className="w-full h-full object-cover"
                autoPlay 
                loop 
                muted 
                playsInline
                poster="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000&auto=format&fit=crop"
            >
                {/* 这里的src可以替换为您自己的手机版视频链接 */}
                <source src="https://assets.mixkit.co/videos/preview/mixkit-futuristic-holographic-interface-993-large.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            
            {/* Optional: Simple Play overlay if video doesn't autoplay, or gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none"></div>
        </div>
      </div>

      {/* Side Buttons */}
      <div className="absolute -right-3 top-24 w-1 h-12 bg-gray-700 rounded-r-md"></div>
      <div className="absolute -right-3 top-40 w-1 h-12 bg-gray-700 rounded-r-md"></div>
    </div>
  );
};

export default PhoneMockup;