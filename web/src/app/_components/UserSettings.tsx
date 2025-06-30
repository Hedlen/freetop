/**
 * 用户设置页面组件
 * 提供配置管理、账户信息和数据同步功能
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { useInputConfig } from '~/core/hooks/useInputConfig';
import { useAuth } from '~/core/hooks/useAuth';
import { AlertCircle, Cloud, CloudOff, RefreshCw, Settings, User } from 'lucide-react';
import { Alert, AlertDescription } from '~/components/ui/alert';

export function UserSettings() {
  const { 
    config, 
    loading, 
    syncing, 
    toggleDeepThinking, 
    toggleSearchPlanning, 
    resetConfig,
    reload 
  } = useInputConfig();
  
  const { user, isLoggedIn, logout } = useAuth();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">用户设置</h1>
      </div>

      {/* 账户信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>账户信息</span>
          </CardTitle>
          <CardDescription>
            管理您的账户和登录状态
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoggedIn ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">已登录用户</p>
                  <p className="text-sm text-gray-500">{user?.email || '用户'}</p>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Cloud className="h-3 w-3 mr-1" />
                  云端同步
                </Badge>
              </div>
              <Button variant="outline" onClick={logout}>
                退出登录
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">访客模式</p>
                  <p className="text-sm text-gray-500">配置仅保存在本地</p>
                </div>
                <Badge variant="outline" className="text-gray-600">
                  <CloudOff className="h-3 w-3 mr-1" />
                  本地存储
                </Badge>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  登录后可享受云端配置同步，在不同设备间保持一致的使用体验。
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 输入配置 */}
      <Card>
        <CardHeader>
          <CardTitle>输入配置</CardTitle>
          <CardDescription>
            自定义您的输入行为和功能偏好
            {syncing && (
              <span className="inline-flex items-center ml-2 text-blue-600">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                同步中...
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="deep-thinking" className="text-base font-medium">
                  深度思考模式
                </Label>
                <p className="text-sm text-gray-500">
                  启用后，AI将进行更深入的分析和推理
                </p>
              </div>
              <Switch
                id="deep-thinking"
                checked={config.deepThinkingMode}
                onCheckedChange={toggleDeepThinking}
                disabled={loading}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="search-planning" className="text-base font-medium">
                  搜索优先规划
                </Label>
                <p className="text-sm text-gray-500">
                  在制定计划前先进行相关信息搜索
                </p>
              </div>
              <Switch
                id="search-planning"
                checked={config.searchBeforePlanning}
                onCheckedChange={toggleSearchPlanning}
                disabled={loading}
              />
            </div>
          </div>

          <Separator />

          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={reload}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>重新加载配置</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={resetConfig}
              disabled={loading || syncing}
            >
              重置为默认
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 数据同步状态 */}
      {isLoggedIn && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Cloud className="h-5 w-5" />
              <span>数据同步</span>
            </CardTitle>
            <CardDescription>
              您的配置会自动同步到云端
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">同步状态</p>
                <p className="text-sm text-gray-500">
                  {syncing ? '正在同步...' : '已同步'}
                </p>
              </div>
              <Badge 
                variant={syncing ? 'default' : 'outline'} 
                className={syncing ? 'text-blue-600 border-blue-600' : 'text-green-600 border-green-600'}
              >
                {syncing ? '同步中' : '已同步'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default UserSettings;