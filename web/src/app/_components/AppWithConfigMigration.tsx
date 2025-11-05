/**
 * 应用主组件，集成配置迁移功能
 * 在用户登录时自动处理配置同步
 */

import React from 'react';

import { useAuth } from '~/core/hooks/useAuth';

import ConfigMigrationDialog from './ConfigMigrationDialog';

interface AppWithConfigMigrationProps {
  children: React.ReactNode;
}

export function AppWithConfigMigration({ children }: AppWithConfigMigrationProps) {
  const { 
    migrationState, 
    performMigration, 
    skipMigration 
  } = useAuth();

  return (
    <>
      {children}
      
      <ConfigMigrationDialog
        open={migrationState.needed}
        onOpenChange={(open) => {
          if (!open && migrationState.needed) {
            skipMigration();
          }
        }}
        localConfig={migrationState.localConfig ?? { deepThinkingMode: false, searchBeforePlanning: false }}
        cloudConfig={migrationState.cloudConfig ?? { deepThinkingMode: false, searchBeforePlanning: false }}
        onMigrate={performMigration}
        onSkip={skipMigration}
      />
    </>
  );
}

export default AppWithConfigMigration;