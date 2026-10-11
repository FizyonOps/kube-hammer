import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HistoryIcon from '@mui/icons-material/History';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { registerPlugin } from './registry';
import { registerPluginSlot, unregisterPluginSlot } from './slotUtils';
import { KubeSelect } from '../components/common/KubeSelect';
import { usePreference, useSetPreference, usePreferences } from '../store/preferences';
import { useClipboard } from '../hooks/useClipboard';

const PLUGIN_ID = 'clipboard-history';
const DEFAULT_LIMIT = 20;

interface ClipboardCopyEventDetail {
  text?: string;
  source?: string;
  at?: number;
}

const clampLimit = (value: number): number => Math.max(5, Math.min(100, value));

// Event listeners are registered at plugin-enable time (outside React) so they
// capture clipboard events regardless of whether the toolbar component is
// mounted. They read/write the preference store directly via getState().
function recordClipboardText(rawText: string | undefined | null): void {
  const text = String(rawText || '').trim();
  if (!text) return;

  const { preferences, setPreference } = usePreferences.getState();
  const history: string[] = preferences.clipboardHistoryItems ?? [];
  const limit = clampLimit((preferences.clipboardHistoryLimit as number | undefined) || DEFAULT_LIMIT);
  if (history[0] === text) return;
  const deduped = [text, ...history.filter((item) => item !== text)];
  setPreference('clipboardHistoryItems', deduped.slice(0, limit));
}

function handleClipboardCopyGlobal(event: Event): void {
  const customEvent = event as CustomEvent<ClipboardCopyEventDetail>;
  recordClipboardText(customEvent.detail?.text);
}

// Native copy events: Ctrl/Cmd+C on selected text, xterm terminal copies,
// editor copies, or any third-party widget that doesn't route through
// useClipboard(). Reads the actual clipboard payload first (programmatic
// copies populate event.clipboardData), then falls back to the current
// selection. Runs in capture phase so we see the event even if a child
// handler calls stopPropagation.
function handleNativeCopy(event: ClipboardEvent): void {
  let text: string;
  try {
    text = event.clipboardData?.getData('text/plain') || '';
  } catch {
    text = '';
  }
  if (!text) {
    try {
      text = String(window.getSelection() || '');
    } catch {
      text = '';
    }
  }
  recordClipboardText(text);
}

