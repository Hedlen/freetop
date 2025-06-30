/**
 * 配置迁移对话框组件
 * 在用户登录时提示是否将本地配置迁移到云端
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Cloud, HardDrive, ArrowRight, Info } from 'lucide-react';
import { InputConfig } from '~/core/utils/config';

interface ConfigMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localConfig: InputConfig;
  cloudConfig: InputConfig;
  onMigrate: () => Promise<void>;
  onSkip: () => void;
}

export function ConfigMigrationDialog({
  open,
  onOpenChange,
  localConfig,
  cloudConfig,
  onMigrate,
  onSkip
}: ConfigMigrationDialogProps) {
  const [migrating, setMigrating] = useState(false);

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      await onMigrate();
      onOpenChange(false);
    } catch (error) {
      console.error('Migration failed:', error);
    } finally {
      setMigrating(false);
    }
  };

  const handleSkip = () => {
    onSkip();
    onOpenChange(false);
  };

  const hasLocalConfig = localConfig.deepThinkingMode || localConfig.searchBeforePlanning;
  const hasCloudConfig = cloudConfig.deepThinkingMode || cloudConfig.searchBeforePlanning;
  const configsDiffer = 
    localConfig.deepThinkingMode !== cloudConfig.deepThinkingMode ||
    localConfig.searchBeforePlanning !== cloudConfig.searchBeforePlanning;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Cloud className="h-5 w-5" />
            <span>配置同步</span>
          </DialogTitle>
          <DialogDescription>
            检测到您有本地配置，是否要同步到云端？
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 配置对比 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-gray-600" />
                <span className="font-medium">本地配置</span>
              </div>
              <div className="flex space-x-2">
                <Badge variant={localConfig.deepThinkingMode ? 'default' : 'outline'}>
                  深度思考: {localConfig.deepThinkingMode ? '开启' : '关闭'}
                </Badge>
                <Badge variant={localConfig.searchBeforePlanning ? 'default' : 'outline'}>
                  搜索规划: {localConfig.searchBeforePlanning ? '开启' : '关闭'}
                </Badge>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Cloud className="h-4 w-4 text-blue-600" />
                <span className="font-medium">云端配置</span>
              </div>
              <div className="flex space-x-2">
                <Badge variant={cloudConfig.deepThinkingMode ? 'default' : 'outline'}>
                  深度思考: {cloudConfig.deepThinkingMode ? '开启' : '关闭'}
                </Badge>
                <Badge variant={cloudConfig.searchBeforePlanning ? 'default' : 'outline'}>
                  搜索规划: {cloudConfig.searchBeforePlanning ? '开启' : '关闭'}
                </Badge>
              </div>
            </div>
          </div>

          {/* 提示信息 */}
          {!hasLocalConfig && !hasCloudConfig && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                本地和云端都没有自定义配置，将使用默认设置。
              </AlertDescription>
            </Alert>
          )}

          {hasLocalConfig && !hasCloudConfig && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                将本地配置上传到云端，以便在其他设备上使用。
              </AlertDescription>
            </Alert>
          )}

          {!hasLocalConfig && hasCloudConfig && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                云端已有配置，将自动应用到当前设备。
              </AlertDescription>
            </Alert>
          )}

          {hasLocalConfig && hasCloudConfig && configsDiffer && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                本地和云端配置不同，选择"迁移"将用本地配置覆盖云端配置。
              </AlertDescription>
            </Alert>
          )}

          {hasLocalConfig && hasCloudConfig && !configsDiffer && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                本地和云端配置已同步，无需额外操作。
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleSkip}
            disabled={migrating}
          >
            {hasCloudConfig ? '使用云端配置' : '跳过'}
          </Button>
          
          {hasLocalConfig && (
            <Button 
              onClick={handleMigrate}
              disabled={migrating}
              className="flex items-center space-x-2"
            >
              {migrating && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />}
              <span>{migrating ? '迁移中...' : '迁移到云端'}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfigMigrationDialog;