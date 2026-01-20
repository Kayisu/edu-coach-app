import { useEffect, useRef } from 'react';

export const CreateInlineRow = ({ depth, type, draftName, setDraftName, onSubmit, onCancel }) => {
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
