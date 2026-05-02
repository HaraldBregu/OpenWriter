import React from 'react';
import type { AppStartupInfo } from '../../../../shared/types';
interface ConfigPageProps {
    onConfigured: (startupInfo: AppStartupInfo) => void;
}
declare const ConfigPage: React.FC<ConfigPageProps>;
export default ConfigPage;
