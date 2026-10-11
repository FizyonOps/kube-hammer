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
    Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardCommandKeyIcon from '@mui/icons-material/KeyboardCommandKey';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useIsMobile } from '../hooks/useMediaQuery';
import ClearIcon from '@mui/icons-material/Clear';
import { registerPlugin } from './registry';
import { unregisterPluginShortcuts } from '../services/shortcuts/ShortcutRegistry';

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

const CommandPalette: React.FC = () => {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    // Mock data for resources
    const resourceTypes = [{ id: 'pods', label: 'Pods', icon: 'Pods' }, { id: 'deployments', label: 'Deployments', icon: 'Deployments' }];
    const resources: Record<string, any[]> = { pods: [], deployments: [] };
    const loading = false;
    const refresh = () => {};

    // Build command list from resources and actions
    const commands = useMemo<CommandItem[]>(() => {
        const items: CommandItem[] = [];

        // Add common actions
        items.push(
            {
                id: 'action-logs',
                title: 'View Pod Logs',
                subtitle: 'Open logs for a specific pod',
                category: 'action',
                action: () => {
                    window.location.hash = '#/pods';
                    setOpen(false);
                },
                keywords: ['logs', 'pod', 'container', 'view'],
            },
            {
                id: 'action-exec',
                title: 'Execute in Pod',
                subtitle: 'Open shell in a running container',
                category: 'action',
                action: () => {
                    window.location.hash = '#/terminal';
                    setOpen(false);
                },
                keywords: ['exec', 'shell', 'terminal', 'bash', 'sh'],
            },
            {
                id: 'action-describe',
                title: 'Describe Resource',
                subtitle: 'Get detailed resource information',
                category: 'action',
                action: () => setOpen(false),
                keywords: ['describe', 'get', 'details', 'yaml'],
            },
            {
                id: 'nav-settings',
                title: 'Settings',
                subtitle: 'Open application settings',
                category: 'navigation',
                action: () => {
                    window.location.hash = '#/settings';
                    setOpen(false);
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
                    setOpen(false);
                },
                keywords: ['plugins', 'extensions', 'marketplace'],
            },
        );

        return items;
    }, [resources, resourceTypes]);

    // Filter commands based on query
    const filteredCommands = useMemo(() => {
        if (!query.trim()) return commands.slice(0, 10);
        const lowerQuery = query.toLowerCase();
        return commands
            .filter(cmd =>
                cmd.title.toLowerCase().includes(lowerQuery) ||
                cmd.subtitle?.toLowerCase().includes(lowerQuery) ||
                cmd.keywords.some(k => k.toLowerCase().includes(lowerQuery))
            )
            .slice(0, 15);
    }, [commands, query]);

    // Reset selection when filtered results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [filteredCommands.length]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + K to open
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
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

    return (
        <Dialog
            open={open}
            onClose={() => setOpen(false)}
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
                                    <IconButton size="small" onClick={() => setQuery('')}>
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
                            }}>No results found</Typography>
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
                        K to open
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
                        {filteredCommands.length} results
                    </Typography>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

const CommandPaletteButton: React.FC = () => {
    const [open, setOpen] = useState(false);

    return (
        <Box sx={{ display: 'none' }}>
            <CommandPalette />
        </Box>
    );
};

registerPlugin({
    id: PLUGIN_ID,
    label: 'Command Palette',
    description: 'Quick search and navigation with Cmd+K / Ctrl+K keyboard shortcut',
    enabledByDefault: false,
    category: 'utility',

    lifecycle: {
        onEnable: () => {
            // Register the palette component
            const container = document.createElement('div');
            container.id = 'command-palette-container';
            document.body.appendChild(container);

            return () => {
                unregisterPluginShortcuts(PLUGIN_ID);
                container.remove();
            };
        },
    },
    capabilities: {
        summary: 'Quick search and navigation across resources, actions, and settings using Cmd+K',
        tools: [],
    },
    runtimeCapabilities: {
        slots: [],
    },
});
