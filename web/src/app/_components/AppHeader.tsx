'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserDropdown } from './UserDropdown';
import { LoginModal } from './LoginModal';

interface User {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
}

export function AppHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 检查本地存储中的用户信息
    const checkLoginStatus = () => {
      const token = localStorage.getItem('auth_token');
      const userInfo = localStorage.getItem('user_info');
      
      if (token && userInfo) {
        try {
          const parsedUser = JSON.parse(userInfo);
          setUser(parsedUser);
        } catch (error) {
          console.error('Failed to parse user info:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_info');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };
    
    checkLoginStatus();
    
    // 监听storage变化，确保与其他组件状态同步
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'user_info') {
        checkLoginStatus();
      }
    };
    
    // 监听自定义事件，用于同一页面内的状态同步
    const handleLoginStateChange = () => {
      checkLoginStatus();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('loginStateChanged', handleLoginStateChange);
    
    return () => {
       window.removeEventListener('storage', handleStorageChange);
       window.removeEventListener('loginStateChanged', handleLoginStateChange);
     };
   }, []);

  const handleLogin = (username: string, password: string) => {
    // 登录成功后，用户信息已在LoginModal中保存到localStorage
    // 这里重新读取用户信息
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        const parsedUser = JSON.parse(userInfo);
        setUser(parsedUser);
        return true;
      } catch (error) {
        console.error('Failed to parse user info:', error);
        return false;
      }
    }
    return false;
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <>
      <header className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <h1 
          className="text-xl font-bold text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
          onClick={() => router.push('/')}
        >
          FreeTOP
        </h1>
        
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/Hedlen/freetop"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-800 transition-colors"
            title="GitHub"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          
          {user ? (
            <UserDropdown user={user} onLogout={handleLogout} />
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium shadow-md"
            >
              登录
            </button>
          )}
        </div>
      </header>
      
      <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
          onLoginSuccess={(userData) => {
            setUser(userData);
            setShowLoginModal(false);
          }}
        />
    </>
  );
}