const ClipboardHistoryButton: React.FC = () => {
  const clipboardHistoryItems = usePreference('clipboardHistoryItems');
  const clipboardHistoryLimit = usePreference('clipboardHistoryLimit');
  const setPreference = useSetPreference();
  const { copyToClipboard } = useClipboard();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const history = clipboardHistoryItems ?? [];
  const historyLimit = clampLimit(clipboardHistoryLimit || DEFAULT_LIMIT);

  useEffect(() => {
    if (history.length > historyLimit) {
      setPreference('clipboardHistoryItems', history.slice(0, historyLimit));
    }
  }, [history, historyLimit, setPreference]);

  const open = Boolean(anchorEl);
  const id = open ? 'clipboard-history-popover' : undefined;

  const visibleHistory = useMemo(() => history.slice(0, historyLimit), [history, historyLimit]);

  return (
    <>
      <Tooltip title="Clipboard History" enterTouchDelay={0} leaveTouchDelay={1500}>
        <IconButton aria-label="Clipboard history"
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            mr: 0.5,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            width: 36,
            height: 36,
            borderRadius: 2,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <HistoryIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ width: 420, maxWidth: '90vw', p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Clipboard History
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <KubeSelect
                label="Limit"
                value={String(historyLimit)}
                onChange={(val: string) => setPreference('clipboardHistoryLimit', Number(val))}
                options={[10, 20, 30, 50, 100].map((value) => ({ value: String(value), label: String(value) }))}
                minWidth={90}
              />
              <Tooltip title="Clear history" enterTouchDelay={0} leaveTouchDelay={1500}>
                <span>
                  <IconButton aria-label="Clear history"
                    size="small"
                    onClick={() => setPreference('clipboardHistoryItems', [])}
                    disabled={visibleHistory.length === 0}
                  >
                    <ClearAllIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
          <Divider />
          {visibleHistory.length === 0 ? (
            <Box sx={{ py: 3, px: 1.5 }}>
              <Typography variant="body2" sx={{
                color: 'text.secondary'
              }}>
                No clipboard history yet.
              </Typography>
              <Typography variant="caption" sx={{
                color: 'text.secondary'
              }}>
                Anything you copy inside the app (rows, logs, YAML, terminal, selections) lands here.
              </Typography>
            </Box>
          ) : (
            <List dense sx={{ maxHeight: 320, overflow: 'auto', py: 0.5 }}>
              {visibleHistory.map((item, index) => (
                <ListItem
                  key={`${item}-${index}`}
                  disablePadding
                  secondaryAction={
                    <Tooltip title="Copy again" enterTouchDelay={0} leaveTouchDelay={1500}>
                      <IconButton aria-label="Copy to clipboard"
                        edge="end"
                        size="small"
                        onClick={() => {
                          copyToClipboard(item);
                          const reordered = [item, ...visibleHistory.filter((entry) => entry !== item)];
                          setPreference('clipboardHistoryItems', reordered.slice(0, historyLimit));
                        }}
                      >
                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemButton
                    onClick={() => {
                      copyToClipboard(item);
                      const reordered = [item, ...visibleHistory.filter((entry) => entry !== item)];
                      setPreference('clipboardHistoryItems', reordered.slice(0, historyLimit));
                    }}
                    sx={{ pr: 5 }}
                  >
                    <ListItemText
                      primary={item}
                      slotProps={{
                        primary: {
                          noWrap: true,
                          sx: { maxWidth: 320, fontSize: '0.86rem' },
                        }
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
          <Divider sx={{ mt: 0.5, mb: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="small" onClick={() => setAnchorEl(null)}>
              Close
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

const ClipboardHistorySettingsPanel: React.FC = () => {
  const clipboardHistoryLimit = usePreference('clipboardHistoryLimit');
  const setPreference = useSetPreference();
  const limit = clampLimit(clipboardHistoryLimit || DEFAULT_LIMIT);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="body2">Shows copied resource values in a reusable history popover.</Typography>
      <KubeSelect
        label="History limit"
        value={String(limit)}
        onChange={(val: string) => setPreference('clipboardHistoryLimit', Number(val))}
        options={[10, 20, 30, 50, 100].map((value) => ({ value: String(value), label: String(value) }))}
        minWidth={180}
      />
      <Button
        size="small"
        variant="outlined"
        onClick={() => setPreference('clipboardHistoryItems', [])}
        sx={{ alignSelf: 'flex-start' }}
      >
        Clear Clipboard History
      </Button>
    </Box>
  );
};

registerPlugin({
  id: PLUGIN_ID,
  label: 'Clipboard History',
  description: 'Keeps copied resource values and lets you quickly re-copy from the top toolbar',
  enabledByDefault: true,
  category: 'utility',
  SettingsPanel: ClipboardHistorySettingsPanel,
  lifecycle: {
    onEnable: () => {
      window.addEventListener('kube-hammer:clipboard-copy', handleClipboardCopyGlobal);
      document.addEventListener('copy', handleNativeCopy, true);

      registerPluginSlot({
        pluginId: PLUGIN_ID,
        slotName: 'toolbar-right',
        component: ClipboardHistoryButton,
        priority: 85,
      });

      return () => {
        window.removeEventListener('kube-hammer:clipboard-copy', handleClipboardCopyGlobal);
        document.removeEventListener('copy', handleNativeCopy, true);
        unregisterPluginSlot(PLUGIN_ID, 'toolbar-right');
      };
    },
  },
  capabilities: {
    summary: 'Maintains a history of copied resource values in the toolbar for quick re-copy access',
    tools: [],
  },
  runtimeCapabilities: {
    slots: ['toolbar-right'],
  },
});
