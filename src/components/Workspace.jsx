import { useEffect, useState } from 'react';
import { nodeService } from '../services/nodeService';
import { chartService } from '../services/chartService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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

const LeafActivityForm = ({ node, onSaved }) => {
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('');
  const [selfScore, setSelfScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      await nodeService.saveActivity({
        nodeId: node.id,
        date,
        hoursSpent: Number(hours),
        selfAssessment: Number(selfScore),
      });
      setDate('');
      setHours('');
      setSelfScore('');
      onSaved?.();
    } catch (err) {
      setError(err?.message || 'Failed to save activity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card__title">Log Activity</div>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="form__field">
          <span>Hours</span>
          <input type="number" min="0" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} required />
        </label>
        <label className="form__field">
          <span>Self assessment (1-5)</span>
          <input
            type="number"
            min="1"
            max="5"
            step="1"
            value={selfScore}
            onChange={(e) => setSelfScore(e.target.value)}
            required
          />
        </label>
        {error && <div className="form__error">{error}</div>}
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Activity'}
        </button>
      </form>
    </div>
  );
};

export const Workspace = ({ node, onRefresh, onBack, onForward, canBack, canForward }) => {
  const [activities, setActivities] = useState([]);
  const [loadingActs, setLoadingActs] = useState(false);
  const [actsError, setActsError] = useState('');
  
  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);


  useEffect(() => {
    if (!node || node.type !== 'LEAF') {
      setActivities([]);
      setActsError('');
      return;
    }

    const load = async () => {
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

    load();
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
      <LeafActivityForm node={node} onSaved={handleSaved} />
      
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
                        tick={{fontSize: 12}}
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
          {activities.map((a) => (
            <li key={a.id} className="activity__row">
              <div className="activity__title">{a.date}</div>
              <div className="activity__meta">
                <span>{a.hours_spent}h</span>
                <span>Focus {a.self_assessment}/5</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
