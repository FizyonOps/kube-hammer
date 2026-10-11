import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip,
    Tooltip,
    Menu,
    MenuItem,
    Alert,
} from '@mui/material';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useIsMobile } from '../hooks/useMediaQuery';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudIcon from '@mui/icons-material/Cloud';
import ComputerIcon from '@mui/icons-material/Computer';
import { registerPlugin } from './registry';
import { registerPluginSlot, unregisterPluginSlot } from './slotUtils';
import { usePreference, useSetPreference } from '../store/preferences';

const PLUGIN_ID = 'workspace-manager';

interface Workspace {
    id: string;
    name: string;
    context: string;
    namespace?: string;
    color?: string;
    isDefault?: boolean;
    lastAccessed?: number;
}

const WORKSPACE_STORAGE_KEY = 'kube-hammer-workspaces';
const DEFAULT_COLORS = ['#2196f3', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

const WorkspaceManagerPanel: React.FC = () => {
    const isMobile = useIsMobile();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentContext, setCurrentContext] = useState<string>('');
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [newWorkspaceContext, setNewWorkspaceContext] = useState('');
    const [availableContexts, setAvailableContexts] = useState<string[]>([]);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

    // Load workspaces and current context
    useEffect(() => {
        try {
            const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY);
            if (saved) {
                setWorkspaces(JSON.parse(saved));
            }
        } catch (e) {
            console.warn('Failed to load workspaces:', e);
        }

        // Get current context from kubectl
        window.kubectl?.execCommand?.('kubectl config current-context').then((result: any) => {
            if (result.stdout) {
                setCurrentContext(result.stdout.trim());
            }
        }).catch(() => {
            // Fallback
        });

        // Get available contexts
        window.kubectl?.execCommand?.('kubectl config get-contexts -o name').then((result: any) => {
            if (result.stdout) {
                setAvailableContexts(result.stdout.trim().split('\n').filter(Boolean));
            }
        }).catch(() => {
            // Fallback
        });
    }, []);

    const saveWorkspaces = useCallback((updated: Workspace[]) => {
        setWorkspaces(updated);
        try {
            localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
            console.warn('Failed to save workspaces:', e);
        }
    }, []);

    const createWorkspace = () => {
        if (!newWorkspaceName || !newWorkspaceContext) return;

        const newWorkspace: Workspace = {
            id: `ws-${Date.now()}`,
            name: newWorkspaceName,
            context: newWorkspaceContext,
            color: DEFAULT_COLORS[workspaces.length % DEFAULT_COLORS.length],
            lastAccessed: Date.now(),
        };

        const updated = [...workspaces, newWorkspace];
        saveWorkspaces(updated);
        setCreateDialogOpen(false);
        setNewWorkspaceName('');
        setNewWorkspaceContext('');
    };

    const updateWorkspace = () => {
        if (!editingWorkspace || !newWorkspaceName) return;

        const updated = workspaces.map(ws =>
            ws.id === editingWorkspace.id
                ? { ...ws, name: newWorkspaceName, context: newWorkspaceContext || ws.context }
                : ws
        );
        saveWorkspaces(updated);
        setEditDialogOpen(false);
        setEditingWorkspace(null);
        setNewWorkspaceName('');
        setNewWorkspaceContext('');
    };

    const deleteWorkspace = (id: string) => {
        const updated = workspaces.filter(ws => ws.id !== id);
        saveWorkspaces(updated);
        setMenuAnchor(null);
    };

    const switchToWorkspace = async (workspace: Workspace) => {
        try {
            await window.kubectl?.execCommand?.(`kubectl config use-context ${workspace.context}`);
            setCurrentContext(workspace.context);

            // Update last accessed
            const updated = workspaces.map(ws =>
                ws.id === workspace.id ? { ...ws, lastAccessed: Date.now() } : ws
            );
            saveWorkspaces(updated);
        } catch (e) {
            console.error('Failed to switch context:', e);
        }
    };

    const openEditDialog = (workspace: Workspace) => {
        setEditingWorkspace(workspace);
        setNewWorkspaceName(workspace.name);
        setNewWorkspaceContext(workspace.context);
        setEditDialogOpen(true);
        setMenuAnchor(null);
    };

    const sortedWorkspaces = [...workspaces].sort((a, b) =>
        (b.lastAccessed || 0) - (a.lastAccessed || 0)
    );

    return (
        <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <WorkspacesIcon />
                <Typography variant="h6">Workspaces</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                >
                    New
                </Button>
            </Box>

            {workspaces.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                    No workspaces configured. Create one to quickly switch between clusters.
                </Alert>
            ) : (
                <List dense>
                    {sortedWorkspaces.map((workspace) => {
                        const isActive = currentContext === workspace.context;
                        return (
                            <ListItem
                                key={workspace.id}
                                secondaryAction={
                                    <IconButton
                                        edge="end"
                                        size="small"
                                        onClick={(e) => {
                                            setSelectedWorkspace(workspace);
                                            setMenuAnchor(e.currentTarget);
                                        }}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                }
                            >
                                <ListItemButton
                                    selected={isActive}
                                    onClick={() => switchToWorkspace(workspace)}
                                >
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <Box
                                            sx={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: '50%',
                                                bgcolor: workspace.color,
                                            }}
                                        />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {workspace.name}
                                                {isActive && (
                                                    <Chip
                                                        size="small"
                                                        label="Active"
                                                        color="success"
                                                        sx={{ height: 18, fontSize: '0.65rem' }}
                                                    />
                                                )}
                                            </Box>
                                        }
                                        secondary={workspace.context}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            )}

            {/* Current Context Info */}
            <Paper sx={{ mt: 2, p: 2, bgcolor: 'action.hover' }}>
                <Typography
                    variant="caption"
                    sx={{
                        color: 'text.secondary',
                        display: 'block'
                    }}>
                    Current Context
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CloudIcon fontSize="small" />
                    {currentContext || 'Unknown'}
                </Typography>
            </Paper>

            {/* Create Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
                <DialogTitle>Create New Workspace</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Workspace Name"
                        fullWidth
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        placeholder="e.g., Production, Staging, Development"
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        select
                        margin="dense"
                        label="Kubernetes Context"
                        fullWidth
                        value={newWorkspaceContext}
                        onChange={(e) => setNewWorkspaceContext(e.target.value)}
                        slotProps={{
                            select: { native: true }
                        }}
                    >
                        <option value="">Select a context...</option>
                        {availableContexts.map((ctx) => (
                            <option key={ctx} value={ctx}>{ctx}</option>
                        ))}
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={createWorkspace} variant="contained" disabled={!newWorkspaceName || !newWorkspaceContext}>
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
                <DialogTitle>Edit Workspace</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Workspace Name"
                        fullWidth
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        margin="dense"
                        label="Context"
                        fullWidth
                        value={newWorkspaceContext}
                        onChange={(e) => setNewWorkspaceContext(e.target.value)}
                        helperText="Changing context will switch to that cluster"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={updateWorkspace} variant="contained">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Context Menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
            >
                <MenuItem onClick={() => selectedWorkspace && openEditDialog(selectedWorkspace)}>
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    Edit
                </MenuItem>
                <MenuItem onClick={() => selectedWorkspace && deleteWorkspace(selectedWorkspace.id)}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <Typography color="error">Delete</Typography>
                </MenuItem>
            </Menu>
        </Box>
    );
};

const WorkspaceQuickSwitch: React.FC = () => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentContext, setCurrentContext] = useState<string>('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY);
            if (saved) {
                setWorkspaces(JSON.parse(saved));
            }
        } catch (e) {
            console.warn('Failed to load workspaces:', e);
        }

        window.kubectl?.execCommand?.('kubectl config current-context').then((result: any) => {
            if (result.stdout) {
                setCurrentContext(result.stdout.trim());
            }
        }).catch(() => {});
    }, []);

    const activeWorkspace = workspaces.find(ws => ws.context === currentContext);

    return (
        <>
            <Tooltip title="Switch Workspace" enterTouchDelay={0} leaveTouchDelay={1500}>
                <IconButton
                    size="small"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{
                        border: 1,
                        borderColor: 'divider',
                        bgcolor: activeWorkspace?.color ? `${activeWorkspace.color}20` : 'background.paper',
                    }}
                >
                    <WorkspacesIcon sx={{ fontSize: 18, color: activeWorkspace?.color }} />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
            >
                {workspaces.length === 0 ? (
                    <MenuItem disabled>No workspaces configured</MenuItem>
                ) : (
                    workspaces.map((ws) => (
                        <MenuItem
                            key={ws.id}
                            selected={ws.context === currentContext}
                            onClick={() => {
                                window.kubectl?.execCommand?.(`kubectl config use-context ${ws.context}`);
                                setAnchorEl(null);
                            }}
                        >
                            <ListItemIcon>
                                <Box
                                    sx={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        bgcolor: ws.color,
                                    }}
                                />
                            </ListItemIcon>
                            <ListItemText primary={ws.name} secondary={ws.context} />
                            {ws.context === currentContext && <CheckCircleIcon fontSize="small" color="success" />}
                        </MenuItem>
                    ))
                )}
            </Menu>
        </>
    );
};

registerPlugin({
    id: PLUGIN_ID,
    label: 'Workspace Manager',
    description: 'Save and quickly switch between Kubernetes contexts with named workspaces',
    enabledByDefault: false,
    category: 'utility',

    lifecycle: {
        onEnable: () => {
            registerPluginSlot({
                pluginId: PLUGIN_ID,
                slotName: 'sidebar-bottom',
                component: WorkspaceManagerPanel,
                priority: 60,
            });
            registerPluginSlot({
                pluginId: PLUGIN_ID,
                slotName: 'toolbar-right',
                component: WorkspaceQuickSwitch,
                priority: 70,
            });
            return () => {
                unregisterPluginSlot(PLUGIN_ID, 'sidebar-bottom');
                unregisterPluginSlot(PLUGIN_ID, 'toolbar-right');
            };
        },
    },
    capabilities: {
        summary: 'Named workspace management for quick context switching between clusters',
        tools: [],
    },
    runtimeCapabilities: {
        slots: ['sidebar-bottom', 'toolbar-right'],
    },
});
