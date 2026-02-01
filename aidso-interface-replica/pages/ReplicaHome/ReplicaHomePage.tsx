import React from 'react';
import Navbar from './components/Navbar';
import SearchCard from './components/SearchCard';
import PhoneMockup from './components/PhoneMockup';
import Features from './components/Features';
import FloatingSidebar from './components/FloatingSidebar';
import BrandRanking from './components/BrandRanking';
import CitationTrends from './components/CitationTrends';
import WhatIsGeo from './components/WhatIsGeo';
import WhyGeo from './components/WhyGeo';
import GeoPrinciples from './components/GeoPrinciples';
import GeoServices from './components/GeoServices';

export const ReplicaHomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <main className="flex-grow pt-[60px]">
        <div className="relative w-full overflow-hidden bg-gradient-to-br from-[#dbeafe] via-[#e0e7ff] to-[#f3e8ff] min-h-[600px] flex items-center justify-center">
            
            {/* Background blurred shapes to mimic the reference soft gradient */}
            <div className="absolute top-0 left-0 w-full h-full z-0">
                 <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[80%] bg-blue-200 rounded-full blur-[100px] opacity-40"></div>
                 <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[80%] bg-purple-200 rounded-full blur-[100px] opacity-40"></div>
            </div>

            <div className="container mx-auto px-4 z-10 flex flex-col items-center lg:flex-row lg:justify-between h-full py-12">
                
                {/* Left Side: Headline & Search */}
                <div className="flex flex-col items-center lg:items-start w-full lg:w-[70%] lg:pl-16">
                    <h1 className="text-3xl md:text-4xl lg:text-[40px] font-extrabold mb-8 text-gray-800 tracking-tight text-center lg:text-left">
                        让 <span className="text-purple-600 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">品牌/商品/服务</span> 直接成为 <span className="text-purple-600">AI答案</span>
                    </h1>
                    
                    <SearchCard />
                </div>

                {/* Right Side: Phone Visual */}
                <div className="w-full lg:w-[30%] flex justify-center lg:justify-end mt-12 lg:mt-0">
                    <PhoneMockup />
                </div>
            </div>
        </div>

        <Features />
        
        <BrandRanking />

        <CitationTrends />
        
        <WhatIsGeo />

        <WhyGeo />

        <GeoPrinciples />

        <GeoServices />
      </main>

      <FloatingSidebar />
    </div>
  );
};
