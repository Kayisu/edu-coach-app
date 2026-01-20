import { TreeNode } from './TreeNode';

export const Tree = ({ nodes, selectedId, onSelect, collapsedIds, toggleCollapse, creating, renderCreateRow, onContextMenu, editingId, editName, setEditName, onRenameSubmit, onRenameCancel }) => (
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
