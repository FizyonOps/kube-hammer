import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    ToggleButtonGroup,
    ToggleButton,
    FormControlLabel,
    Switch,
    Grid,
    Chip,
    Tooltip,
    IconButton,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import { registerPlugin } from './registry';
import { registerPluginSlot, unregisterPluginSlot } from './slotUtils';
import { usePreference, useSetPreference } from '../store/preferences';

const PLUGIN_ID = 'resource-visualization';

type ChartType = 'bar' | 'pie' | 'timeline';
type ResourceMetric = 'count' | 'cpu' | 'memory' | 'status';

interface ChartData {
    labels: string[];
    values: number[];
    colors: string[];
}

const STATUS_COLORS: Record<string, string> = {
    Running: '#4caf50',
    Pending: '#ff9800',
    Succeeded: '#2196f3',
    Failed: '#f44336',
    Unknown: '#9e9e9e',
    Active: '#4caf50',
    Terminating: '#ff5722',
};

const SimpleBarChart: React.FC<{ data: ChartData; maxHeight?: number }> = ({ data, maxHeight = 200 }) => {
    const max = Math.max(...data.values, 1);
    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: maxHeight, p: 2 }}>
            {data.values.map((value, i) => (
                <Tooltip key={i} title={`${data.labels[i]}: ${value}`} enterTouchDelay={0} leaveTouchDelay={1500}>
                    <Box
                        sx={{
                            flex: 1,
                            minWidth: 30,
                            height: `${(value / max) * 100}%`,
                            bgcolor: data.colors[i] || '#2196f3',
                            borderRadius: 1,
                            position: 'relative',
                            '&:hover': { opacity: 0.8 },
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{
                                position: 'absolute',
                                bottom: -20,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '0.65rem',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {data.labels[i]}
                        </Typography>
                    </Box>
                </Tooltip>
            ))}
        </Box>
    );
};

const SimplePieChart: React.FC<{ data: ChartData; size?: number }> = ({ data, size = 200 }) => {
    const total = data.values.reduce((a, b) => a + b, 0);
    let currentAngle = 0;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 2 }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {data.values.map((value, i) => {
                    const angle = (value / total) * 360;
                    const startAngle = currentAngle;
                    currentAngle += angle;
                    const endAngle = currentAngle;

                    const x1 = size / 2 + (size / 2 - 10) * Math.cos((Math.PI * startAngle) / 180);
                    const y1 = size / 2 + (size / 2 - 10) * Math.sin((Math.PI * startAngle) / 180);
                    const x2 = size / 2 + (size / 2 - 10) * Math.cos((Math.PI * endAngle) / 180);
                    const y2 = size / 2 + (size / 2 - 10) * Math.sin((Math.PI * endAngle) / 180);

                    const largeArc = angle > 180 ? 1 : 0;

                    return (
                        <path
                            key={i}
                            d={`M ${size / 2} ${size / 2} L ${x1} ${y1} A ${size / 2 - 10} ${size / 2 - 10} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                            fill={data.colors[i] || '#2196f3'}
                            stroke="#fff"
                            strokeWidth={2}
                        />
                    );
                })}
            </svg>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {data.labels.map((label, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                            sx={{
                                width: 12,
                                height: 12,
                                borderRadius: 0.5,
                                bgcolor: data.colors[i] || '#2196f3',
                            }}
                        />
                        <Typography variant="caption">
                            {label}: {data.values[i]} ({Math.round((data.values[i] / total) * 100)}%)
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

const TimelineChart: React.FC<{ data: ChartData }> = ({ data }) => {
    const max = Math.max(...data.values, 1);
    const points = data.values.map((v, i) => {
        const x = (i / (data.values.length - 1 || 1)) * 100;
        const y = 100 - (v / max) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <Box sx={{ p: 2, height: 200 }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map(y => (
                    <line
                        key={y}
                        x1="0"
                        y1={y}
                        x2="100"
                        y2={y}
                        stroke="#e0e0e0"
                        strokeWidth="0.5"
                    />
                ))}
                {/* Area under line */}
                <polygon
                    points={`0,100 ${points} 100,100`}
                    fill="rgba(33, 150, 243, 0.1)"
                />
                {/* Line */}
                <polyline
                    points={points}
                    fill="none"
                    stroke="#2196f3"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
        </Box>
    );
};

const ResourceVisualizationPanel: React.FC = () => {
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [metric, setMetric] = useState<ResourceMetric>('count');
    const [groupBy, setGroupBy] = useState<'namespace' | 'status' | 'type'>('namespace');
    const [autoRefresh, setAutoRefresh] = useState(false);
    const resources: Record<string, any[]> = {};
    const resourceTypes: any[] = [];
    const loading = false;
    const refresh = () => {};

    // Auto refresh
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => refresh(), 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, refresh]);

    // Process data for charts
    const chartData = useMemo<ChartData>(() => {
        const counts: Record<string, number> = {};

        if (metric === 'count') {
            if (groupBy === 'namespace') {
                Object.values(resources).flat().forEach((res: any) => {
                    const ns = res.metadata?.namespace || 'cluster-scoped';
                    counts[ns] = (counts[ns] || 0) + 1;
                });
            } else if (groupBy === 'type') {
                Object.entries(resources).forEach(([type, items]) => {
                    counts[type] = items?.length || 0;
                });
            } else if (groupBy === 'status') {
                Object.values(resources).flat().forEach((res: any) => {
                    const status = res.status?.phase || res.status?.conditions?.[0]?.type || 'Unknown';
                    counts[status] = (counts[status] || 0) + 1;
                });
            }
        }

        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const colors = entries.map(([key]) => STATUS_COLORS[key] || `hsl(${Math.random() * 360}, 70%, 50%)`);

        return {
            labels: entries.map(([key]) => key),
            values: entries.map(([, value]) => value),
            colors,
        };
    }, [resources, metric, groupBy]);

    const totalResources = useMemo(() =>
        Object.values(resources).reduce((sum, items) => sum + (items?.length || 0), 0),
        [resources]
    );

    return (
        <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <BarChartIcon />
                <Typography variant="h6">Resource Visualization</Typography>

                <ToggleButtonGroup
                    size="small"
                    value={chartType}
                    onChange={(_, value) => value && setChartType(value)}
                >
                    <ToggleButton value="bar">
                        <BarChartIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="pie">
                        <PieChartIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="timeline">
                        <TimelineIcon fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>

                <ToggleButtonGroup
                    size="small"
                    value={metric}
                    onChange={(_, value) => value && setMetric(value)}
                >
                    <ToggleButton value="count">Count</ToggleButton>
                    <ToggleButton value="status">Status</ToggleButton>
                </ToggleButtonGroup>

                <ToggleButtonGroup
                    size="small"
                    value={groupBy}
                    onChange={(_, value) => value && setGroupBy(value)}
                >
                    <ToggleButton value="namespace">By NS</ToggleButton>
                    <ToggleButton value="type">By Type</ToggleButton>
                    <ToggleButton value="status">By Status</ToggleButton>
                </ToggleButtonGroup>

                <Box sx={{ flexGrow: 1 }} />

                <FormControlLabel
                    control={
                        <Switch
                            size="small"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                    }
                    label={<Typography variant="caption">Auto-refresh</Typography>}
                />

                <IconButton size="small" onClick={refresh} disabled={loading} aria-label="Refresh visualization">
                    <RefreshIcon fontSize="small" />
                </IconButton>
            </Box>

            <Grid container spacing={2}>
                <Grid
                    size={{
                        xs: 12,
                        md: 8
                    }}>
                    <Paper sx={{ height: 350 }}>
                        {chartType === 'bar' && <SimpleBarChart data={chartData} />}
                        {chartType === 'pie' && <SimplePieChart data={chartData} />}
                        {chartType === 'timeline' && <TimelineChart data={chartData} />}
                    </Paper>
                </Grid>

                <Grid
                    size={{
                        xs: 12,
                        md: 4
                    }}>
                    <Paper sx={{ p: 2, height: 350 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>Summary</Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Box>
                                <Typography variant="caption" sx={{
                                    color: 'text.secondary'
                                }}>Total Resources</Typography>
                                <Typography variant="h4">{totalResources}</Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" sx={{
                                    color: 'text.secondary'
                                }}>Resource Types</Typography>
                                <Typography variant="h6">{resourceTypes.length}</Typography>
                            </Box>

                            <Box>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'text.secondary',
                                        mb: 1,
                                        display: 'block'
                                    }}>
                                    Top Namespaces
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {chartData.labels.slice(0, 5).map((label, i) => (
                                        <Chip
                                            key={label}
                                            size="small"
                                            label={`${label}: ${chartData.values[i]}`}
                                            sx={{ bgcolor: chartData.colors[i], color: '#fff' }}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

registerPlugin({
    id: PLUGIN_ID,
    label: 'Resource Visualization',
    description: 'Visual charts and graphs for Kubernetes resource distribution and metrics',
    enabledByDefault: false,
    category: 'data',

    lifecycle: {
        onEnable: () => {
            registerPluginSlot({
                pluginId: PLUGIN_ID,
                slotName: 'sidebar-bottom',
                component: ResourceVisualizationPanel,
                priority: 40,
            });
            return () => {
                unregisterPluginSlot(PLUGIN_ID, 'sidebar-bottom');
            };
        },
    },
    capabilities: {
        summary: 'Provides bar charts, pie charts, and timeline visualizations of cluster resources',
        tools: [],
    },
    runtimeCapabilities: {
        slots: ['sidebar-bottom'],
    },
});
