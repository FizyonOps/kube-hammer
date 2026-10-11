import React, { useState, useCallback, useMemo } from 'react';
import {
    Box,
    Typography,
    FormControlLabel,
    Switch,
    Paper,
    Chip,
    Alert,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Collapse,
    IconButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CodeIcon from '@mui/icons-material/Code';
import { registerPlugin, registerAIContextProvider, unregisterAIContextProviders } from './registry';
import { usePreference, useSetPreference } from '../store/preferences';
import { ValidationIssue, validateYaml, REQUIRED_FIELDS } from './YamlSchemaValidationUtils';

interface YamlValidationViewProps {
    content: string;
}

export const YamlValidationView: React.FC<YamlValidationViewProps> = ({ content }) => {
    const [expanded, setExpanded] = useState<number | null>(null);

    const issues = useMemo(() => validateYaml(content), [content]);

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warnCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;

    if (issues.length === 0) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5 }}>
                <CheckCircleIcon sx={{ color: '#4caf50' }} />
                <Typography variant="body2" sx={{
                    color: 'text.secondary'
                }}>No issues detected</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <CodeIcon fontSize="small" />
                <Typography variant="subtitle2">YAML Validation</Typography>
                <Box sx={{ flexGrow: 1 }} />
                {errorCount > 0 && <Chip label={`${errorCount} errors`} size="small" color="error" sx={{ height: 20, fontSize: '0.65rem' }} />}
                {warnCount > 0 && <Chip label={`${warnCount} warnings`} size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem' }} />}
                {infoCount > 0 && <Chip label={`${infoCount} info`} size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />}
            </Box>
            <List dense disablePadding>
                {issues.map((issue, i) => {
                    const issueKey = `${issue.severity}-${issue.line ?? 0}-${issue.path ?? ''}-${issue.message.slice(0, 30)}`;
                    const isExpanded = expanded === i;
                    const icon = issue.severity === 'error'
                        ? <ErrorIcon fontSize="small" sx={{ color: '#f44336' }} />
                        : issue.severity === 'warning'
                            ? <WarningIcon fontSize="small" sx={{ color: '#ff9800' }} />
                            : <CheckCircleIcon fontSize="small" sx={{ color: '#2196f3' }} />;

                    return (
                        <React.Fragment key={issueKey}>
                            <ListItem
                                onClick={() => setExpanded(isExpanded ? null : i)}
                                sx={{ cursor: issue.suggestion ? 'pointer' : 'default', '&:hover': { bgcolor: 'action.hover' } }}
                            >
                                <ListItemIcon sx={{ minWidth: 32 }}>{icon}</ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{issue.message}</Typography>
                                            {issue.line && (
                                                <Chip label={`L${issue.line}`} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                                            )}
                                            {issue.path && (
                                                <Chip label={issue.path} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', fontFamily: 'monospace' }} />
                                            )}
                                        </Box>
                                    }
                                    slotProps={{
                                        primary: { component: 'div' }
                                    }}
                                />
                                {issue.suggestion && (isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />)}
                            </ListItem>
                            {issue.suggestion && (
                                <Collapse in={isExpanded} timeout="auto">
                                    <Box sx={{ pl: 6, pr: 2, pb: 1 }}>
                                        <Alert severity="info" sx={{ fontSize: '0.75rem' }}>{issue.suggestion}</Alert>
                                    </Box>
                                </Collapse>
                            )}
                            <Divider />
                        </React.Fragment>
                    );
                })}
            </List>
        </Box>
    );
};

const YamlSchemaValidationSettingsPanel: React.FC = () => {
    const yamlValidationEnabled = usePreference('yamlValidationEnabled');
    const yamlValidationShowBestPractices = usePreference('yamlValidationShowBestPractices');
    const setPreference = useSetPreference();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
                control={
                    <Switch
                        checked={yamlValidationEnabled ?? true}
                        onChange={(e) => setPreference('yamlValidationEnabled', e.target.checked)}
                        size="small"
                    />
                }
                label={
                    <Box>
                        <Typography variant="body2">Enable YAML validation</Typography>
                        <Typography variant="caption" sx={{
                            color: 'text.secondary'
                        }}>
                            Validate Kubernetes manifests for missing fields, deprecated APIs, and common mistakes
                        </Typography>
                    </Box>
                }
            />
            <FormControlLabel
                control={
                    <Switch
                        checked={yamlValidationShowBestPractices ?? true}
                        onChange={(e) => setPreference('yamlValidationShowBestPractices', e.target.checked)}
                        disabled
                        size="small"
                    />
                }
                label={
                    <Box>
                        <Typography variant="body2" sx={{
                            color: 'text.disabled'
                        }}>Show best practice hints (coming soon)</Typography>
                        <Typography variant="caption" sx={{
                            color: 'text.secondary'
                        }}>
                            Show suggestions for security, reliability and performance best practices
                        </Typography>
                    </Box>
                }
            />
        </Box>
    );
};

registerPlugin({
    id: 'yaml-schema-validation',
    label: 'YAML Schema Validation',
    description: 'Validate Kubernetes YAML manifests against known schemas, detect deprecated APIs and common mistakes',
    enabledByDefault: false,
    category: 'data',
    SettingsPanel: YamlSchemaValidationSettingsPanel,
    lifecycle: {
        onEnable: () => {
            registerAIContextProvider({
                pluginId: 'yaml-schema-validation',
                label: 'YAML Validation Capabilities',
                getContext: () => {
                    const kinds = Object.keys(REQUIRED_FIELDS).join(', ');
                    return `Schema validation is available for: ${kinds}. Common mistake patterns are checked including deprecated APIs, security misconfigurations (privileged mode, root user), image tags, and best practices.`;
                },
            });
            return () => unregisterAIContextProviders('yaml-schema-validation');
        },
    },
    capabilities: {
        summary: 'Validates Kubernetes YAML manifests against known schemas. Detects deprecated APIs, security misconfigurations, missing required fields, and common mistakes.',
        tools: [],
    },
    runtimeCapabilities: {
        aiContextProvider: true,
    },
});
