import { useEffect, useState } from 'react';
import { nodeService } from '../services/nodeService';
import { TabBar } from './Workspace/TabBar';
import { FolderView } from './Workspace/FolderView';
import { LeafView } from './Workspace/LeafView';

export const Breadcrumbs = ({ path }) => {
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

export const Workspace = ({ node, tabs, activeTabId, onTabClick, onTabClose, onRefresh }) => {
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

  return (
    <>
      <TabBar
        tabs={tabs || []}
        activeTabId={activeTabId}
        onTabClick={onTabClick}
        onTabClose={onTabClose}
      />

      <div className="workspace__content stack">
        {!node && (
          <div className="empty">Select a node or open a tab to get started.</div>
        )}

        {node && node.type === 'FOLDER' && (
          <FolderView node={node} />
        )}

        {node && node.type === 'LEAF' && (
          <LeafView node={node} onRefresh={onRefresh} />
        )}
      </div>
    </>
  );
};
