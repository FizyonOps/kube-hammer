import React, { useState } from 'react';
import { Box, Typography, Button, Alert, Divider, Chip, Paper } from '@mui/material';
import { registerPlugin } from './registry';
import { createPluginSDK, registerOutputRenderer } from './sdk';
import { KubeResource } from '../types/kubernetes';

const PLUGIN_ID = 'example-sdk-guide';

const sdk = createPluginSDK(PLUGIN_ID);

const MyCustomDashboard: React.FC<{ data: any }> = ({ data }) => {
  const [active, setActive] = useState(0);
  return (
    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6">Live Dashboard for {data?.name}</Typography>
      <Typography variant="body2" sx={{
        color: 'text.secondary'
      }}>Namespace: {data?.namespace}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip label={`Active interactions: ${active}`} color="success" />
        <Button variant="contained" onClick={() => setActive(a => a + 1)}>
          Ping Component
        </Button>
      </Box>
    </Paper>
  );
};
registerOutputRenderer('my-custom-dashboard', MyCustomDashboard);

const SettingsPanel: React.FC = () => {
  const [demoState, setDemoState] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" sx={{
        color: 'text.secondary'
      }}>
        Welcome to the Example SDK Guide plugin settings.
        Use the source code of this file as a tutorial for building your own plugins!
      </Typography>

      <Divider />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip label="Demo button active" color="primary" size="small" />
        <Typography variant="caption">Live demo mode:</Typography>
        <Chip
          label={demoState ? 'ON' : 'OFF'}
          size="small"
          color={demoState ? 'success' : 'default'}
        />
      </Box>

      <Button
        variant="outlined"
        onClick={() => {
          setDemoState(!demoState);
          setClickCount((c) => c + 1);
        }}
        color={demoState ? 'primary' : 'inherit'}
      >
        Toggle demo: {clickCount} toggles
      </Button>

      <Alert severity="info">
        Check your Developer Tools console to see output from this plugin's lifecycle hooks.
        The toolbar button below is also active when demo is ON.
      </Alert>
    </Box>
  );
};

const ToolbarDemoComponent: React.FC = () => {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount((c) => c + 1);
    sdk.events.emit({
      type: sdk.events.types.PLUGIN_ENABLED,
      payload: { message: `SDK Demo clicked ${count + 1} times` },
    });
    alert(`SDK Toolbar Component Clicked! Event emitted to console. Total clicks: ${count + 1}`);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Button
        data-shortcut-target="example-sdk-demo-button"
        size="small"
        variant="contained"
        color="secondary"
        onClick={handleClick}
      >
        SDK Demo
      </Button>
      <Chip label={`${count} clicks`} size="small" color="primary" />
    </Box>
  );
};

