import { useEffect, useMemo, useRef, useState } from 'react';
import './index.css';
import './styles/layout.css';
import './styles/explorer.css';
import './styles/workspace.css';
import './styles/ui-components.css';
import { nodeService } from './services/nodeService';
import { authService } from './services/authService';
import { pb } from './api/pocketbase';
import { AppHeader } from './components/AppHeader';
import { ActivityBar } from './components/ActivityBar';
import { Explorer } from './components/Explorer/Explorer';
import { Workspace } from './components/Workspace';
import { LoginPanel } from './components/LoginPanel';
import { Settings } from './components/Settings';
import { Home } from './components/Home';
import { Calendar } from './components/Calendar';

function App() {
  const [tree, setTree] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(() => pb.authStore.model);
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem('sidebarWidth')) || 260);
  const [isResizing, setIsResizing] = useState(false);
  const layoutRef = useRef(null);
  const [view, setView] = useState('workspace');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  /* Tabbed Navigation State */
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);

  /* Module Navigation State */
  const [activeModule, setActiveModule] = useState('explorer');
  const [sideBarVisible, setSideBarVisible] = useState(true);

  // Auto-collapse sidebar when switching to Home/Calendar
  useEffect(() => {
    if (activeModule === 'home' || activeModule === 'calendar') {
      setSideBarVisible(false);
    } else if (activeModule === 'explorer') {
      setSideBarVisible(true);
    }
  }, [activeModule]);

  const findById = useMemo(
    () => (list, id) => {
      const stack = [...(list || [])];
      while (stack.length) {
        const node = stack.pop();
        if (node.id === id) return node;
        if (node.children?.length) stack.push(...node.children);
      }
      return null;
    },
    []
  );

  const refresh = async () => {
    setError('');
    try {
      setLoading(true);
      if (!pb.authStore.isValid) {
        setTree([]);
        setTabs([]);
        setActiveTabId(null);
        return;
      }
      const data = await nodeService.fetchNodeTree();
      setTree(data);

      // Clean up tabs for deleted nodes
      const allNodeIds = new Set();
      const collectIds = (nodes) => {
        for (const n of nodes) {
          allNodeIds.add(n.id);
          if (n.children?.length) collectIds(n.children);
        }
      };
      collectIds(data);

      setTabs(prev => {
        const validTabs = prev.filter(t => allNodeIds.has(t.id));
        // If active tab was removed, switch to another or clear
        if (validTabs.length < prev.length) {
          const newActiveExists = validTabs.some(t => t.id === activeTabId);
          if (!newActiveExists) {
            setActiveTabId(validTabs.length > 0 ? validTabs[0].id : null);
          }
        }
        return validTabs;
      });
    } catch (err) {
      setError(err?.message || 'Failed to load tree');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model);
      if (!model) {
        setTree([]);
        setTabs([]);
        setActiveTabId(null);
      } else {
        refresh();
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sidebar Resizing Logic - adjusted for triple-column layout
  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e) => {
      if (!layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      // Offset by activity bar width (64px)
      const next = e.clientX - rect.left - 64;
      const clamped = Math.min(450, Math.max(200, next));
      setSidebarWidth(clamped);
      localStorage.setItem('sidebarWidth', String(clamped));
    };
    const handleUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizing]);

  if (!pb.authStore.isValid || !user) {
    return <LoginPanel onLogin={refresh} />;
  }

  const toggleCollapse = (id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleOpenTab = (node) => {
    // Guard: if node is null (e.g., after deletion), don't try to open a tab
    if (!node) return;

    setView('workspace');
    setActiveModule('explorer');
    setTabs(prev => {
      const exists = prev.find(t => t.id === node.id);
      if (exists) return prev;
      return [...prev, node];
    });
    setActiveTabId(node.id);
  };

  const handleCloseTab = (tabId) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId);
      if (idx === -1) return prev;

      const newTabs = prev.filter(t => t.id !== tabId);

      if (tabId === activeTabId) {
        if (newTabs.length > 0) {
          const nextIdx = Math.min(idx, newTabs.length - 1);
          setActiveTabId(newTabs[nextIdx].id);
        } else {
          setActiveTabId(null);
        }
      }
      return newTabs;
    });
  };

  const activeNode = useMemo(() => {
    if (!activeTabId) return null;
    return tabs.find(t => t.id === activeTabId) || null;
  }, [tabs, activeTabId]);

  const handleOpenSettings = () => {
    setView('settings');
    setActiveModule('explorer');
  };

  const collapseAll = () => {
    const ids = [];
    const stack = [...tree];
    while (stack.length) {
      const n = stack.pop();
      if (n?.type === 'FOLDER') {
        ids.push(n.id);
        if (n.children?.length) stack.push(...n.children);
      }
    }
    setCollapsedIds(new Set(ids));
  };

  const handleToggleSideBar = () => {
    setSideBarVisible(v => !v);
  };

  const displayName = (() => {
    const email = user?.email;
    if (email) return email.split('@')[0];
    return user?.username || 'User';
  })();

  const layoutClass = `layout layout--triple ${!sideBarVisible ? 'sidebar-hidden' : ''}`;

  return (
    <div className="app-shell">
      <AppHeader
        title={`Welcome, ${displayName}`}
        user={user}
        onLogout={authService.logout}
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onOpenSettings={handleOpenSettings}
      />
      <div className={layoutClass} ref={layoutRef}>
        <ActivityBar
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          onToggleSideBar={handleToggleSideBar}
        />

        {sideBarVisible && (
          <>
            <Explorer
              tree={tree}
              selected={activeNode}
              onSelect={handleOpenTab}
              collapsedIds={collapsedIds}
              toggleCollapse={toggleCollapse}
              loading={loading}
              error={error}
              onCreated={refresh}
              onOpenSettings={handleOpenSettings}
              width={sidebarWidth}
              onRefresh={refresh}
              onCollapseAll={collapseAll}
              onThemeToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            />
            <div
              className={`resizer ${isResizing ? 'resizer--active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
              }}
            />
          </>
        )}

        <main className="workspace">
          {activeModule === 'home' && (
            <Home tree={tree} onOpenTab={handleOpenTab} />
          )}

          {activeModule === 'calendar' && (
            <Calendar tree={tree} onRefresh={refresh} />
          )}

          {activeModule === 'explorer' && (
            view === 'settings' ? (
              <Settings
                theme={theme}
                onThemeToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              />
            ) : (
              <Workspace
                node={activeNode}
                tabs={tabs}
                activeTabId={activeTabId}
                onTabClick={(node) => setActiveTabId(node.id)}
                onTabClose={handleCloseTab}
                onRefresh={refresh}
                onOpenSettings={handleOpenSettings}
              />
            )
          )}
        </main>
      </div>
    </div>
  );
}

export default App;