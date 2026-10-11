import React from 'react';
import { Tooltip } from '@mui/material';
import { WarningAmber } from '@mui/icons-material';
import { registerColumnExtension } from './columns';
import { registerPlugin } from './registry';

const PLUGIN_ID = 'lens-compat-columns';

const relativeAge = (iso: string | undefined): string => {
  if (!iso) return '-';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return '0s';
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const jobDuration = (raw: any): string => {
  const start = raw?.status?.startTime;
  if (!start) return '-';
  const end = raw?.status?.completionTime;
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const PROBLEM_STATES = new Set([
  'CrashLoopBackOff', 'OOMKilled', 'Error', 'ImagePullBackOff', 'ErrImagePull',
  'CreateContainerError', 'InvalidImageName', 'RunContainerError', 'CreateContainerConfigError',
]);

const podWarningReason = (raw: any): string | null => {
  if (!raw?.status) return null;
  const conditions: any[] = raw.status.conditions || [];
  for (const c of conditions) {
    if (c.type === 'Ready' && c.status === 'False') {
      return c.message || c.reason || 'Not ready';
    }
  }
  const statuses: any[] = [
    ...(raw.status.containerStatuses || []),
    ...(raw.status.initContainerStatuses || []),
  ];
  for (const cs of statuses) {
    const waiting = cs.state?.waiting;
    if (waiting?.reason && PROBLEM_STATES.has(waiting.reason)) {
      return `${cs.name}: ${waiting.reason}`;
    }
    const terminated = cs.state?.terminated;
    if (terminated?.exitCode !== undefined && terminated.exitCode !== 0) {
      return `${cs.name}: exited ${terminated.exitCode}`;
    }
  }
  return null;
};

const initialize = () => {
  const cleanups: Array<() => void> = [];
  const reg = (ext: Parameters<typeof registerColumnExtension>[0]) =>
    cleanups.push(registerColumnExtension(ext));

  // === PODS — genuinely new columns ===

  // Warning column: amber icon when pod has unready conditions or container errors.
  // columnId doesn't match any watcher field so this is additive.
  reg({
    pluginId: PLUGIN_ID,
    columnId: 'podWarning',
    label: '!',
    resourceTypes: ['pods'],
    priority: 10,
    minWidth: 36,
    align: 'center',
    defaultHidden: false,
    render: (resource) => {
      const reason = podWarningReason(resource._raw);
      if (!reason) return null;
      return (
        <Tooltip title={reason} placement="top" arrow enterTouchDelay={0} leaveTouchDelay={1500}>
          <WarningAmber sx={{ fontSize: 15, color: '#f59e0b', display: 'block', mx: 'auto' }} />
        </Tooltip>
      );
    },
  });

  // QoS class column — not set by the watcher, genuinely new.
  reg({
    pluginId: PLUGIN_ID,
    columnId: 'podQoS',
    label: 'QoS',
    resourceTypes: ['pods'],
    priority: 460,
    minWidth: 90,
    defaultHidden: true,
    getValue: (resource) => resource._raw?.status?.qosClass || '-',
  });

  // === PODS — label overrides for watcher-set fields ===
  // columnId matches the field name already on the resource object, so these
  // override the auto-generated column label instead of adding a duplicate column.

  reg({
    pluginId: PLUGIN_ID,
    columnId: 'node',
    label: 'Node',
    resourceTypes: ['pods'],
    priority: 400,
    minWidth: 130,
    defaultHidden: false,
    getValue: (resource) => resource.node || resource._raw?.spec?.nodeName || '-',
  });

  reg({
    pluginId: PLUGIN_ID,
    columnId: 'ip',
    label: 'Pod IP',
    resourceTypes: ['pods'],
    priority: 450,
    minWidth: 110,
    defaultHidden: true,
    getValue: (resource) => resource.ip || resource._raw?.status?.podIP || '-',
  });

  // === JOBS ===

  // Resumed: true when job is not suspended. Genuinely new for jobs (watcher doesn't set it).
  reg({
    pluginId: PLUGIN_ID,
    columnId: 'jobResumed',
    label: 'Resumed',
    resourceTypes: ['jobs'],
    priority: 300,
    minWidth: 80,
    align: 'center',
    defaultHidden: false,
    getValue: (resource) => (resource._raw?.spec?.suspend ? 'false' : 'true'),
  });

  // Duration: elapsed time from startTime to completionTime (or now if still running).
  reg({
    pluginId: PLUGIN_ID,
    columnId: 'jobDuration',
    label: 'Duration',
    resourceTypes: ['jobs'],
    priority: 400,
    minWidth: 80,
    defaultHidden: false,
    getValue: (resource) => jobDuration(resource._raw),
  });

  // === CRONJOBS — label override for watcher-set lastSchedule ===

  reg({
    pluginId: PLUGIN_ID,
    columnId: 'lastSchedule',
    label: 'Last Schedule',
    resourceTypes: ['cronjobs'],
    priority: 410,
    minWidth: 100,
    defaultHidden: false,
    getValue: (resource) => resource.lastSchedule || relativeAge(resource._raw?.status?.lastScheduleTime),
  });

  // Timezone — genuinely new, not set by the watcher.
  reg({
    pluginId: PLUGIN_ID,
    columnId: 'cronJobTimezone',
    label: 'Timezone',
    resourceTypes: ['cronjobs'],
    priority: 400,
    minWidth: 130,
    defaultHidden: true,
    getValue: (resource) => resource._raw?.spec?.timeZone || 'Local',
  });

  // === SERVICES — label override for watcher-set externalIP ===

  reg({
    pluginId: PLUGIN_ID,
    columnId: 'externalIP',
    label: 'External IP',
    resourceTypes: ['services'],
    priority: 350,
    minWidth: 120,
    defaultHidden: false,
    getValue: (resource) => {
      // Prefer the already-computed value from the watcher
      if (resource.externalIP && resource.externalIP !== '<none>') return resource.externalIP;
      const ingress: any[] = resource._raw?.status?.loadBalancer?.ingress || [];
      if (ingress.length > 0) {
        return ingress.map((e: any) => e.ip || e.hostname).filter(Boolean).join(', ');
      }
      const extIPs: string[] = resource._raw?.spec?.externalIPs || [];
      return extIPs.length > 0 ? extIPs.join(', ') : '-';
    },
  });

  // === DEPLOYMENTS / STATEFULSETS / DAEMONSETS — genuinely new ===

  // Conditions: True-status condition types joined (e.g. "Available, Progressing").
  reg({
    pluginId: PLUGIN_ID,
    columnId: 'workloadConditions',
    label: 'Conditions',
    resourceTypes: ['deployments', 'statefulsets', 'daemonsets'],
    priority: 450,
    minWidth: 160,
    defaultHidden: true,
    getValue: (resource) => {
      const conditions: any[] = resource._raw?.status?.conditions || [];
      if (!conditions.length) return '-';
      return conditions.filter((c: any) => c.status === 'True').map((c: any) => c.type).join(', ') || '-';
    },
  });

  return cleanups;
};

let activeCleanups: Array<() => void> = [];

registerPlugin({
  id: PLUGIN_ID,
  label: 'Lens-Compatible Columns',
  description: 'Extra columns mirroring FreeLens/Lens: pod warnings, QoS, job duration & resumed, cronjob timezone, service external IP label, workload conditions.',
  enabledByDefault: true,
  category: 'ui',
  lifecycle: {
    onEnable: () => { activeCleanups = initialize(); },
    onDisable: () => { activeCleanups.forEach(fn => fn()); activeCleanups = []; },
  },
  capabilities: {
    summary: 'Lens-compatible columns for pods, jobs, cronjobs, services, and workloads',
    tools: [],
  },
});