registerPlugin({
  id: PLUGIN_ID,
  label: 'Example SDK Guide',
  description:
    'An extensive reference plugin demonstrating all major features of the ' +
    'kube-hammer plugin SDK. Read the plugin source code for a complete guide!',
  enabledByDefault: false,
  category: 'utility',
  SettingsPanel,

  lifecycle: {

    onEnable: () => {
      console.log(`[${PLUGIN_ID}] Booting up Example Plugin...`);

      const teardownFns: Array<() => void> = [];

      console.log(`[${PLUGIN_ID}] Registering UI slot: 'toolbar-right'`);
      const unregisterSlot = sdk.slots.register('toolbar-right', ToolbarDemoComponent);
      teardownFns.push(unregisterSlot);

      console.log(`[${PLUGIN_ID}] Registering anchored shortcut example`);
      const unregisterShortcut = sdk.shortcuts.register({
        id: 'demo-toolbar-shortcut',
        keys: ['ctrl', 'shift', '9'],
        description: 'Highlight the SDK demo toolbar button',
        category: 'plugin',
        targetQuery: '[data-shortcut-target="example-sdk-demo-button"]',
      });
      teardownFns.push(unregisterShortcut);

      console.log(`[${PLUGIN_ID}] Subscribing to event: KUBE_CONTEXT_CHANGED`);
      const unsubscribeEvent = sdk.events.subscribe(
        sdk.events.types.KUBE_CONTEXT_CHANGED,
        (event) => {
          console.log(
            `[${PLUGIN_ID}] Standard event received. Host switched config context:`,
            event.payload,
          );
        },
      );
      teardownFns.push(unsubscribeEvent);

      console.log(`[${PLUGIN_ID}] Registering custom action for Pods and Deployments`);
      const unregisterAction = sdk.resources.addAction({
        id: 'demo-inspect-action',
        label: 'Inspect via SDK Demo',
        description: 'Prints resource details directly to the developer console',
        resourceTypes: ['pods', 'deployments'],
        handler: async (resource: KubeResource, context) => {
          console.log(`[${PLUGIN_ID}] Demo Action executed!`, { resource, context });
          return {
            success: true,
            message: `Inspected ${resource.name}. Check the DevTools console.`,
          };
        },
      });
      teardownFns.push(unregisterAction);

      const unregisterDetachedTerminalAction = sdk.resources.addAction({
        id: 'demo-detached-terminal-action',
        label: 'Test Detached Terminal',
        description: 'Spawns an interactive shell inside the pod as a detached panel.',
        resourceTypes: ['pods'],
        outputMode: 'dialog',
        place: 'detached',
        handler: async (resource: any) => {
          return {
            success: true,
            output: {
              type: 'terminal',
              content: 'terminal-test',
              data: {
                namespace: resource.metadata?.namespace,
                pod: resource.metadata?.name,
                container: resource.spec?.containers?.[0]?.name,
                command: ['/bin/sh'],
              },
            },
          };
        },
      });
      teardownFns.push(unregisterDetachedTerminalAction);

      const unregisterCustomUIAction = sdk.resources.addAction({
        id: 'demo-custom-ui-action',
        label: 'Test Custom UI',
        description: 'Displays a custom React component dashboard for the pod.',
        resourceTypes: ['pods'],
        outputMode: 'dialog',
        place: 'detached',
        handler: async (resource: any) => {
          return {
            success: true,
            output: {
              type: 'component',
              content: 'my-custom-dashboard',
              data: {
                name: resource.metadata?.name,
                namespace: resource.metadata?.namespace
              },
            },
          };
        },
      });
      teardownFns.push(unregisterCustomUIAction);

      console.log(`[${PLUGIN_ID}] Registering column extension for 'pods'`);
      const unregisterColumn = sdk.columns.add({
        columnId: 'demo-column',
        label: 'SDK Label',
        resourceTypes: ['pods'],
        render: (row) => (
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {row.metadata?.labels?.['app'] || 'No App Label'}
          </Typography>
        ),
        sortable: false,
      });
      teardownFns.push(unregisterColumn);

      console.log(`[${PLUGIN_ID}] Registering AI context provider`);
      sdk.ai.registerContextProvider('Demo SDK Knowledge', async () => {
        return `The user is currently running the '${PLUGIN_ID}' example plugin. ` +
          `If asked about SDK development, confirm that they have a reference open.`;
      });
      teardownFns.push(() => sdk.ai.unregisterContextProviders());

      console.log(`[${PLUGIN_ID}] Registering shared state`);
      sdk.state.register('demo-greeting', 'Hello World');
      sdk.state.set('demo-greeting', 'Hello from the Example Plugin!');
      teardownFns.push(() => sdk.state.clear());

      console.log(`[${PLUGIN_ID}] Subscribing to demo-channel`);
      const unsubscribeChannel = sdk.data.subscribe('demo-channel', (data) => {
        console.log(`[${PLUGIN_ID}] Data channel message received:`, data);
      });
      teardownFns.push(unsubscribeChannel);

      sdk.data.publish('demo-channel', {
        message: 'Initialization test broadcast complete.',
        timestamp: Date.now(),
      });

      return () => {
        console.log(`[${PLUGIN_ID}] Executing cleanup functions...`);
        teardownFns.forEach((cleanupCall, idx) => {
          try {
            cleanupCall();
          } catch (error: any) {
            console.error(`[${PLUGIN_ID}] Cleanup failure on routine idx: ${idx}`, error);
          }
        });
      };
    },

    onDisable: () => {
      console.log(`[${PLUGIN_ID}] Plugin has been formally disabled.`);
    },

    onContextChange: (contextName: string) => {
      console.log(`[${PLUGIN_ID}] Notification => Kubernetes context switched to: ${contextName}`);
    },

    onNamespaceChange: (namespace: string) => {
      console.log(`[${PLUGIN_ID}] Notification => Namespace filter adjusted to: ${namespace}`);
    },
  },
  capabilities: {
    summary: 'Reference plugin demonstrating all major plugin SDK features: toolbar slots, keyboard shortcuts, custom actions, column extensions, AI context, shared state, and data channels',
    tools: [],
  },
  runtimeCapabilities: {
    slots: ['toolbar-right'],
    columnExtensions: ['demo-column'],
    customActions: ['demo-inspect-action', 'demo-detached-terminal-action', 'demo-custom-ui-action'],
    aiContextProvider: true,
  },
});
