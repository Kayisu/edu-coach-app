import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { nodeService } from '../services/nodeService';
import { chartService } from '../services/chartService';
import { TabBar } from './Workspace/TabBar';
import { FolderView } from './Workspace/FolderView';
import { LeafView } from './Workspace/LeafView';
import { pb } from '../api/pocketbase';

export const Breadcrumbs = ({ node, tree }) => {
  const ancestors = useMemo(() => {
    if (!node || !tree) return [];
    const stack = [];
    const find = (nodes, targetId) => {
      for (const n of nodes) {
        stack.push(n);
        if (n.id === targetId) return true;
        if (n.children && find(n.children, targetId)) return true;
        stack.pop();
      }
      return false;
    };
    find(tree, node.id);
    return stack;
  }, [node, tree]);

  return (
    <div className="breadcrumbs">
      <Link to="/workspace" className="breadcrumbs__item breadcrumbs__link">Home</Link>
      {ancestors.length > 0 && <span className="breadcrumbs__sep">/</span>}

      {ancestors.map((p, idx) => (
        <span key={p.id} className="breadcrumbs__item">
          <Link to={`/workspace/${p.id}`} className="breadcrumbs__link">
            {p.name}
          </Link>
          {idx < ancestors.length - 1 && <span className="breadcrumbs__sep">/</span>}
        </span>
      ))}
    </div>
  );
};

// Formatting helper
const minutesToTimeStr = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const Workspace = ({ node, tree, tabs, activeTabId, onTabClick, onTabClose, onRefresh, onOpenSettings }) => {
  const [activities, setActivities] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [loadingActs, setLoadingActs] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [actsError, setActsError] = useState('');

  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // Load types on mount
  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    setLoadingTypes(true);
    try {
      if (!pb.authStore.isValid) return;
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
        // chartService might fail if no data, handle gracefully
        const [acts, cData] = await Promise.all([
          nodeService.fetchActivitiesByNode(node.id, 50),
          chartService.getWeeklyHours(node.id).catch(() => [])
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

  return (
    <>
      <Breadcrumbs node={node} tree={tree} />
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
