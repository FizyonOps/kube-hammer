import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Box,
    Dialog,
    DialogContent,
    TextField,
    List,
    ListItemText,
    ListItemIcon,
    Typography,
    Chip,
    IconButton,
    InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardCommandKeyIcon from '@mui/icons-material/KeyboardCommandKey';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useIsMobile } from '../hooks/useMediaQuery';
import ClearIcon from '@mui/icons-material/Clear';
import { registerPlugin } from './registry';
import { registerPluginSlot, unregisterPluginSlot } from './slotUtils';
import { registerShortcut, unregisterPluginShortcuts } from '../services/shortcuts/ShortcutRegistry';

const PLUGIN_ID = 'command-palette';

interface CommandItem {
    id: string;
    title: string;
    subtitle?: string;
    category: 'resource' | 'action' | 'navigation' | 'plugin';
    icon?: string;
    shortcut?: string;
    action: () => void;
    keywords: string[];
}

interface IndexedResource {
    type: string;
    kind: string;
    name: string;
    namespace: string;
    nameLower: string;
}

interface ResourceKind {
    type: string;
    label: string;
    keywords: string[];
}

// Keyed by the `.kind` kubectl reports; `type` is the resource list id the app navigates to.
const RESOURCE_KINDS: Record<string, ResourceKind> = {
    Pod: { type: 'pods', label: 'Pods', keywords: ['po', 'logs', 'exec', 'shell', 'container'] },
    Deployment: { type: 'deployments', label: 'Deployments', keywords: ['deploy', 'workload'] },
    StatefulSet: { type: 'statefulsets', label: 'StatefulSets', keywords: ['sts', 'workload'] },
    DaemonSet: { type: 'daemonsets', label: 'DaemonSets', keywords: ['ds', 'workload'] },
    Job: { type: 'jobs', label: 'Jobs', keywords: ['workload'] },
    CronJob: { type: 'cronjobs', label: 'CronJobs', keywords: ['cj', 'schedule'] },
    Service: { type: 'services', label: 'Services', keywords: ['svc', 'network'] },
    Ingress: { type: 'ingresses', label: 'Ingresses', keywords: ['ing', 'network'] },
    ConfigMap: { type: 'configmaps', label: 'ConfigMaps', keywords: ['cm', 'config'] },
    Node: { type: 'nodes', label: 'Nodes', keywords: ['no', 'cluster'] },
    Namespace: { type: 'namespaces', label: 'Namespaces', keywords: ['ns', 'cluster'] },
};

const NAVIGATION_TYPES: ResourceKind[] = [
    ...Object.values(RESOURCE_KINDS),
    { type: 'events', label: 'Events', keywords: ['ev', 'warnings'] },
];

const RESOURCE_TYPES_ARG = Object.values(RESOURCE_KINDS).map((kind) => kind.type).join(',');
const RESOURCE_JSONPATH = '{range .items[*]}{.kind}{"\\t"}{.metadata.namespace}{"\\t"}{.metadata.name}{"\\n"}{end}';
const RESOURCE_INDEX_TTL_MS = 60_000;
const MAX_COMMAND_RESULTS = 5;
const MAX_RESOURCE_RESULTS = 12;

// Shared across palette mounts; rebuilt when it is stale or the kube context changed.
let resourceIndex: { context: string; loadedAt: number; items: IndexedResource[] } | null = null;

const navigateToResource = (type: string, name?: string, namespace?: string): void => {
    window.dispatchEvent(new CustomEvent('globalSearchNavigate', {
        detail: name ? { type, name, namespace: namespace || undefined } : { type },
    }));
};

const loadResourceIndex = async (abortId: string): Promise<{ items: IndexedResource[]; error: string | null }> => {
    const result = await window.kubectl.execArgs(
        ['get', RESOURCE_TYPES_ARG, '--all-namespaces', '-o', `jsonpath=${RESOURCE_JSONPATH}`],
        { abortId },
    );
    const items = result.stdout
        .split('\n')
        .map((line) => line.split('\t'))
        .filter((parts) => parts.length === 3 && RESOURCE_KINDS[parts[0]] && parts[2])
        .map(([kind, namespace, name]) => ({
            type: RESOURCE_KINDS[kind].type,
            kind,
            namespace,
            name,
            nameLower: name.toLowerCase(),
        }));
    // A forbidden or missing type fails the call but kubectl still prints the types it could list.
    const error = result.code !== 0 && items.length === 0 ? (result.stderr.trim() || 'Could not list cluster resources.') : null;
    return { items, error };
};

const rankResource = (resource: IndexedResource, query: string): number => {
    if (resource.nameLower === query) return 0;
    if (resource.nameLower.startsWith(query)) return 1;
    if (resource.nameLower.includes(query)) return 2;
    if (`${resource.namespace}/${resource.nameLower}`.includes(query)) return 3;
    return -1;
};

