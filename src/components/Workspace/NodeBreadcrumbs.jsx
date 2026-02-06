import React from 'react';

export const NodeBreadcrumbs = ({ path }) => {
    const parts = path?.split('/').filter(Boolean) || [];
    const trail = ['Home', ...parts];

    return (
        <div className="breadcrumbs">
            {trail.map((p, idx) => (
                <span key={idx} className="breadcrumbs__item">
                    {p}
                    {idx < trail.length - 1 && <span className="breadcrumbs__sep">/</span>}
                </span>
            ))}
        </div>
    );
};
