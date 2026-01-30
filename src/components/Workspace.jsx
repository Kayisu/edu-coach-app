import { useEffect, useState } from 'react';
import { nodeService } from '../services/nodeService';
import { chartService } from '../services/chartService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { LogActivityModal } from './LogActivityModal';
import { CreateActivityTypeModal } from './CreateActivityTypeModal';
import { minutesToTimeStr } from '../utils/time';

const Breadcrumbs = ({ path }) => {
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

export const Workspace = ({ node, onRefresh, onBack, onForward, canBack, canForward }) => {
  const [activities, setActivities] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [loadingActs, setLoadingActs] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [actsError, setActsError] = useState('');

  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isCreateTypeModalOpen, setIsCreateTypeModalOpen] = useState(false);

  // Load types on mount
  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    setLoadingTypes(true);
    try {
      const types = await nodeService.fetchActivityTypes();
      setActivityTypes(types);
    } catch (err) {
      console.error("Failed to load activity types", err);
    } finally {
      setLoadingTypes(false);
    }
  };

  useEffect(() => {
    if (!node || node.type !== 'LEAF') {
      setActivities([]);
      setActsError('');
      return;
    }

    const loadData = async () => {
      setActsError('');
      try {
        setLoadingActs(true);
        setLoadingChart(true);
        const [acts, cData] = await Promise.all([
          nodeService.fetchActivitiesByNode(node.id, 50),
          chartService.getWeeklyHours(node.id)
        ]);
        setActivities(acts);
        setChartData(cData);
      } catch (err) {
        setActsError(err?.message || 'Failed to load activities');
      } finally {
        setLoadingActs(false);
        setLoadingChart(false);
      }
    };

    loadData();
  }, [node]);

  const handleSaved = async () => {
    onRefresh?.();
    if (node?.id) {
      try {
        const [acts, cData] = await Promise.all([
          nodeService.fetchActivitiesByNode(node.id, 50),
          chartService.getWeeklyHours(node.id)
        ]);
        setActivities(acts);
        setChartData(cData);
      } catch (err) {
        setActsError(err?.message || 'Failed to reload activities');
      }
    }
  };

  const renderValuePreview = (activity, type) => {
    if (!activity.values || !type) return null;
    return type.attributes.map(attr => {
      // Try ID first, then name (legacy fallback)
      let val = activity.values[attr.id];
      if (val === undefined) val = activity.values[attr.name];

      if (val === undefined || val === null) return null;

      let displayVal = val;
      if (attr.dataType === 'duration') {
        displayVal = minutesToTimeStr(Number(val));
      }
      return <span key={attr.id} className="chip chip--tiny chip--ghost">{attr.name}: {displayVal}</span>;
    });
  };

  if (!node) return (
    <div className="stack">
      <div className="workspace__nav">
        <button className="chip chip--tiny" disabled={!canBack} onClick={onBack}>← Back</button>
        <button className="chip chip--tiny" disabled={!canForward} onClick={onForward}>Forward →</button>
      </div>
      <div className="empty">Select a node to get started.</div>
    </div>
  );

  if (node.type === 'FOLDER') {
    return (
      <div className="stack">
        <div className="workspace__nav">
          <button className="chip chip--tiny" disabled={!canBack} onClick={onBack}>← Back</button>
          <button className="chip chip--tiny" disabled={!canForward} onClick={onForward}>Forward →</button>
        </div>
        <div className="card card--loose">
          <div className="card__title">Folder</div>
          <Breadcrumbs path={node.path} />
          <div className="card__body">
            <div className="hint">Children: {node.children?.length ?? 0}</div>
          </div>
        </div>
      </div>
    );
  }

  // LEAF Node View
  const hasTypes = activityTypes.length > 0;

  return (
    <div className="stack">
      <div className="workspace__nav">
        <button className="chip chip--tiny" disabled={!canBack} onClick={onBack}>← Back</button>
        <button className="chip chip--tiny" disabled={!canForward} onClick={onForward}>Forward →</button>
      </div>

      <div className="card card--loose">
        <div className="card__title">Leaf</div>
        <Breadcrumbs path={node.path} />
      </div>

      {/* Activity Logging Section */}
      <div className="card">
        <div className="card__title">Actions</div>
        {loadingTypes ? (
          <div className="hint">Loading config...</div>
        ) : !hasTypes ? (
          <div className="stack">
            <div className="empty">You didn't create any activity types yet.</div>
            <button className="btn btn--secondary" onClick={() => setIsCreateTypeModalOpen(true)}>Create First Type</button>
          </div>
        ) : (
          <button className="btn" onClick={() => setIsLogModalOpen(true)}>
            Log Activity
          </button>
        )}
      </div>

      <div className="card">
        <div className="card__title">Study Trends (Last 7 Days)</div>
        <div style={{ width: '100%', height: 250 }}>
          {loadingChart ? <div className="hint">Loading chart...</div> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => val.slice(5)} // Show MM-DD
                  tick={{ fontSize: 12 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="hours" fill="#646cff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card__title">Recent Activity</div>
        {loadingActs && <div className="hint">Loading…</div>}
        {actsError && <div className="form__error">{actsError}</div>}
        {!loadingActs && !activities.length && <div className="hint">No activity yet.</div>}
        <ul className="activity">
          {activities.map((a) => {
            const type = activityTypes.find(t => t.id === a.typeId);
            return (
              <li key={a.id} className="activity__row" style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div className="activity__title">{a.date} <span className="hint" style={{ fontWeight: 400 }}>— {type?.name || 'Unknown'}</span></div>
                  <div className="activity__meta">
                    <span>Focus {a.selfAssessment}/5</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {renderValuePreview(a, type)}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <LogActivityModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        node={node}
        activityTypes={activityTypes}
        onSave={handleSaved}
      />

      <CreateActivityTypeModal
        isOpen={isCreateTypeModalOpen}
        onClose={() => setIsCreateTypeModalOpen(false)}
        onCreated={() => {
          loadTypes(); // reload types
        }}
      />
    </div>
  );
};
