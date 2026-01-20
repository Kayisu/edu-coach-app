import { useEffect, useMemo, useRef, useState } from 'react';
import { nodeService } from '../services/nodeService';
import { useDeleteConfirm } from '../hooks/useDeleteConfirm';
import {
  CollapseIcon,
  DeleteIcon,
  DuplicateIcon,
  FileAddIcon,
  FolderAddIcon,
  RefreshIcon,
  RenameIcon,
} from '../assets/icons';

const ContextMenu = ({ x, y, items, onClose }) => {
  if (!items?.length) return null;
  return (
    <div className="context-menu" style={{ top: y, left: x }}>
      {items.map((item) => (
        <button
          key={item.label}
          className="context-menu__item"
          onClick={() => {
            item.onClick();
            onClose?.();
          }}
        >
          <span className="context-menu__icon" aria-hidden>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

const CreateInlineRow = ({ depth, type, draftName, setDraftName, onSubmit, onCancel }) => {
  const inputRef = useRef(null);
  const icon = type === 'FOLDER' ? '📂' : '📄';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <li className="tree__item" data-depth={depth} onClick={(e) => e.stopPropagation()}>
      <div className={`tree__line tree__line--vertical ${depth === 0 ? 'tree__line--root' : ''}`} />
      <form
        className="tree__node tree__node--inline"
        style={{ paddingLeft: 12 + depth * 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit();
          }
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            onCancel();
          }
        }}
      >
        <span className="tree__icon" aria-hidden>
          {icon}
        </span>
        <input
          ref={inputRef}
          className="tree__input"
          placeholder={type === 'FOLDER' ? 'New folder' : 'New file'}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </form>
    </li>
  );
};

const TreeNode = ({
  node,
  depth,
  selectedId,
  onSelect,
  collapsedIds,
  toggleCollapse,
  creating,
  renderCreateRow,
    onContextMenu,
    editingId,
    editName,
    setEditName,
    onRenameSubmit,
    onRenameCancel,
  }) => {
  const isActive = selectedId === node.id;
  const isFolder = node.type === 'FOLDER';
  const isCollapsed = collapsedIds.has(node.id);
  const hasChildren = Boolean(node.children?.length);
  const icon = isFolder ? (isCollapsed ? '📁' : '📂') : '📄';
  const caret = isFolder && hasChildren ? (isCollapsed ? '▶' : '▼') : '•';

  return (
    <li className="tree__item" data-depth={depth} onClick={(e) => e.stopPropagation()}>
      <div className={`tree__line tree__line--vertical ${depth === 0 ? 'tree__line--root' : ''}`} />
      <button
        className={`tree__node ${isActive ? 'tree__node--active' : ''}`}
        style={{ paddingLeft: 12 + depth * 14 }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node);
        }}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        <span
          className="tree__caret"
          onClick={(e) => {
            e.stopPropagation();
            if (isFolder && hasChildren) toggleCollapse(node.id);
          }}
        >
          {caret}
        </span>
        <span className="tree__icon" aria-hidden>
          {icon}
        </span>
        {editingId === node.id ? (
          <input
            className="tree__input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onRenameSubmit();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                onRenameCancel();
              }
            }}
            onBlur={() => onRenameCancel()}
            autoFocus
          />
        ) : (
          <span className="tree__label">{node.name}</span>
        )}
        {isActive && <span className="tree__accent" />}
      </button>
      {isFolder && hasChildren && !isCollapsed ? (
        <ul className="tree">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              collapsedIds={collapsedIds}
              toggleCollapse={toggleCollapse}
              creating={creating}
              renderCreateRow={renderCreateRow}
              onContextMenu={onContextMenu}
              editingId={editingId}
              editName={editName}
              setEditName={setEditName}
              onRenameSubmit={onRenameSubmit}
              onRenameCancel={onRenameCancel}
            />
          ))}
          {creating?.parentNode?.id === node.id ? renderCreateRow(depth + 1) : null}
        </ul>
      ) : null}
      {isFolder && (!hasChildren || isCollapsed) && creating?.parentNode?.id === node.id && !isCollapsed
        ? <ul className="tree">{renderCreateRow(depth + 1)}</ul>
        : null}
    </li>
  );
};

const Tree = ({ nodes, selectedId, onSelect, collapsedIds, toggleCollapse, creating, renderCreateRow, onContextMenu, editingId, editName, setEditName, onRenameSubmit, onRenameCancel }) => (
  <ul className="tree">
    {nodes.map((node) => (
      <TreeNode
        key={node.id}
        node={node}
        depth={0}
        selectedId={selectedId}
        onSelect={onSelect}
        collapsedIds={collapsedIds}
        toggleCollapse={toggleCollapse}
        creating={creating}
        renderCreateRow={renderCreateRow}
        onContextMenu={onContextMenu}
        editingId={editingId}
        editName={editName}
        setEditName={setEditName}
        onRenameSubmit={onRenameSubmit}
        onRenameCancel={onRenameCancel}
      />
    ))}
    {creating?.parentNode === null ? renderCreateRow(0) : null}
  </ul>
);

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

  const findNodeById = useMemo(() => (id) => {
    if (!id) return null;
    const stack = [...tree];
    while (stack.length) {
      const node = stack.pop();
      if (node.id === id) return node;
      if (node.children?.length) stack.push(...node.children);
    }
    return null;
  }, [tree]);

  const startCreate = (type, parentOverride = undefined) => {
    let parentNode = parentOverride ?? null;
    if (!parentNode && selected) {
      if (selected.type === 'FOLDER') {
        parentNode = selected;
      } else if (selected.parent_id) {
        parentNode = findNodeById(selected.parent_id);
        if (!parentNode && selected.path) {
          const parentPath = selected.path.replace(/\/?[^/]+$/, '') || '/';
          parentNode = { id: selected.parent_id, path: parentPath, children: [] };
        }
      }
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
    // If it's a folder with children, or any node really, we might want confirmation.
    // The previous logic checked for children content, but generally confirmation is good.
    // If you want strict logic:
    if (node?.type === 'FOLDER' && node.children?.length) {
      requestDelete(node); // Use the hook to trigger modal
      closeContext();
      return;
    }
    // Direct delete if empty? Or just confirm always?
    // User logic was: if folder has children, confirm. Else just delete.
    // Let's keep that logic but use the hook for the confirmation part.
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

const treeBody = (tree.length > 0 || creating) ? (
    <Tree
      nodes={tree}
      selectedId={selected?.id}
      onSelect={onSelect} 
      collapsedIds={collapsedIds}
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
  ) : null;

  return (
    <aside
      className="sidebar"
      style={{ width: `${width}px` }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
      onContextMenu={handleContextMenuRoot}
    >
      <div className="sidebar__topbar sidebar__topbar--compact">
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
      <div className="sidebar__footer">
        <button
          className="chip chip--tiny"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings?.();
          }}
        >
          ⚙ Settings
        </button>
        {onThemeToggle && (
          <button
            className="chip chip--tiny"
            onClick={(e) => {
              e.stopPropagation();
              onThemeToggle();
            }}
          >
            Theme
          </button>
        )}
      </div>
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
    </aside>
  );
};
