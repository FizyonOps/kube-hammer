import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Tabs,
    Tab,
    IconButton,
    Tooltip,
    Typography,
    Paper,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ComputerIcon from '@mui/icons-material/Computer';
import DnsIcon from '@mui/icons-material/Dns';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { registerPlugin } from './registry';
import { registerPluginSidebarEntry } from './sdk';
import { ClusterTerminal } from '../components/ClusterTerminal';
import { PodTerminal } from '../components/PodTerminal';
import { KubeSelect } from '../components/common/KubeSelect';
import { useIsMobile } from '../hooks/useMediaQuery';
import { safeAreaPaperSx } from '../utils/layoutStyles';

const PLUGIN_ID = 'enhanced-terminal';

type TerminalSessionKind = 'local' | 'pod';

interface TerminalSession {
    id: string;
    name: string;
    kind: TerminalSessionKind;
    namespace: string;
    podName: string;
    createdAt: number;
}

interface PodOption {
    namespace: string;
    name: string;
    phase: string;
}

const SESSION_STORAGE_KEY = 'enhanced-terminal-sessions';
const POD_LIST_JSONPATH = '{range .items[*]}{.metadata.namespace}{"\\t"}{.metadata.name}{"\\t"}{.status.phase}{"\\n"}{end}';

// Tabs outlive the page component so switching sidebar pages keeps them; their shells restart on return.
let openSessions: TerminalSession[] = [];

