import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
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

// Inner component to use router hooks
function AppContent() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(() => pb.authStore.model);
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem('sidebarWidth')) || 260);
  const [isResizing, setIsResizing] = useState(false);
  const layoutRef = useRef(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [sideBarVisible, setSideBarVisible] = useState(true);

  /* Tabbed Navigation State */
  const [tabs, setTabs] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  // Determine active module based on path
  const activeModule = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/calendar')) return 'calendar';
    if (path.startsWith('/settings')) return 'explorer'; // Settings keeps explorer context usually, or maybe 'settings'
    if (path.startsWith('/workspace')) return 'explorer';
    return 'home';
  }, [location.pathname]);

  // Auto-collapse sidebar logic
  useEffect(() => {
    if (activeModule === 'home' || activeModule === 'calendar') {
      setSideBarVisible(false);
    } else {
      setSideBarVisible(true);
    }
  }, [activeModule]);

  const refresh = async () => {
    setError('');
    try {
      setLoading(true);
      if (!pb.authStore.isValid) {
        setTree([]);
        setTabs([]);
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
        navigate('/login');
      } else {
        refresh();
        if (location.pathname === '/login') {
          navigate('/workspace');
        }
      }
    });
    return () => unsubscribe();
  }, [navigate, location.pathname]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e) => {
      if (!layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
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

  const toggleCollapse = (id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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


  // --- Navigation Handlers ---

  const handleOpenTab = (node) => {
    if (!node) return;
    // Add to tabs if not present
    setTabs(prev => {
      if (prev.find(t => t.id === node.id)) return prev;
      return [...prev, node];
    });
    // Navigate
    navigate(`/workspace/${node.id}`);
  };

  const handleCloseTab = (tabId) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      // If we closed the active tab (based on URL), navigate to neighbors
      // We can't easily check "active" here without param, but we can check if the closed tab is the current URL
      // Actually, let's let the Workspace component handle redirect if the active node is closed?
      // Or better: calculate next active here.

      const match = location.pathname.match(/\/workspace\/([^/]+)/);
      const currentId = match ? match[1] : null;

      if (currentId === tabId) {
        const idx = prev.findIndex(t => t.id === tabId);
        if (newTabs.length > 0) {
          const nextIdx = Math.min(idx, newTabs.length - 1);
          navigate(`/workspace/${newTabs[nextIdx].id}`);
        } else {
          navigate('/workspace');
        }
      }
      return newTabs;
    });
  };

  const handleModuleChange = (mod) => {
    if (mod === 'home') navigate('/');
    if (mod === 'calendar') navigate('/calendar');
    if (mod === 'explorer') navigate('/workspace');
  };

  const handleOpenSettings = () => {
    navigate('/settings');
  };

  // Find node helper for sync
  const findNode = (id) => {
    const stack = [...tree];
    while (stack.length) {
      const node = stack.pop();
      if (node.id === id) return node;
      if (node.children) stack.push(...node.children);
    }
    return null;
  };

  const activeNode = useMemo(() => {
    const match = location.pathname.match(/\/workspace\/([^/]+)/);
    if (match && match[1]) {
      return findNode(match[1]);
    }
    return null;
  }, [location.pathname, tree]);

  // Sync Params to Tabs
  // If URL has ID, ensure it's in tabs
  useEffect(() => {
    if (activeNode) {
      setTabs(prev => {
        if (prev.find(t => t.id === activeNode.id)) return prev;
        return [...prev, activeNode];
      });
    }
  }, [activeNode]);

  if (!pb.authStore.isValid || !user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPanel onLogin={refresh} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const displayName = user.email ? user.email.split('@')[0] : (user.username || 'User');
  const layoutClass = `layout layout--triple ${!sideBarVisible ? 'sidebar-hidden' : ''}`;

  return (
    <div className="app-shell">
      <AppHeader
        title={`Welcome, ${displayName}`}
        user={user}
        onLogout={() => { authService.logout(); navigate('/login'); }}
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onOpenSettings={handleOpenSettings}
      />
      <div className={layoutClass} ref={layoutRef}>
        <ActivityBar
          activeModule={activeModule}
          onModuleChange={handleModuleChange}
          onToggleSideBar={() => setSideBarVisible(v => !v)}
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
          <Routes>
            <Route path="/" element={<Navigate to="/workspace" replace />} />
            <Route path="/workspace" element={<Home tree={tree} onOpenTab={handleOpenTab} />} />
            <Route path="/workspace/:nodeId" element={
              <Workspace
                node={activeNode}
                tree={tree}
                tabs={tabs}
                activeTabId={activeNode?.id}
                onTabClick={(n) => navigate(`/workspace/${n.id}`)}
                onTabClose={handleCloseTab}
                onRefresh={refresh}
                onOpenSettings={handleOpenSettings}
              />
            } />
            <Route path="/calendar" element={<Calendar tree={tree} treeLoading={loading} onRefresh={refresh} />} />
            <Route path="/settings" element={
              <Settings
                theme={theme}
                onThemeToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              />
            } />
            <Route path="*" element={<div className="empty">Page not found</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;