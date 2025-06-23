'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '~/core/utils';

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
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    onLogout();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 用户头像按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.username}
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

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-xl border border-gray-200 shadow-2xl z-50">
          {/* 用户信息 */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.username}
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
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/profile');
              }}
              className="w-full px-4 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center space-x-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm">个人中心</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/settings');
              }}
              className="w-full px-4 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center space-x-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm">系统设置</span>
            </button>

            <div className="border-t border-gray-200 my-2"></div>

            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors flex items-center space-x-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm">退出登录</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}