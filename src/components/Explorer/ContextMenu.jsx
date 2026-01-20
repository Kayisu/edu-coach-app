export const ContextMenu = ({ x, y, items, onClose }) => {
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
