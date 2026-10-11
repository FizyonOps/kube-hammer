import React from 'react';
import { Box, Typography } from '@mui/material';
import { KubeSelect } from '../components/common/KubeSelect';
import { usePreference, useSetPreference } from '../store/preferences';
import { registerPlugin } from './registry';

const ResourceBadgeSettingsPanel: React.FC = () => {
    const badgeCountMode = usePreference('badgeCountMode');
    const setPreference = useSetPreference();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" sx={{
                color: 'text.secondary'
            }}>
                Controls what the resource count badge in the toolbar displays.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ minWidth: 80 }}>Count mode</Typography>
                <KubeSelect
                    value={badgeCountMode ?? 'total'}
                    onChange={(val: string) => setPreference('badgeCountMode', val as 'total' | 'running' | 'error')}
                    options={[
                        { value: 'total', label: 'Total resources' },
                        { value: 'running', label: 'Running / Ready only' },
                        { value: 'error', label: 'Errors / Failed only' },
                    ]}
                    minWidth={150}
                />
            </Box>
        </Box>
    );
};

registerPlugin({
    id: 'resource-badge',
    label: 'Resource Badge',
    description: 'Shows a live count badge in the resource toolbar; controls what is counted',
    enabledByDefault: true,
    category: 'ui',
    SettingsPanel: ResourceBadgeSettingsPanel,
    capabilities: {
        summary: 'Displays a live count badge in the resource toolbar showing filtered or total resource counts',
        tools: [],
    },
});