const CommandPalette: React.FC = () => {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [resources, setResources] = useState<IndexedResource[]>(() => resourceIndex?.items ?? []);
    const [loading, setLoading] = useState(false);
    const [resourceError, setResourceError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const close = useCallback(() => setOpen(false), []);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        const abortId = `command-palette-${Date.now()}`;
        void (async () => {
            const context = await window.k8s?.getCurrentContext?.()
                .then((result) => result.context ?? '', () => '') ?? '';
            if (cancelled) return;
            if (resourceIndex && resourceIndex.context === context && Date.now() - resourceIndex.loadedAt < RESOURCE_INDEX_TTL_MS) {
                setResources(resourceIndex.items);
                return;
            }
            if (resourceIndex?.context !== context) {
                setResources([]);
            }
            if (!window.kubectl?.execArgs) {
                setResourceError('Resource search needs the desktop app.');
                return;
            }
            setLoading(true);
            setResourceError(null);
            try {
                const { items, error } = await loadResourceIndex(abortId);
                if (cancelled) return;
                resourceIndex = { context, loadedAt: Date.now(), items };
                setResources(items);
                setResourceError(error);
            } catch (loadError) {
                if (cancelled) return;
                setResourceError(loadError instanceof Error ? loadError.message : String(loadError));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
            setLoading(false);
            void window.kubectl?.abort?.(abortId).catch((): void => undefined);
        };
    }, [open]);

    const commands = useMemo<CommandItem[]>(() => [
        ...NAVIGATION_TYPES.map((kind): CommandItem => ({
            id: `nav-${kind.type}`,
            title: `Go to ${kind.label}`,
            subtitle: `Open the ${kind.label} list`,
            category: 'navigation',
            action: () => {
                navigateToResource(kind.type);
                close();
            },
            keywords: [kind.type, kind.label, ...kind.keywords],
        })),
        {
            id: 'nav-settings',
            title: 'Settings',
            subtitle: 'Open application settings',
            category: 'navigation',
            action: () => {
                window.location.hash = '#/settings';
                close();
            },
            keywords: ['settings', 'preferences', 'config'],
        },
        {
            id: 'nav-plugins',
            title: 'Plugin Manager',
            subtitle: 'Manage installed plugins',
            category: 'navigation',
            action: () => {
                window.location.hash = '#/plugins';
                close();
            },
            keywords: ['plugins', 'extensions'],
        },
        {
            id: 'nav-marketplace',
            title: 'Marketplace',
            subtitle: 'Browse and install plugins',
            category: 'navigation',
            action: () => {
                window.location.hash = '#/marketplace';
                close();
            },
            keywords: ['marketplace', 'install', 'store'],
        },
    ], [close]);

    const filteredCommands = useMemo<CommandItem[]>(() => {
        const lowerQuery = query.trim().toLowerCase();
        if (!lowerQuery) return commands.slice(0, 10);
        const matchingCommands = commands
            .filter(cmd =>
                cmd.title.toLowerCase().includes(lowerQuery) ||
                cmd.subtitle?.toLowerCase().includes(lowerQuery) ||
                cmd.keywords.some(k => k.toLowerCase().includes(lowerQuery))
            )
            .slice(0, MAX_COMMAND_RESULTS);
        const matchingResources = resources
            .map((resource) => ({ resource, rank: rankResource(resource, lowerQuery) }))
            .filter(({ rank }) => rank >= 0)
            .sort((a, b) => a.rank - b.rank || a.resource.name.length - b.resource.name.length || a.resource.name.localeCompare(b.resource.name))
            .slice(0, MAX_RESOURCE_RESULTS)
            .map(({ resource }): CommandItem => ({
                id: `resource-${resource.type}-${resource.namespace}-${resource.name}`,
                title: resource.name,
                subtitle: resource.namespace ? `${resource.kind} · ${resource.namespace}` : resource.kind,
                category: 'resource',
                action: () => {
                    navigateToResource(resource.type, resource.name, resource.namespace);
                    close();
                },
                keywords: [],
            }));
        return [...matchingCommands, ...matchingResources];
    }, [commands, resources, query, close]);

    // Reset selection when filtered results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [filteredCommands.length]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.isComposing) return;
            // Cmd/Ctrl + Shift + P to open (Cmd/Ctrl + K belongs to the built-in global search)
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                setOpen(true);
            }
            // Escape to close
            if (e.key === 'Escape' && open) {
                setOpen(false);
            }
            // Navigation
            if (open) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(i => Math.max(i - 1, 0));
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    filteredCommands[selectedIndex]?.action();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, filteredCommands, selectedIndex]);

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setQuery('');
        }
    }, [open]);

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'resource': return 'primary';
            case 'action': return 'success';
            case 'navigation': return 'info';
            case 'plugin': return 'warning';
            default: return 'default';
        }
    };

    const hasQuery = query.trim().length > 0;

    return (
        <Dialog
            open={open}
            onClose={close}
            maxWidth="sm"
            fullWidth
            fullScreen={isMobile}
            slotProps={{
                paper: {
                    sx: {
                        position: 'fixed',
                        top: 100,
                        m: 0,
                        maxHeight: { xs: '60dvh', md: '60vh' },
                    },
                }
            }}
        >
            <DialogContent sx={{ p: 0 }}>
                <TextField
                    inputRef={inputRef}
                    fullWidth
                    placeholder="Search resources, actions, or navigate..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    variant="standard"
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: query && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setQuery('')} aria-label="Clear search">
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                            sx: { px: 2, py: 1.5 },
                        }
                    }}
                />

                <List sx={{ maxHeight: { xs: '50dvh', md: '50vh' }, overflow: 'auto', py: 0 }}>
                    {filteredCommands.length === 0 ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography sx={{
                                color: 'text.secondary'
                            }}>{hasQuery && loading ? 'Searching cluster resources…' : 'No results found'}</Typography>
                        </Box>
                    ) : (
                        filteredCommands.map((cmd, index) => (
                            <Box
                                key={cmd.id}
                                component="div"
                                onClick={() => cmd.action()}
                                onPointerEnter={() => setSelectedIndex(index)}
                                sx={{
                                    cursor: 'pointer',
                                    bgcolor: index === selectedIndex ? 'action.selected' : 'transparent',
                                    '&:hover': { bgcolor: 'action.hover' },
                                    p: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    <Chip
                                        size="small"
                                        label={cmd.category}
                                        color={getCategoryColor(cmd.category) as any}
                                        sx={{ fontSize: '0.65rem', height: 20 }}
                                    />
                                </ListItemIcon>
                                <ListItemText
                                    primary={cmd.title}
                                    secondary={cmd.subtitle}
                                    slotProps={{
                                        primary: { sx: { fontWeight: 500 } }
                                    }}
                                />
                                {index === selectedIndex && (
                                    <ArrowForwardIcon fontSize="small" color="action" />
                                )}
                            </Box>
                        ))
                    )}
                </List>

                {resourceError && (
                    <Typography variant="caption" sx={{ display: 'block', px: 1.5, py: 0.5, color: 'warning.main' }}>
                        {resourceError}
                    </Typography>
                )}

                <Box sx={{
                    p: 1.5,
                    borderTop: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    gap: 2,
                    bgcolor: 'action.hover',
                }}>
                    <Typography variant="caption" sx={{
                        color: 'text.secondary'
                    }}>
                        <KeyboardCommandKeyIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                        ⇧P to open
                    </Typography>
                    <Typography variant="caption" sx={{
                        color: 'text.secondary'
                    }}>
                        ↑↓ to navigate
                    </Typography>
                    <Typography variant="caption" sx={{
                        color: 'text.secondary'
                    }}>
                        ↵ to select
                    </Typography>
                    <Typography variant="caption" sx={{
                        color: 'text.secondary'
                    }}>
                        ESC to close
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Typography variant="caption" sx={{
                        color: 'text.secondary'
                    }}>
                        {loading ? 'Indexing resources…' : `${filteredCommands.length} results`}
                    </Typography>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

registerPlugin({
    id: PLUGIN_ID,
    label: 'Command Palette',
    description: 'Search cluster resources and jump anywhere with Cmd/Ctrl+Shift+P',
    enabledByDefault: false,
    category: 'utility',

    lifecycle: {
        onEnable: () => {
            // The slot keeps the palette inside the app's theme and providers; it renders nothing until opened.
            registerPluginSlot({
                pluginId: PLUGIN_ID,
                slotName: 'toolbar-right',
                component: CommandPalette,
                priority: 90,
            });
            registerShortcut({
                id: 'command-palette-open',
                keys: ['ctrl', 'shift', 'p'],
                description: 'Open command palette',
                category: 'general',
                pluginId: PLUGIN_ID,
            });

            return () => {
                unregisterPluginShortcuts(PLUGIN_ID);
                unregisterPluginSlot(PLUGIN_ID, 'toolbar-right');
            };
        },
    },
    capabilities: {
        summary: 'Search cluster resources and navigate to resource lists, settings and plugins with Cmd/Ctrl+Shift+P',
        tools: [],
    },
    runtimeCapabilities: {
        slots: ['toolbar-right'],
    },
});
