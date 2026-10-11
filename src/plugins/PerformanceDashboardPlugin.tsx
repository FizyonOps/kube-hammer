import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import MemoryIcon from '@mui/icons-material/Memory';
import RefreshIcon from '@mui/icons-material/Refresh';
import SpeedIcon from '@mui/icons-material/Speed';
import StorageIcon from '@mui/icons-material/Storage';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { KubeStateView } from '../components/common/KubeStateView';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useMetricsStore, startMetricsPolling, stopMetricsPolling } from '../store/metricsStore';
import { registerPlugin } from './registry';
import { registerPluginSidebarEntry } from './sdk';

const PLUGIN_ID = 'performance-dashboard';
const PERFORMANCE_DASHBOARD_ENTRY_ID = 'performance-dashboard-view';

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}

interface NodeHotspot {
  name: string;
  cpuPercent: number;
  memoryPercent: number;
  cpuUsage: string;
  memoryUsage: string;
}

interface PodHotspot {
  namespace: string;
  name: string;
  cpuMillicores: number;
  memoryMi: number;
  cpuUsage: string;
  memoryUsage: string;
}

const parseCpuToMillicores = (cpu: string): number => {
  if (!cpu) return 0;
  const milliMatch = cpu.match(/^(\d+)m$/);
  if (milliMatch) return parseInt(milliMatch[1], 10);
  const coreMatch = cpu.match(/^(\d+\.?\d*)$/);
  if (coreMatch) return Math.round(parseFloat(coreMatch[1]) * 1000);
  return 0;
};

const parseMemoryToMi = (memory: string): number => {
  if (!memory) return 0;
  const miMatch = memory.match(/^(\d+)Mi$/);
  if (miMatch) return parseInt(miMatch[1], 10);
  const giMatch = memory.match(/^(\d+\.?\d*)Gi$/);
  if (giMatch) return Math.round(parseFloat(giMatch[1]) * 1024);
  const kiMatch = memory.match(/^(\d+)Ki$/);
  if (kiMatch) return Math.round(parseInt(kiMatch[1], 10) / 1024);
  return 0;
};

const formatTimestamp = (value: number): string => {
  if (!value) return 'Not yet collected';
  return new Date(value).toLocaleTimeString();
};

const getThrowableMessage = (value: unknown, fallback: string): string => {
  if (value instanceof Error && value.message) {
    return value.message;
  }
  return fallback;
};

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, label, value, detail }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: '100%',
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{
        alignItems: 'flex-start'
      }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.5,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{
            color: 'text.secondary'
          }}>
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2, mt: 0.5 }}>
            {value}
          </Typography>
          {detail ? (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                mt: 0.5
              }}>
              {detail}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Paper>
  );
};

const HotspotRow: React.FC<{
  primary: string;
  secondary: string;
  badges: string[];
}> = ({ primary, secondary, badges }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        py: 1.25,
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        '&:last-of-type': {
          borderBottom: 'none',
          pb: 0,
        },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {primary}
        </Typography>
        <Typography variant="caption" noWrap sx={{
          color: 'text.secondary'
        }}>
          {secondary}
        </Typography>
      </Box>
      <Stack
        direction="row"
        spacing={0.75}
        useFlexGap
        sx={{
          flexWrap: 'wrap',
          justifyContent: 'flex-end'
        }}>
        {badges.map((badge) => (
          <Chip key={badge} label={badge} size="small" variant="outlined" />
        ))}
      </Stack>
    </Box>
  );
};

