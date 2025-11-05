'use client';

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '~/core/utils'

interface User {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
}

interface UserDropdownProps {
  user: User;
  onLogout: () => void;
}

export function UserDropdown({ user, onLogout }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 计算下拉菜单位置
  const calculatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollX = window.pageXOffset ?? document.documentElement.scrollLeft
      const scrollY = window.pageYOffset ?? document.documentElement.scrollTop
      
      setDropdownPosition({
        top: rect.bottom + scrollY + 8, // 8px gap
        left: rect.right + scrollX - 224 // 224px is dropdown width (w-56)
      });
    }
  }, []);

  // 点击外部关闭下拉菜单
  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Element;
    if (buttonRef.current?.contains(target)) {
      return;
    }
    if (dropdownRef.current?.contains(target)) {
      return;
    }
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', calculatePosition);
      window.addEventListener('resize', calculatePosition);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', calculatePosition);
      window.removeEventListener('resize', calculatePosition);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', calculatePosition);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isOpen, handleClickOutside, calculatePosition]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    
    // 触发自定义事件，通知所有组件更新登录状态
    window.dispatchEvent(new CustomEvent('loginStateChanged'));
    
    onLogout();
    setIsOpen(false);
  };

  return (
    <div className="relative" data-dropdown="user-dropdown">
      {/* 用户头像按钮 */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
          {user.avatar_url ? (
            <Image 
              src={user.avatar_url}
              alt={user.username}
              width={32}
              height={32}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            user.username.charAt(0).toUpperCase()
          )}
        </div>
        <span className="text-white text-sm font-medium hidden sm:block">
          {user.username}
        </span>
        <svg 
          className={cn(
            "w-4 h-4 text-white/60 transition-transform",
            isOpen && "rotate-180"
          )} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 - 使用Portal渲染到body */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          className="w-56 bg-white/95 backdrop-blur-md rounded-xl border border-gray-200 shadow-2xl user-dropdown"
          data-user-dropdown="true"
          role="menu"
          style={{ 
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            zIndex: 999999,
            pointerEvents: 'auto'
          }}
        >
          {/* 用户信息 */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                {user.avatar_url ? (
                  <Image 
                    src={user.avatar_url}
                    alt={user.username}
                    width={40}
                    height={40}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  user.username.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div className="text-gray-800 font-medium text-sm">{user.username}</div>
                <div className="text-gray-600 text-xs">{user.email}</div>
              </div>
            </div>
          </div>

          {/* 菜单项 */}
          <div className="py-2">
            {/* 个人中心 - 简化版本 */}
            <a
              href="/profile"
              className="w-full px-4 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center space-x-3 cursor-pointer block"
              onClick={(e) => {
                console.log('个人中心 Link onClick 被触发', e);
                e.preventDefault();
                setIsOpen(false);
                console.log('准备跳转到 /profile');
                window.location.href = '/profile';
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm">个人中心</span>
            </a>

            {/* 系统设置 - 简化版本 */}
            <a
              href="/settings"
              className="w-full px-4 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center space-x-3 cursor-pointer block"
              onClick={(e) => {
                console.log('系统设置 Link onClick 被触发', e);
                e.preventDefault();
                setIsOpen(false);
                console.log('准备跳转到 /settings');
                window.location.href = '/settings';
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm">系统设置</span>
            </a>

            <div className="border-t border-gray-200 my-2"></div>

            {/* 退出登录 - 简化版本 */}
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors flex items-center space-x-3 cursor-pointer"
              onClick={(e) => {
                console.log('退出登录 Button onClick 被触发', e);
                e.preventDefault();
                console.log('准备执行退出登录');
                handleLogout();
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm">退出登录</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}