const createSessionId = (): string => `term-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const isTerminalAvailable = (): boolean => typeof window !== 'undefined' && Boolean(window.terminal?.create);

// Sessions saved before pod shells existed have no `kind`; an empty pod means a local shell.
const normalizeSession = (raw: Partial<TerminalSession>): TerminalSession | null => {
    const podName = typeof raw.podName === 'string' ? raw.podName : '';
    const namespace = typeof raw.namespace === 'string' ? raw.namespace : '';
    const kind: TerminalSessionKind = raw.kind === 'pod' || (raw.kind !== 'local' && podName) ? 'pod' : 'local';
    if (kind === 'pod' && (!podName || !namespace)) {
        return null;
    }
    return {
        id: createSessionId(),
        name: typeof raw.name === 'string' && raw.name ? raw.name : (kind === 'pod' ? podName : 'Local shell'),
        kind,
        namespace,
        podName,
        createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    };
};

const readSavedSessions = (): TerminalSession[] => {
    try {
        const saved = localStorage.getItem(SESSION_STORAGE_KEY);
        const parsed: unknown = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed
            .map((entry) => normalizeSession(entry as Partial<TerminalSession>))
            .filter((entry): entry is TerminalSession => entry !== null);
    } catch (e) {
        console.warn('Failed to load saved terminal sessions:', e);
        return [];
    }
};

const parsePodList = (stdout: string): PodOption[] => stdout
    .split('\n')
    .map((line) => line.split('\t'))
    .filter((parts) => parts.length >= 2 && parts[0] && parts[1])
    .map(([namespace, name, phase]) => ({ namespace, name, phase: phase || 'Unknown' }))
    .sort((a, b) => Number(b.phase === 'Running') - Number(a.phase === 'Running')
        || a.namespace.localeCompare(b.namespace)
        || a.name.localeCompare(b.name));

const PodPickerDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    onPick: (pod: PodOption) => void;
}> = ({ open, onClose, onPick }) => {
    const isMobile = useIsMobile();
    const [pods, setPods] = useState<PodOption[]>([]);
    const [selected, setSelected] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        setSelected('');
        if (!window.kubectl?.execArgs) {
            setLoading(false);
            setError('kubectl is not available in this build.');
            return;
        }
        void window.kubectl.execArgs(['get', 'pods', '--all-namespaces', '-o', `jsonpath=${POD_LIST_JSONPATH}`])
            .then((result) => {
                if (cancelled) return;
                if (result.code !== 0) {
                    setPods([]);
                    setError(result.stderr.trim() || 'Could not list pods.');
                    return;
                }
                setPods(parsePodList(result.stdout));
            })
            .catch((listError: unknown) => {
                if (cancelled) return;
                setPods([]);
                setError(listError instanceof Error ? listError.message : String(listError));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [open]);

    const options = useMemo(() => pods.map((pod) => ({
        value: `${pod.namespace}/${pod.name}`,
        label: pod.name,
        secondaryLabel: pod.phase,
        group: pod.namespace,
    })), [pods]);

    const selectedPod = pods.find((pod) => `${pod.namespace}/${pod.name}` === selected);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isMobile}
            slotProps={isMobile ? { paper: { sx: safeAreaPaperSx } } : undefined}
            aria-labelledby="enhanced-terminal-pod-picker-title"
        >
            <DialogTitle id="enhanced-terminal-pod-picker-title">Open a pod shell</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                        <CircularProgress size={18} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Listing pods…</Typography>
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : pods.length === 0 ? (
                    <Alert severity="info">No pods found in the current context.</Alert>
                ) : (
                    <KubeSelect
                        label="Pod"
                        value={selected}
                        onChange={(value: string) => setSelected(value)}
                        options={options}
                        placeholder="Search pods"
                        size="small"
                    />
                )}
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    The container is chosen in the shell tab once it opens.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} sx={{ minHeight: isMobile ? 44 : undefined }}>Cancel</Button>
                <Button
                    variant="contained"
                    disabled={!selectedPod}
                    onClick={() => selectedPod && onPick(selectedPod)}
                    sx={{ minHeight: isMobile ? 44 : undefined }}
                >
                    Open shell
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const EnhancedTerminalPanel: React.FC = () => {
    const isMobile = useIsMobile();
    const [sessions, setSessions] = useState<TerminalSession[]>(() => openSessions);
    const [activeId, setActiveId] = useState<string>(() => openSessions[openSessions.length - 1]?.id ?? '');
    const [newMenuAnchor, setNewMenuAnchor] = useState<null | HTMLElement>(null);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [savedCount, setSavedCount] = useState(() => readSavedSessions().length);
    const [podPickerOpen, setPodPickerOpen] = useState(false);
    const terminalAvailable = isTerminalAvailable();
    const tapTargetSx = isMobile ? { minWidth: 44, minHeight: 44 } : undefined;

    useEffect(() => {
        openSessions = sessions;
    }, [sessions]);

    const addSession = useCallback((session: Omit<TerminalSession, 'id' | 'createdAt'>) => {
        const next: TerminalSession = { ...session, id: createSessionId(), createdAt: Date.now() };
        setSessions((prev) => [...prev, next]);
        setActiveId(next.id);
    }, []);

    const openLocalShell = useCallback(() => {
        setNewMenuAnchor(null);
        addSession({
            name: `Local shell ${sessions.filter((session) => session.kind === 'local').length + 1}`,
            kind: 'local',
            namespace: '',
            podName: '',
        });
    }, [addSession, sessions]);

    const openPodPicker = useCallback(() => {
        setNewMenuAnchor(null);
        setPodPickerOpen(true);
    }, []);

    const handlePodPicked = useCallback((pod: PodOption) => {
        setPodPickerOpen(false);
        addSession({ name: pod.name, kind: 'pod', namespace: pod.namespace, podName: pod.name });
    }, [addSession]);

    const closeSession = useCallback((sessionId: string, event?: React.MouseEvent) => {
        event?.stopPropagation();
        const index = sessions.findIndex((session) => session.id === sessionId);
        const next = sessions.filter((session) => session.id !== sessionId);
        setSessions(next);
        if (activeId === sessionId) {
            setActiveId(next[Math.min(index, next.length - 1)]?.id ?? '');
        }
    }, [sessions, activeId]);

    const saveCurrentSessions = () => {
        setMenuAnchor(null);
        if (sessions.length === 0) return;
        try {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions.map(({ name, kind, namespace, podName, createdAt }) => ({
                name, kind, namespace, podName, createdAt,
            }))));
            setSavedCount(sessions.length);
        } catch (e) {
            console.warn('Failed to save terminal sessions:', e);
        }
    };

    const restoreSavedSessions = () => {
        setMenuAnchor(null);
        const restored = readSavedSessions();
        if (restored.length === 0) return;
        setSessions(restored);
        setActiveId(restored[0].id);
    };

    const activeIndex = Math.max(0, sessions.findIndex((session) => session.id === activeId));

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Paper sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                    value={sessions.length > 0 ? activeIndex : false}
                    onChange={(_event, index: number) => setActiveId(sessions[index]?.id ?? '')}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ flexGrow: 1, minHeight: 40 }}
                >
                    {sessions.map((session) => (
                        <Tab
                            key={session.id}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {session.kind === 'pod' ? <DnsIcon sx={{ fontSize: 14 }} /> : <ComputerIcon sx={{ fontSize: 14 }} />}
                                    <Typography variant="caption" sx={{ fontSize: '0.75rem', textTransform: 'none' }}>
                                        {session.name}
                                    </Typography>
                                    <IconButton
                                        size="small"
                                        component="span"
                                        onClick={(e) => closeSession(session.id, e)}
                                        sx={{ p: 0.25, ml: 0.5, ...tapTargetSx }}
                                        aria-label={`Close ${session.name}`}
                                    >
                                        <CloseIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </Box>
                            }
                            sx={{ minHeight: 40, px: 1, py: 0.5 }}
                        />
                    ))}
                </Tabs>
                <Box sx={{ display: 'flex', gap: 0.5, px: 1 }}>
                    <Tooltip title="New terminal" enterTouchDelay={0} leaveTouchDelay={1500}>
                        <span>
                            <IconButton
                                size="small"
                                onClick={(e) => setNewMenuAnchor(e.currentTarget)}
                                disabled={!terminalAvailable}
                                aria-label="New terminal"
                                sx={tapTargetSx}
                            >
                                <AddIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Session options" enterTouchDelay={0} leaveTouchDelay={1500}>
                        <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Session options" sx={tapTargetSx}>
                            <MoreVertIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Paper>

            <Box sx={{ flexGrow: 1, overflow: 'hidden', minHeight: 0, position: 'relative' }} role="region" aria-label="Interactive terminal sessions">
                {!terminalAvailable ? (
                    <Box sx={{ p: 2 }}>
                        <Alert severity="info">Terminal sessions are only available in the desktop app.</Alert>
                    </Box>
                ) : sessions.length === 0 ? (
                    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Open a shell on this machine with your current kube context, or exec into a pod.
                            Use the options menu to save the open tabs and restore them later.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button variant="contained" startIcon={<ComputerIcon />} onClick={openLocalShell} sx={{ minHeight: isMobile ? 44 : undefined }}>
                                Local shell
                            </Button>
                            <Button variant="outlined" startIcon={<DnsIcon />} onClick={openPodPicker} sx={{ minHeight: isMobile ? 44 : undefined }}>
                                Pod shell
                            </Button>
                        </Box>
                    </Box>
                ) : (
                    sessions.map((session) => (
                        <Box
                            key={session.id}
                            role="tabpanel"
                            aria-label={session.kind === 'pod' ? `Shell in ${session.namespace}/${session.podName}` : session.name}
                            sx={{
                                height: '100%',
                                display: session.id === activeId ? 'flex' : 'none',
                                flexDirection: 'column',
                                minHeight: 0,
                            }}
                        >
                            {session.kind === 'pod' ? (
                                <PodTerminal
                                    panelMode
                                    active={session.id === activeId}
                                    open
                                    onClose={() => closeSession(session.id)}
                                    podName={session.podName}
                                    namespace={session.namespace}
                                    title={`${session.namespace}/${session.podName}`}
                                />
                            ) : (
                                <ClusterTerminal
                                    panelMode
                                    active={session.id === activeId}
                                    open
                                    onClose={() => closeSession(session.id)}
                                />
                            )}
                        </Box>
                    ))
                )}
            </Box>

            <Menu anchorEl={newMenuAnchor} open={Boolean(newMenuAnchor)} onClose={() => setNewMenuAnchor(null)}>
                <MenuItem onClick={openLocalShell} sx={{ minHeight: isMobile ? 44 : undefined }}>
                    <ListItemIcon>
                        <ComputerIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Local shell" secondary="This machine, current kube context" />
                </MenuItem>
                <MenuItem onClick={openPodPicker} sx={{ minHeight: isMobile ? 44 : undefined }}>
                    <ListItemIcon>
                        <DnsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Pod shell…" secondary="kubectl exec into a pod" />
                </MenuItem>
            </Menu>

            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                <MenuItem onClick={saveCurrentSessions} disabled={sessions.length === 0} sx={{ minHeight: isMobile ? 44 : undefined }}>
                    <ListItemIcon>
                        <SaveIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Save Sessions</ListItemText>
                </MenuItem>
                <MenuItem onClick={restoreSavedSessions} disabled={savedCount === 0 || !terminalAvailable} sx={{ minHeight: isMobile ? 44 : undefined }}>
                    <ListItemIcon>
                        <FolderOpenIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Restore Sessions ({savedCount})</ListItemText>
                </MenuItem>
            </Menu>

            <PodPickerDialog open={podPickerOpen} onClose={() => setPodPickerOpen(false)} onPick={handlePodPicked} />
        </Box>
    );
};

const EnhancedTerminalSettings: React.FC = () => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2">
                Adds a Terminal page to the sidebar with tabs for local shells and pod shells. Save the open tabs and
                restore them later; restored tabs start fresh shells.
            </Typography>
        </Box>
    );
};

registerPlugin({
    id: PLUGIN_ID,
    label: 'Enhanced Terminal',
    description: 'Multi-tab terminal with session persistence and saved workspace support',
    enabledByDefault: false,
    category: 'utility',
    SettingsPanel: EnhancedTerminalSettings,
    lifecycle: {
        onEnable: () => registerPluginSidebarEntry({
            pluginId: PLUGIN_ID,
            id: 'terminal',
            label: 'Terminal',
            icon: 'Terminal',
            component: EnhancedTerminalPanel,
            topLevel: true,
            category: 'utility',
        }),
    },
    capabilities: {
        summary: 'Terminal page with tabs for local and pod shells, plus save/restore of open sessions',
        tools: [],
    },
    runtimeCapabilities: {
        sidebar: true,
    },
});
