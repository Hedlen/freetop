"use client";

import { ArrowRightIcon, SparklesIcon, BoltIcon, GlobeAltIcon, CodeBracketIcon, RocketLaunchIcon, CpuChipIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const [isClient, setIsClient] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsClient(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-96 h-96 bg-blue-400/10 rounded-full blur-3xl transition-transform duration-1000 ease-out"
          style={{
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`,
            left: '10%',
            top: '20%'
          }}
        />
        <div 
          className="absolute w-80 h-80 bg-purple-400/10 rounded-full blur-3xl transition-transform duration-1000 ease-out"
          style={{
            transform: `translate(${mousePosition.x * -0.015}px, ${mousePosition.y * -0.015}px)`,
            right: '10%',
            bottom: '20%'
          }}
        />
        <div 
          className="absolute w-64 h-64 bg-green-400/10 rounded-full blur-3xl transition-transform duration-1000 ease-out"
          style={{
            transform: `translate(${mousePosition.x * 0.01}px, ${mousePosition.y * 0.01}px)`,
            left: '60%',
            top: '60%'
          }}
        />
      </div>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative z-10">
        <div className="max-w-6xl mx-auto text-center">
          {/* Logo and Title */}
          <div className="mb-12">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-2xl">
                <CpuChipIcon className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-7xl md:text-8xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-6 leading-tight">
              Free<span className="text-blue-600">Top</span>
            </h1>
            <p className="text-2xl md:text-3xl text-gray-700 mb-8 font-light">
              🚀 多智能体协同的AI自动化框架
            </p>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
              基于开源社区的卓越工作构建，为您提供强大的 AI 驱动自动化解决方案。
              <br className="hidden md:block" />
              让人工智能成为您工作流程中最得力的助手。
            </p>
          </div>

          {/* CTA Button */}
          <div className="mb-20">
            <Link
              href="/chat"
              className="group inline-flex items-center px-12 py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
            >
              <RocketLaunchIcon className="mr-3 w-6 h-6 group-hover:animate-pulse" />
              开始 AI 对话
              <ArrowRightIcon className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-sm text-gray-500 mt-4">免费体验 • 无需注册 • 即刻开始</p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            <div className="group text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-6 transition-transform shadow-lg">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">🧠 智能自动化</h3>
              <p className="text-gray-600 leading-relaxed">基于先进 AI 模型的智能决策系统，自动化复杂工作流程</p>
            </div>

            <div className="group text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-6 transition-transform shadow-lg">
                <BoltIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">⚡ 极速响应</h3>
              <p className="text-gray-600 leading-relaxed">优化的分布式架构，毫秒级响应，处理大规模并发请求</p>
            </div>

            <div className="group text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-6 transition-transform shadow-lg">
                <GlobeAltIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">🌍 开源生态</h3>
              <p className="text-gray-600 leading-relaxed">来自全球开发者社区驱动，持续创新，共建 AI 未来</p>
            </div>

            <div className="group text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-6 transition-transform shadow-lg">
                <CodeBracketIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">🔧 简单集成</h3>
              <p className="text-gray-600 leading-relaxed">基于 RESTful API 设计，5分钟快速集成</p>
            </div>
          </div>

          {/* Additional Info Section */}
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-6">
                为什么选择 FreeTop？
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                我们致力于打造最先进、最易用的 AI 自动化平台
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 mb-16">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-3xl border border-blue-100">
                <div className="flex items-center mb-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <h3 className="text-xl font-bold text-gray-800">🌟 社区驱动创新</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  汇聚全球开发者智慧，基于开源社区的集体力量，持续推动技术边界，确保平台始终保持行业领先地位。
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-3xl border border-green-100">
                <div className="flex items-center mb-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <h3 className="text-xl font-bold text-gray-800">🤖 前沿 AI 技术</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  集成最新的大语言模型和智能体算法，提供智能化的决策支持和自动化执行能力，让 AI 真正为您工作。
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-8 rounded-3xl border border-purple-100">
                <div className="flex items-center mb-4">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                  <h3 className="text-xl font-bold text-gray-800">🎯 极简用户体验</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  精心设计的直观界面，将复杂的 AI 技术包装成简单易用的工具，让每个人都能轻松驾驭人工智能的力量。
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-8 rounded-3xl border border-orange-100">
                <div className="flex items-center mb-4">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                  <h3 className="text-xl font-bold text-gray-800">🔧 无限扩展可能</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  模块化的系统架构为未来扩展打下基础，我们正在持续开发更多功能，未来将支持更丰富的使用场景。
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-gradient-to-r from-gray-900 to-gray-800 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">FreeTop</h3>
              <p className="text-gray-300">让 AI 成为您最得力的助手</p>
            </div>
            <div className="border-t border-gray-700 pt-6">
              <p className="text-gray-400">
                © 2025 FreeTop. 基于开源社区构建 • 致力于推动 AI 自动化技术发展
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Built with ❤️ by the open source community
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}