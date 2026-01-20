import { useDraggable, useDroppable } from '@dnd-kit/core';

export const TreeNode = ({
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

    // DnD Hooks
    const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
        id: node.id,
        data: node,
    });

    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: node.id,
        data: node,
        disabled: !isFolder, // only folders are drop targets
    });

    // When using DragOverlay, the source item should act as a static placeholder.
    // We hide it (opacity 0) and do NOT apply transform so the "gap" stays in place.
    const style = {
        opacity: isDragging ? 0 : 1,
    };

    // Combine refs (drag handle on the button/row)
    const setCombinedRef = (el) => {
        setDragRef(el);
        if (isFolder) setDropRef(el);
    };

    return (
        <li className="tree__item" data-depth={depth} onClick={(e) => e.stopPropagation()}>
            <div className={`tree__line tree__line--vertical ${depth === 0 ? 'tree__line--root' : ''}`} />
            <button
                ref={setCombinedRef}
                className={`tree__node ${isActive ? 'tree__node--active' : ''} ${isOver ? 'tree__node--drop-target' : ''}`}
                style={{ ...style, paddingLeft: 12 + depth * 14 }}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(node);
                }}
                onContextMenu={(e) => onContextMenu(e, node)}
                {...listeners}
                {...attributes}
            >
                <span
                    className="tree__caret"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isFolder && hasChildren) toggleCollapse(node.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag when clicking caret
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
            {/* Klasör içeriği ve Yeni Oluşturma Satırı */}
            {isFolder && (
                // Eğer klasör açıksa VEYA şu an bu klasöre bir şey ekleniyorsa içeriği göster
                (!isCollapsed || creating?.parentNode?.id === node.id) ? (
                    <ul className="tree">
                        {node.children?.map((child) => (
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
                        {/* Sadece bu klasör seçiliyse yeni satırı ekle */}
                        {creating?.parentNode?.id === node.id && renderCreateRow(depth + 1)}
                    </ul>
                ) : null
            )}
        </li>
    );
};
