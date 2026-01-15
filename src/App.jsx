import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { nodeService } from './services/nodeService';
import { authService } from './services/authService';
import { pb } from './api/pocketbase';
import { AppHeader } from './components/AppHeader';
import { Explorer } from './components/Explorer';
import { Workspace } from './components/Workspace';
import { LoginPanel } from './components/LoginPanel';
import { Settings } from './components/Settings';

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
  const [backStack, setBackStack] = useState([]);
  const [forwardStack, setForwardStack] = useState([]);

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
        setSelected(null);
        return;
      }
      const data = await nodeService.fetchNodeTree();
      setTree(data);
      if (selected) {
        const updated = findById(data, selected.id);
        setSelected(updated || null);
      }
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
        setSelected(null);
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

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e) => {
      if (!layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      const next = e.clientX - rect.left;
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

  const handleSelect = (node, { fromHistory = false } = {}) => {
    setView('workspace');
    if (!fromHistory) {
      setBackStack((prev) => [...prev, selected]);
      setForwardStack([]);
    }
    setSelected(node);
  };

  const handleOpenSettings = () => {
    setView('settings');
    setSelected(null);
  };

  const handleBack = () => {
    if (!backStack.length) return;
    const prev = backStack[backStack.length - 1];
    setBackStack((p) => p.slice(0, -1));
    setForwardStack((f) => [selected, ...f]);
    handleSelect(prev, { fromHistory: true });
  };

  const handleForward = () => {
    if (!forwardStack.length) return;
    const next = forwardStack[0];
    setForwardStack((f) => f.slice(1));
    setBackStack((p) => [...p, selected]);
    handleSelect(next, { fromHistory: true });
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

  const displayName = (() => {
    const email = user?.email;
    if (email) return email.split('@')[0];
    return user?.username || 'User';
  })();

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
      <div className="layout" ref={layoutRef}>
        <Explorer
          tree={tree}
          selected={selected}
          onSelect={handleSelect}
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
        <main className="workspace">
          {view === 'settings' ? (
            <Settings
              theme={theme}
              onThemeToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            />
          ) : (
            <Workspace
              node={selected}
              onRefresh={refresh}
              onBack={handleBack}
              onForward={handleForward}
              canBack={backStack.length > 0}
              canForward={forwardStack.length > 0}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;