const PerformanceDashboardPanel: React.FC = () => {
  const isMobile = useIsMobile();
  const nodeMetrics = useMetricsStore((state) => state.nodeMetrics);
  const podMetrics = useMetricsStore((state) => state.podMetrics);
  const loading = useMetricsStore((state) => state.loading);
  const error = useMetricsStore((state) => state.error);
  const lastUpdated = useMetricsStore((state) => state.lastUpdated);
  const fetchMetrics = useMetricsStore((state) => state.fetchMetrics);
  const [sortBy, setSortBy] = useState<'cpu' | 'memory'>('cpu');
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsOutput, setDiagnosticsOutput] = useState<string>('');

  const canUseKubectl = useMemo(
    () => typeof window !== 'undefined' && typeof window.kubectl?.execCommand === 'function',
    [],
  );

  useEffect(() => {
    if (!canUseKubectl) {
      return undefined;
    }

    startMetricsPolling();
    return () => stopMetricsPolling();
  }, [canUseKubectl]);

  const runDiagnostics = useCallback(async () => {
    if (!canUseKubectl) {
      setDiagnosticsOutput('kubectl bridge is not available in this environment.');
      return;
    }

    setDiagnosticsLoading(true);
    try {
      const checks = [
        {
          label: 'Metrics APIService availability',
          cmd: "kubectl get apiservices v1beta1.metrics.k8s.io -o jsonpath='{.status.conditions[?(@.type==\"Available\")].status}'",
        },
        {
          label: 'Metrics server deployment replicas',
          cmd: 'kubectl get deploy metrics-server -n kube-system -o jsonpath="{.status.availableReplicas}"',
        },
        {
          label: 'Node metrics sample',
          cmd: 'kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes',
        },
      ];

      const lines: string[] = [];
      for (const check of checks) {
        const result = await window.kubectl.execCommand(check.cmd);
        const output = (result.stdout || result.stderr || '').trim();
        lines.push(`[${check.label}]`);
        lines.push(output || '(no output)');
        lines.push('');
      }

      setDiagnosticsOutput(lines.join('\n'));
    } catch (diagnosticsError: unknown) {
      setDiagnosticsOutput(getThrowableMessage(diagnosticsError, 'Diagnostics failed.'));
    } finally {
      setDiagnosticsLoading(false);
    }
  }, [canUseKubectl]);

  const nodeHotspots = useMemo<NodeHotspot[]>(() => {
    return Object.entries(nodeMetrics)
      .map(([name, metric]) => ({
        name,
        cpuPercent: metric.cpuPercent,
        memoryPercent: metric.memoryPercent,
        cpuUsage: metric.cpuCores,
        memoryUsage: metric.memoryBytes,
      }))
      .sort((left, right) => (
        sortBy === 'cpu'
          ? right.cpuPercent - left.cpuPercent
          : right.memoryPercent - left.memoryPercent
      ));
  }, [nodeMetrics, sortBy]);

  const podHotspots = useMemo<PodHotspot[]>(() => {
    return Object.entries(podMetrics)
      .map(([key, metric]) => {
        const separatorIndex = key.indexOf('_');
        const namespace = separatorIndex >= 0 ? key.slice(0, separatorIndex) : 'default';
        const name = separatorIndex >= 0 ? key.slice(separatorIndex + 1) : key;

        return {
          namespace,
          name,
          cpuMillicores: parseCpuToMillicores(metric.cpu),
          memoryMi: parseMemoryToMi(metric.memory),
          cpuUsage: metric.cpu,
          memoryUsage: metric.memory,
        };
      })
      .sort((left, right) => (
        sortBy === 'cpu'
          ? right.cpuMillicores - left.cpuMillicores
          : right.memoryMi - left.memoryMi
      ));
  }, [podMetrics, sortBy]);

  const hottestNode = nodeHotspots[0];
  const hottestPod = podHotspots[0];

  return (
    <Box
      sx={{
        height: '100%',
        overflow: 'auto',
        p: { xs: 2, md: 3 },
        pb: 'max(16px, env(safe-area-inset-bottom))',
      }}
    >
      <Stack spacing={2.5}>
        <Stack
          direction={isMobile ? 'column' : 'row'}
          spacing={1.5}
          sx={{
            justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'center'
          }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Cluster Performance Dashboard
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mt: 0.5
              }}>
              Shows node and pod hotspots from the cluster Metrics API, not kube-hammer process telemetry.
            </Typography>
          </Box>
          <Stack direction={isMobile ? 'column' : 'row'} spacing={1.5} sx={{
            alignItems: isMobile ? 'stretch' : 'center'
          }}>
            <Stack direction="row" spacing={0.75} useFlexGap sx={{
              flexWrap: 'wrap'
            }}>
              <Chip
                label="Sort by CPU"
                color={sortBy === 'cpu' ? 'primary' : 'default'}
                onClick={() => setSortBy('cpu')}
                clickable
              />
              <Chip
                label="Sort by Memory"
                color={sortBy === 'memory' ? 'primary' : 'default'}
                onClick={() => setSortBy('memory')}
                clickable
              />
            </Stack>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                void fetchMetrics();
              }}
              disabled={!canUseKubectl || loading}
              sx={{ minHeight: 44 }}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>

        {!canUseKubectl ? (
          <Alert severity="warning">
            The kubectl bridge is not available in this environment, so cluster metrics cannot be collected here.
          </Alert>
        ) : null}

        <Grid container spacing={2}>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              lg: 3
            }}>
            <SummaryCard
              icon={<AnalyticsIcon fontSize="small" />}
              label="Nodes Reporting"
              value={String(nodeHotspots.length)}
              detail={`Metrics last updated at ${formatTimestamp(lastUpdated)}`}
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              lg: 3
            }}>
            <SummaryCard
              icon={<SpeedIcon fontSize="small" />}
              label="Pods Reporting"
              value={String(podHotspots.length)}
              detail="Derived from the cluster Metrics API"
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              lg: 3
            }}>
            <SummaryCard
              icon={<MemoryIcon fontSize="small" />}
              label="Hottest Node"
              value={hottestNode ? hottestNode.name : 'Unavailable'}
              detail={hottestNode ? `${hottestNode.cpuPercent}% CPU • ${hottestNode.memoryPercent}% memory` : 'Waiting for node metrics'}
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              lg: 3
            }}>
            <SummaryCard
              icon={<StorageIcon fontSize="small" />}
              label="Hottest Pod"
              value={hottestPod ? hottestPod.name : 'Unavailable'}
              detail={hottestPod ? `${hottestPod.namespace} • ${sortBy === 'cpu' ? hottestPod.cpuUsage : hottestPod.memoryUsage}` : 'Waiting for pod metrics'}
            />
          </Grid>
        </Grid>

        {error ? (
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  void runDiagnostics();
                }}
                disabled={diagnosticsLoading}
                sx={{ minHeight: 44 }}
              >
                {diagnosticsLoading ? 'Running...' : 'Diagnostics'}
              </Button>
            }
          >
            {error}
          </Alert>
        ) : null}

        {diagnosticsOutput ? (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Metrics diagnostics
            </Typography>
            <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              {diagnosticsOutput}
            </Typography>
          </Paper>
        ) : null}

        <KubeStateView
          loading={loading && nodeHotspots.length === 0 && podHotspots.length === 0}
          empty={!loading && nodeHotspots.length === 0 && podHotspots.length === 0}
          emptyMessage="No cluster metrics are available yet. This usually means Metrics Server is missing or not healthy."
          minHeight={220}
        >
          <Grid container spacing={2}>
            <Grid
              size={{
                xs: 12,
                lg: 6
              }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  height: '100%',
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} sx={{
                    alignItems: 'center'
                  }}>
                    <SpeedIcon fontSize="small" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Top Nodes
                    </Typography>
                  </Stack>
                  {nodeHotspots.slice(0, 5).map((metric) => (
                    <HotspotRow
                      key={metric.name}
                      primary={metric.name}
                      secondary={`${metric.cpuUsage} CPU • ${metric.memoryUsage} memory`}
                      badges={[`${metric.cpuPercent}% CPU`, `${metric.memoryPercent}% memory`]}
                    />
                  ))}
                </Stack>
              </Paper>
            </Grid>
            <Grid
              size={{
                xs: 12,
                lg: 6
              }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  height: '100%',
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} sx={{
                    alignItems: 'center'
                  }}>
                    <StorageIcon fontSize="small" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Top Pods
                    </Typography>
                  </Stack>
                  {podHotspots.slice(0, 8).map((metric) => (
                    <HotspotRow
                      key={`${metric.namespace}/${metric.name}`}
                      primary={metric.name}
                      secondary={metric.namespace}
                      badges={[metric.cpuUsage, metric.memoryUsage]}
                    />
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </KubeStateView>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              mb: 1
            }}>
            <WarningAmberIcon fontSize="small" color="warning" />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Scope
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{
            color: 'text.secondary'
          }}>
            This view is intentionally cluster-scoped. It summarizes workload and node pressure from the user&apos;s current cluster and avoids showing kube-hammer renderer or main-process telemetry.
          </Typography>
        </Paper>
      </Stack>
    </Box>
  );
};

const PerformanceDashboardSettings: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="body2">
        Adds a cluster performance overview backed by the Kubernetes Metrics API.
      </Typography>
      <Typography variant="caption" sx={{
        color: 'text.secondary'
      }}>
        The dashboard focuses on node and pod hotspots in the user&apos;s cluster and requires Metrics Server to be healthy.
      </Typography>
    </Box>
  );
};

registerPlugin({
  id: PLUGIN_ID,
  label: 'Cluster Performance Dashboard',
  description: 'Cluster CPU and memory hotspots from the Kubernetes Metrics API.',
  enabledByDefault: false,
  category: 'observability',
  SettingsPanel: PerformanceDashboardSettings,
  lifecycle: {
    onEnable: () => {
      return registerPluginSidebarEntry({
        pluginId: PLUGIN_ID,
        id: PERFORMANCE_DASHBOARD_ENTRY_ID,
        label: 'Cluster Performance',
        icon: 'Speed',
        component: PerformanceDashboardPanel,
        topLevel: true,
        category: 'observability',
      });
    },
  },
  capabilities: {
    summary: 'Cluster-scoped overview of node and pod pressure using the Kubernetes Metrics API.',
    tools: [],
  },
  runtimeCapabilities: {
    sidebar: true,
  },
});