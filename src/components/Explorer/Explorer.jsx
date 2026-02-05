import { useEffect, useMemo, useState } from 'react';
import { DndContext, useDroppable, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { nodeService } from '../../services/nodeService';
import { searchService } from '../../services/searchService';
import { useDeleteConfirm } from '../../hooks/useDeleteConfirm';
import {
  CollapseIcon,
  DeleteIcon,
  DuplicateIcon,
  FileAddIcon,
  FolderAddIcon,
  RefreshIcon,
  RenameIcon,
  SearchIcon,
} from '../../assets/icons.jsx';
import { Tree } from './Tree';
import { ContextMenu } from './ContextMenu';
import { CreateInlineRow } from './CreateInlineRow';

export const Explorer = ({
  tree,
  selected,
  onSelect,
  collapsedIds,
  toggleCollapse,
  loading,
  error,
  onCreated,
  onOpenSettings,
  width,
  onRefresh,
  onCollapseAll,
  onThemeToggle,
}) => {
  const [creating, setCreatingState] = useState(null); // { parentNode, type }
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, type, node }
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [activeDragNode, setActiveDragNode] = useState(null);

  // Activation constraint: drag only starts after 5px movement
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Compute filtered tree
  const displayedTree = useMemo(() => {
    return searchService.filterTree(tree, debouncedQuery);
  }, [tree, debouncedQuery]);

  // If searching, force expand everything (passed as empty set of collapsed IDs)
  // Otherwise use the actual collapsedIds
  const effectiveCollapsedIds = useMemo(() => {
    return debouncedQuery ? new Set() : collapsedIds;
  }, [debouncedQuery, collapsedIds]);

  const { setNodeRef: setRootDropRef, isOver: isOverRoot } = useDroppable({
    id: 'ROOT',
    data: { type: 'FOLDER', id: 'ROOT' },
  });

  const handleDragStart = (event) => {
    setActiveDragNode(event.active.data.current);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveDragNode(null);
    if (!over) return;

    // Don't do anything if dropped on itself
    if (active.id === over.id) return;

    const nodeId = active.id;
    const newParentId = over.id === 'ROOT' ? null : over.id;

    // TODO: optimization - check if parent is already correct before API call

    try {
      setSaving(true);
      await nodeService.moveNode(nodeId, newParentId);
      onCreated?.();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to move node");
    } finally {
      setSaving(false);
    }
  };

  const startCreate = (type, parentOverride = undefined) => {
    // defaults to root (null) if not specified
    const parentNode = parentOverride ?? null;

    // Expand parent if creating inside a collapsed folder
    if (parentNode && parentNode.id && collapsedIds.has(parentNode.id)) {
      toggleCollapse(parentNode.id);
    }

    setCreatingState({ parentNode, type });
    setDraftName('');
    closeContext();
  };


  const cancelRename = () => {
    setEditingId(null);
    setEditName('');
  };

  const closeContext = () => setContextMenu(null);

  useEffect(() => {
    const handleGlobalDown = (event) => {
      if (event.target.closest('.context-menu')) return;
      closeContext();
    };
    window.addEventListener('mousedown', handleGlobalDown);
    return () => window.removeEventListener('mousedown', handleGlobalDown);
  }, []);

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    if (!creating?.type || !draftName.trim()) return;
    try {
      setSaving(true);
      const parentNode = creating.parentNode
        ? {
          id: creating.parentNode.id,
          path: creating.parentNode.path,
          children: creating.parentNode.children,
        }
        : null;
      await nodeService.createNode({ name: draftName.trim(), type: creating.type, parentNode });
      setDraftName('');
      setCreatingState(null);
      onCreated?.();
    } catch (err) {
      alert(err?.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const cancelCreate = () => {
    setCreatingState(null);
    setDraftName('');
  };

  const startRename = (node) => {
    setEditingId(node.id);
    setEditName(node.name);
    closeContext();
  };

  const handleRenameSubmit = async () => {
    if (!editingId || !editName.trim()) {
      setEditingId(null);
      setEditName('');
      return;
    }
    try {
      setSaving(true);
      await nodeService.renameNode(editingId, editName.trim());
      await onCreated?.();
    } catch (err) {
      alert(err?.message || 'Failed to rename');
    } finally {
      setSaving(false);
      setEditingId(null);
      setEditName('');
    }
  };

  const performDelete = async (node) => {
    closeContext();
    try {
      setSaving(true);
      await nodeService.deleteNodeRecursive(node.id);
      onSelect(null);
      await onCreated?.();
    } catch (err) {
      alert(err?.message || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  // --- Deletion Hook ---
  const { requestDelete, DeleteModal } = useDeleteConfirm({
    onDelete: performDelete
  });

  const handleDelete = (node) => {
    if (node?.type === 'FOLDER' && node.children?.length) {
      requestDelete(node); // Use the hook to trigger modal
      closeContext();
      return;
    }
    performDelete(node);
  };

  const handleDuplicate = async (node) => {
    closeContext();
    try {
      setSaving(true);
      await nodeService.duplicateNode(node.id);
      await onCreated?.();
    } catch (err) {
      alert(err?.message || 'Failed to duplicate');
    } finally {
      setSaving(false);
    }
  };

  const renderCreateRow = (depth) => (
    <CreateInlineRow
      key="__inline__"
      depth={depth}
      type={creating?.type}
      draftName={draftName}
      setDraftName={setDraftName}
      onSubmit={handleCreate}
      onCancel={cancelCreate}
    />
  );



  const rootMenuItems = [
    {
      label: 'New File',
      icon: <FileAddIcon size={14} strokeWidth={1.1} />,
      onClick: () => startCreate('LEAF'),
    },
    {
      label: 'New Folder',
      icon: <FolderAddIcon size={14} strokeWidth={1.1} />,
      onClick: () => startCreate('FOLDER'),
    },
    {
      label: 'Refresh',
      icon: <RefreshIcon size={14} strokeWidth={1.1} />,
      onClick: () => onRefresh?.(),
    },
  ];

  const nodeMenuItems = (node) => ([
    ...(node.type === 'FOLDER'
      ? [
        {
          label: 'New File',
          icon: <FileAddIcon size={14} strokeWidth={1.1} />,
          onClick: () => startCreate('LEAF', node),
        },
        {
          label: 'New Folder',
          icon: <FolderAddIcon size={14} strokeWidth={1.1} />,
          onClick: () => startCreate('FOLDER', node),
        },
      ]
      : []),
    {
      label: 'Rename',
      icon: <RenameIcon size={14} strokeWidth={1.1} />,
      onClick: () => startRename(node),
    },
    {
      label: 'Duplicate',
      icon: <DuplicateIcon size={14} strokeWidth={1.1} />,
      onClick: () => handleDuplicate(node),
    },
    {
      label: 'Delete',
      icon: <DeleteIcon size={14} strokeWidth={1.1} />,
      onClick: () => handleDelete(node),
    },
  ]);

  const handleContextMenuNode = (e, node) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'node', node });
  };

  const handleContextMenuRoot = (e) => {
    if (e.target.closest('.tree__node')) return; // let node handler win
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'root', node: null });
  };

  /* Search Input included in topbar or just below */
  const searchInput = (
    <div className="sidebar__search">
      <div className="search-input-wrapper">
        <SearchIcon size={14} className="search-icon" />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')}>×</button>
        )}
      </div>
    </div>
  );

  const treeBody = (displayedTree.length > 0 || creating) ? (
    <Tree
      nodes={displayedTree}
      selectedId={selected?.id}
      onSelect={onSelect}
      collapsedIds={effectiveCollapsedIds}
      toggleCollapse={toggleCollapse}
      creating={creating}
      renderCreateRow={renderCreateRow}
      onContextMenu={handleContextMenuNode}
      editingId={editingId}
      editName={editName}
      setEditName={setEditName}
      onRenameSubmit={handleRenameSubmit}
      onRenameCancel={cancelRename}
    />
  ) : (
    debouncedQuery ? <div className="hint">No matches found.</div> : null
  );

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <aside
        className={`sidebar`}
        style={{ width: `${width}px` }}
        onClick={(e) => {
          // Fix: Do not deselect when clicking empty sidebar space
          // onSelect(null);
        }}
        onContextMenu={handleContextMenuRoot}
      >
        <div className="sidebar__topbar sidebar__topbar--compact">

          {searchInput}

          <div className="sidebar__actions sidebar__actions--icons">
            <button className="icon-btn" title="New File" onClick={(e) => { e.stopPropagation(); startCreate('LEAF'); }}>
              <FileAddIcon size={16} strokeWidth={1.2} />
            </button>
            <button className="icon-btn" title="New Folder" onClick={(e) => { e.stopPropagation(); startCreate('FOLDER'); }}>
              <FolderAddIcon size={16} strokeWidth={1.2} />
            </button>
            <button className="icon-btn" title="Refresh" onClick={(e) => { e.stopPropagation(); onRefresh?.(); }}>
              <RefreshIcon size={16} strokeWidth={1.2} />
            </button>
            <button className="icon-btn" title="Collapse All" onClick={(e) => { e.stopPropagation(); onCollapseAll?.(); }}>
              <CollapseIcon size={16} strokeWidth={1.2} />
            </button>
          </div>
        </div>

        {loading && <div className="hint">Loading…</div>}
        {error && <div className="form__error">{error}</div>}
        {!loading && !tree.length && <div className="hint">No nodes yet. Add your first folder.</div>}
        {treeBody}

        {/* Root Drop Zone */}
        <div
          ref={setRootDropRef}
          className={`sidebar__root-area ${isOverRoot ? 'sidebar__root-area--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            // Fix: Do not deselect
            // onSelect(null);
          }}
        >
          {/* Fill empty space */}
        </div>
        {/* Footer buttons removed - settings accessible from header */}
        {contextMenu ? (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenu.type === 'node' ? nodeMenuItems(contextMenu.node) : rootMenuItems}
            onClose={closeContext}
          />
        ) : null}

        {/* Render the hook's modal */}
        {DeleteModal}

        <DragOverlay dropAnimation={null}>
          {activeDragNode ? (
            <div className="tree__node tree__node--preview">
              <span className="tree__icon">{activeDragNode.type === 'FOLDER' ? '📂' : '📄'}</span>
              <span className="tree__label">{activeDragNode.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </aside>
    </DndContext>
  );
};
