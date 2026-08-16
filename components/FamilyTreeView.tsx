import React, { useCallback, useEffect, useState } from 'react';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, addEdge, Connection, Edge, Node, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Family, User } from '../types';
import { updateFamilyTree } from '../services/firestore';
import { CloseIcon, EditIcon, CheckIcon } from './icons';

interface FamilyTreeViewProps {
    family: Family;
    currentUser: User;
    onClose: () => void;
    onSelectMember: (user: User) => void;
}

// Custom Node Component to display Avatar & Name nicely
const FamilyNode = ({ data }: { data: { label: string; avatarUrl: string; role: string; relationship?: string; status?: string; suspended?: boolean; isSelected?: boolean } }) => {
    return (
        <div className={`flex flex-col items-center p-2 rounded-xl transition-all ${data.isSelected ? 'ring-4 ring-brand-400 scale-110' : 'hover:scale-105'}`}>
            <div className="relative">
                <div className={`w-16 h-16 rounded-full overflow-hidden border-4 shadow-lg ${data.role === 'parent' ? 'border-brand-500' : 'border-green-400'}`}>
                    <img src={data.avatarUrl} alt={data.label} className="w-full h-full object-cover" />
                </div>
                {data.status === 'pending' && (
                    <div className="absolute -top-1.5 -right-2 bg-amber-400 text-amber-950 text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md">
                        PENDING
                    </div>
                )}
                {data.suspended && (
                    <div className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md">
                        SUSPENDED
                    </div>
                )}
            </div>
            <div className="mt-2 bg-white/90 dark:bg-black/80 px-3 py-1 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center min-w-[100px] text-center">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{data.label}</span>
                {data.relationship && (
                    <span className="text-[9px] text-brand-600 dark:text-brand-300 font-bold uppercase tracking-wider mt-0.5">
                        {data.relationship}
                    </span>
                )}
            </div>
        </div>
    );
};

const nodeTypes = {
    familyMember: FamilyNode,
};

const FamilyTreeView: React.FC<FamilyTreeViewProps> = ({ family, currentUser, onClose, onSelectMember }) => {
    const isParent = currentUser.role === 'parent';
    const [isEditing, setIsEditing] = useState(false);

    // Initial Nodes & Edges
    const initialNodes: Node[] = family.treeGraph?.nodes || family.members.map((member, index) => ({
        id: member.id,
        type: 'familyMember',
        position: { x: 250 + (index * 150), y: 100 + (index % 2 * 100) }, // Simple initial scatter
        data: { label: member.name, avatarUrl: member.avatarUrl, role: member.role, relationship: member.relationship, status: member.status, suspended: member.suspended },
    }));

    const initialEdges: Edge[] = family.treeGraph?.edges || [];

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Sync nodes with family members (in case new members joined since last graph save)
    useEffect(() => {
        setNodes((currentNodes) => {
            const existingIds = new Set(currentNodes.map(n => n.id));
            const newMembers = family.members.filter(m => !existingIds.has(m.id));

            if (newMembers.length === 0) {
                // Update existing node data if status or details changed
                return currentNodes.map(node => {
                    const member = family.members.find(m => m.id === node.id);
                    if (!member) return node;
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            label: member.name,
                            avatarUrl: member.avatarUrl,
                            role: member.role,
                            relationship: member.relationship,
                            status: member.status,
                            suspended: member.suspended
                        }
                    };
                });
            }

            const newNodes = newMembers.map((member, index) => ({
                id: member.id,
                type: 'familyMember',
                position: { x: 50, y: 50 + (index * 100) }, // Place new members on side
                data: { label: member.name, avatarUrl: member.avatarUrl, role: member.role, relationship: member.relationship, status: member.status, suspended: member.suspended },
            }));

            return [...currentNodes, ...newNodes];
        });
    }, [family.members]);

    const onConnect = useCallback(
        (params: Connection) => {
            if (!isEditing) return; // Only allow connections in edit mode
            setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds));
        },
        [isEditing, setEdges],
    );

    const onNodeClick = (_event: React.MouseEvent, node: Node) => {
        if (isEditing) return; // Don't select when editing layout

        // Find the actual user object
        const member = family.members.find(m => m.id === node.id);
        if (member) {
            onSelectMember(member);
        }
    };

    const handleSave = async () => {
        // Simplify nodes to store minimal data required for reconstruction
        const simplifiedNodes = nodes.map(n => ({
            id: n.id,
            position: n.position,
            data: n.data
        }));

        const simplifiedEdges = edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label as string
        }));

        const treeData = {
            nodes: simplifiedNodes,
            edges: simplifiedEdges
        };

        try {
            await updateFamilyTree(family.id, treeData);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save tree:", error);
            alert("Failed to save changes. Please try again.");
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-50 flex flex-col animate-fade-in">
            {/* Header Toolbar */}
            <div className="h-16 bg-white dark:bg-black/50 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 shadow-sm z-10">
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                    <span className="text-2xl">🌳</span> {family.name}
                </h2>

                <div className="flex items-center gap-3">
                    {isParent && (
                        <button
                            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${isEditing
                                    ? 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/30'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {isEditing ? <><CheckIcon className="w-5 h-5" /> Save Layout</> : <><EditIcon className="w-5 h-5" /> Edit Tree</>}
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                    >
                        <CloseIcon className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Graph Area */}
            <div className="flex-grow w-full h-full bg-grid-pattern overflow-hidden relative">
                {isEditing && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-full text-sm font-medium z-10 shadow-sm border border-yellow-200 dark:border-yellow-800 pointer-events-none">
                        ✏️ Drag to move • Drag between dots to connect
                    </div>
                )}

                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={isEditing ? onEdgesChange : undefined} // Lock edges when not editing
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    nodeTypes={nodeTypes}
                    fitView
                    nodesDraggable={isEditing}
                    nodesConnectable={isEditing}
                    elementsSelectable={true}
                    defaultEdgeOptions={{ type: 'smoothstep', animated: true, style: { strokeWidth: 2, stroke: '#6366f1' } }}
                    className={isEditing ? 'cursor-grab bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-black'}
                >
                    <Background color="#94a3b8" gap={20} size={1} />
                    <Controls showInteractive={false} />
                </ReactFlow>
            </div>
        </div>
    );
};

export default FamilyTreeView;
