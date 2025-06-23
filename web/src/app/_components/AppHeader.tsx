'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    // 检查本地存储中的用户信息
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
      }
    }
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
        <h1 className="text-xl font-bold text-blue-600">FreeTOP</h1>
        
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/your-repo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            GitHub
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
