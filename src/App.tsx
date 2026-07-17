import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Settings,
  Grid,
  RotateCw,
  RefreshCw,
  Maximize,
  Sliders,
  ChevronRight,
  Info,
  Database,
  Terminal,
  Activity,
  Layers,
  Download,
  Cloud,
  LogOut,
  Trash2,
  Play,
  Lock,
  Unlock,
  Share2
} from 'lucide-react';
import {
  initAuth,
  googleSignIn,
  logout as logoutDrive,
  listDriveFiles,
  saveDriveFile,
  downloadDriveFile,
  deleteDriveFile
} from './lib/drive';
import TerminalView from './components/TerminalView';
import WorldTree, { TreeBranch, TreeProject } from './components/WorldTree';
import { termClient, portalClient } from './lib/termClient';

interface MenuItem {
  title: string;
  icon: string;
  stat1: string;
  stat2: string;
  statusText: string;
}

const menuData: MenuItem[] = [
  { title: '인원관리', icon: 'group', stat1: '124 ACTIVE', stat2: 'SECURED', statusText: 'PERSONNEL LOGS ACTIVE / SECURE SYNC COMPLETE' },
  { title: '자산관리', icon: 'inventory_2', stat1: '98.2% UNIT', stat2: 'GLOBAL', statusText: 'GLOBAL ASSET DEPLOYMENT OPTIMIZED / STORAGE VERIFIED' },
  { title: '시스템설정', icon: 'settings', stat1: 'STABLE', stat2: 'V.1.0', statusText: 'CORE SYSTEM PARAMETERS RECONFIGURED SUCCESSFULLY' },
  { title: '아카이브', icon: 'inventory', stat1: '12.4TB', stat2: 'LOCAL', statusText: 'DATA STORAGE ARCHIVE INTEGRITY LOCKED' },
  { title: '구조분석', icon: 'architecture', stat1: 'NORMAL', stat2: 'ROOT', statusText: 'STRUCTURAL LOAD ANALYSIS COMPLETED / NORMAL STATUS' },
  { title: '통신로그', icon: 'terminal', stat1: 'ENCRYPTED', stat2: 'NODE_X', statusText: 'NODE DATA COMMUNICATIONS SECURED / TUNNEL ESTABLISHED' },
  { title: '좌표맵', icon: 'location_searching', stat1: 'ALIGNED', stat2: 'GPS_FIX', statusText: 'SPATIAL TELEMETRY LOCK ESTABLISHED AT COORDINATES' },
  { title: '데이터레이어', icon: 'layers', stat1: 'VISIBLE', stat2: 'LVL_04', statusText: 'ADDITIONAL DRAFTING LAYER OVERLAYS ACTIVATED' }
];

type CameraMode = 'COORDINATES' | 'ORBIT' | 'AXIS' | 'PLAN' | 'SECTION';

export interface Dimension {
  id: string;
  name: string;
  sub: string;
  starColor: string;
  accentClass: string;
  bgGradient: string;
  cubeBorderColor: string;
  systemStatus: string;
  coordinates: string;
  levelColor: string;
}

const DIMENSIONS: Dimension[] = [
  {
    id: 'ORIGIN',
    name: 'ORIGIN_SECTOR_X',
    sub: 'COGNITIVE ARCHITECT DECK',
    starColor: '#ffffff',
    accentClass: 'text-zinc-400',
    bgGradient: 'from-[#111111] via-[#141414] to-[#0a0a0a]',
    cubeBorderColor: 'rgba(255,255,255,0.1)',
    systemStatus: 'ORIGIN_GRID_LOCKED',
    coordinates: 'X: 02 / Y: 04 / Z: 12',
    levelColor: 'border-white bg-white/5'
  },
  {
    id: 'NEON_VOID',
    name: 'NEON_CYBER_VOID',
    sub: 'SYNTHETIC SECTOR DELTA-9',
    starColor: '#06b6d4',
    accentClass: 'text-cyan-400',
    bgGradient: 'from-[#02101b] via-[#010912] to-[#010307]',
    cubeBorderColor: 'rgba(6, 182, 212, 0.25)',
    systemStatus: 'NEON_STREAM_ACTIVE',
    coordinates: 'X: 99 / Y: 13 / Z: 88',
    levelColor: 'border-cyan-400 bg-cyan-950/20'
  },
  {
    id: 'QUANTUM_CORE',
    name: 'QUANTUM_SINGULARITY',
    sub: 'SUBATOMIC CORE STAGE 3',
    starColor: '#f87171',
    accentClass: 'text-red-400',
    bgGradient: 'from-[#1a0505] via-[#0e0202] to-[#040101]',
    cubeBorderColor: 'rgba(248, 113, 113, 0.25)',
    systemStatus: 'QUANTUM_LATTICE_LOCK',
    coordinates: 'X: 42 / Y: 42 / Z: 42',
    levelColor: 'border-red-400 bg-red-950/20'
  },
  {
    id: 'SOLAR_GRID',
    name: 'SOLAR_DYNAMO_RING',
    sub: 'HELIOS POWER STATION OMEGA',
    starColor: '#fbbf24',
    accentClass: 'text-amber-400',
    bgGradient: 'from-[#1a0e02] via-[#0d0701] to-[#040200]',
    cubeBorderColor: 'rgba(251, 191, 36, 0.25)',
    systemStatus: 'SOLAR_FLARE_STABLE',
    coordinates: 'X: 07 / Y: 77 / Z: 01',
    levelColor: 'border-amber-400 bg-amber-950/20'
  }
];

export default function App() {
  const [cameraMode, setCameraMode] = useState<CameraMode>('COORDINATES');
  const [currentZoom, setCurrentZoom] = useState<number>(0);
  const [isRisen, setIsRisen] = useState<boolean>(false);
  const [isSplitting, setIsSplitting] = useState<boolean>(false);
  const [systemStatus, setSystemStatus] = useState<string>('STABLE_GRID_INIT');
  const [rotationAngle, setRotationAngle] = useState<number>(15); // Used for auto-rotation in AXIS mode
  const [customNotify, setCustomNotify] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [isGrayscale, setIsGrayscale] = useState<boolean>(false);
  const [currentDimIndex, setCurrentDimIndex] = useState<number>(0);
  const [isWarping, setIsWarping] = useState<boolean>(false);

  // Google Drive state
  const [driveOpen, setDriveOpen] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [saveFilename, setSaveFilename] = useState<string>('architect_revision_1');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Terminal session state: every wall cell can host a PTY session.
  const [cellSessions, setCellSessions] = useState<Record<string, string>>({});
  const [liveSessions, setLiveSessions] = useState<string[]>([]);

  // Main screen dock: up to 4 panes in two columns. A pane's column follows
  // the wall its session lives on (left wall -> left column, right -> right),
  // so the split layout mirrors the room's spatial grouping. Neutral sessions
  // (CORE/top/bottom) fill whichever column is lighter.
  interface DockedPane {
    id: string;
    side: 'L' | 'R';
  }
  const [docked, setDocked] = useState<DockedPane[]>([{ id: 'MAIN', side: 'L' }]);
  const [focusedSession, setFocusedSession] = useState<string>('MAIN');

  // Ceiling menu zone: menu modules live on top-wall cells, auto-stacked on
  // the row nearest the main screen; draggable to any free ceiling cell.
  const [menuCells, setMenuCells] = useState<Record<number, string>>(() =>
    Object.fromEntries(menuData.map((_, m) => [m, `top-${m}`]))
  );
  const [draggingMenu, setDraggingMenu] = useState<number | null>(null);
  const dragMovedRef = useRef<boolean>(false);

  // Mind-map links between cells: drag from one cube to another to connect
  // them; a 3D beam spans the room. Toggleable, persisted locally.
  interface CellLink {
    id: string;
    from: string;
    to: string;
  }
  const [links, setLinks] = useState<CellLink[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cube-links') || '[]');
    } catch {
      return [];
    }
  });
  const [showLinks, setShowLinks] = useState<boolean>(true);
  const [linkDragFrom, setLinkDragFrom] = useState<string | null>(null);
  const linkDragRef = useRef<{ from: string; startX: number; startY: number; active: boolean } | null>(null);
  const suppressClickRef = useRef<boolean>(false);

  useEffect(() => {
    localStorage.setItem('cube-links', JSON.stringify(links));
  }, [links]);

  // Portal: destination panel + known SSH hosts (~/.ssh/config)
  const [portalOpen, setPortalOpen] = useState<boolean>(false);
  const [sshProfiles, setSshProfiles] = useState<string[]>([]);
  const [remoteHostInput, setRemoteHostInput] = useState<string>('');

  // World tree forest: register new project roots (STRUCTURE mode UI)
  const [newProjectPath, setNewProjectPath] = useState<string>('');
  const [treeRefreshNonce, setTreeRefreshNonce] = useState<number>(0);

  const plantProject = async () => {
    const projectPath = newProjectPath.trim();
    if (!projectPath) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: projectPath })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setNewProjectPath('');
        setTreeRefreshNonce((n) => n + 1);
        triggerNotification(`NEW TREE PLANTED: [${projectPath.toUpperCase()}]`);
      } else {
        triggerNotification(`PLANTING FAILED: ${data.error === 'not a git repository' ? 'GIT 저장소가 아닙니다' : data.error}`);
      }
    } catch {
      triggerNotification('TREE API OFFLINE — RESTART DEV SERVER');
    }
  };

  useEffect(() => {
    fetch('/portal/profiles')
      .then((res) => res.json())
      .then((data) => Array.isArray(data.hosts) && setSshProfiles(data.hosts))
      .catch(() => {
        // portal server not up — manual host input still works once it is
      });
  }, []);

  // Camera lock: freeze rotation/zoom while working, snap to face the screen.
  const [isCameraLocked, setIsCameraLocked] = useState<boolean>(false);

  // Voxel modeling floor: MODEL mode turns floor cells into a simple
  // block-stacking canvas (click = stack up, right-click = remove).
  const [modelMode, setModelMode] = useState<boolean>(false);
  const [voxels, setVoxels] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem('cube-voxels') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('cube-voxels', JSON.stringify(voxels));
  }, [voxels]);

  // Trigger 3D model descent from ceiling on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRisen(true);
      triggerNotification('CORE STRUCTURAL MODEL DESCENDING FROM THE CEILING...');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Connect to the PTY + portal servers, boot MAIN, track live sessions.
  // Snapshot merges are source-scoped so one server's list never wipes
  // the other's sessions.
  useEffect(() => {
    termClient.connect();
    termClient.create('MAIN');

    const makeHandler = (source: 'local' | 'portal') => (msg: Parameters<Parameters<typeof termClient.on>[0]>[0]) => {
      if (msg.type === 'sessions' && msg.sessions) {
        const ids = msg.sessions.map((s) => s.id);
        setLiveSessions((prev) => {
          const kept = prev.filter((id) =>
            source === 'local' ? id.startsWith('SSH_') : !id.startsWith('SSH_')
          );
          return [...kept, ...ids];
        });
      }
      if (msg.type === 'created' && msg.id) {
        setLiveSessions((prev) => (prev.includes(msg.id!) ? prev : [...prev, msg.id!]));
      }
      if (msg.type === 'exit' && msg.id) {
        setLiveSessions((prev) => prev.filter((id) => id !== msg.id));
        setCellSessions((prev) =>
          Object.fromEntries(Object.entries(prev).filter(([, sid]) => sid !== msg.id))
        );
        setDocked((prev) => {
          const next = prev.filter((p) => p.id !== msg.id);
          return next.length ? next : [{ id: 'MAIN', side: 'L' as const }];
        });
        setFocusedSession((prev) => (prev === msg.id ? 'MAIN' : prev));
        triggerNotification(`TERMINAL SESSION [${msg.id}] TERMINATED`);
      }
    };

    const offLocal = termClient.on(makeHandler('local'));
    const offPortal = portalClient.on(makeHandler('portal'));
    return () => {
      offLocal();
      offPortal();
    };
  }, []);

  // Initialize auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        triggerNotification('GOOGLE DRIVE CLOUD STORAGE INITIALIZED');
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Load files list
  const loadDriveFilesList = async (accessToken: string) => {
    setIsLoadingFiles(true);
    try {
      const files = await listDriveFiles(accessToken);
      setDriveFiles(files);
    } catch (err: any) {
      triggerNotification('ERROR REFLECTING VAULT STORAGE');
      console.error(err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Auto reload when drive panel opens
  useEffect(() => {
    if (token && driveOpen) {
      loadDriveFilesList(token);
    }
  }, [token, driveOpen]);

  const handleDriveSignIn = async () => {
    try {
      triggerNotification('CONNECTING TO SECURE GOOGLE DECK...');
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        triggerNotification(`WELCOME BACK, OPERATOR ${result.user.displayName?.toUpperCase() || 'AGENT'}`);
        loadDriveFilesList(result.accessToken);
      }
    } catch (err) {
      console.error(err);
      triggerNotification('SIGN-IN SEQUENCE ABORTED');
    }
  };

  const handleDriveLogout = async () => {
    try {
      await logoutDrive();
      setUser(null);
      setToken(null);
      setDriveFiles([]);
      triggerNotification('SESSION DISCONNECTED. SECURE DISMOUNT COMPLETED.');
    } catch (err) {
      console.error(err);
      triggerNotification('ERROR DISMOUNTING SESSION');
    }
  };

  const handleSaveToDrive = async () => {
    if (!token) return;
    if (!saveFilename.trim()) {
      triggerNotification('ERROR: ENTER A VALID STATE DESCRIPTOR');
      return;
    }

    setIsSaving(true);
    triggerNotification(`COMMITTING REVISION [${saveFilename.toUpperCase()}] TO STORAGE VAULT...`);

    const schemaData = {
      appIdentifier: 'Architect_OS_Schematic',
      timestamp: Date.now(),
      saveName: saveFilename,
      currentDimIndex,
      cameraMode,
      currentZoom,
      isRisen,
      isGrayscale,
      perspectiveRx,
      perspectiveRy,
      systemStatus,
      links,
    };

    try {
      await saveDriveFile(token, saveFilename, schemaData);
      triggerNotification('STATE RECORD WRITTEN SUCCESSFULLY');
      setSaveFilename('');
      loadDriveFilesList(token);
    } catch (err) {
      console.error(err);
      triggerNotification('WRITE PIPELINE COMMITTAL ERROR');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadFromDrive = async (fileId: string, fileName: string) => {
    if (!token) return;

    triggerNotification(`DE-SERIALIZING SCHEMATIC SOURCE [${fileName.toUpperCase()}]...`);

    try {
      const content = await downloadDriveFile(token, fileId);
      if (content.appIdentifier !== 'Architect_OS_Schematic') {
        triggerNotification('ERROR: INVALID FILE STATE SIGNATURE');
        return;
      }

      if (typeof content.currentDimIndex === 'number') {
        setCurrentDimIndex(content.currentDimIndex);
      }
      if (content.cameraMode) setCameraMode(content.cameraMode);
      if (typeof content.currentZoom === 'number') setCurrentZoom(content.currentZoom);
      if (typeof content.isRisen === 'boolean') setIsRisen(content.isRisen);
      if (typeof content.isGrayscale === 'boolean') setIsGrayscale(content.isGrayscale);
      if (typeof content.perspectiveRx === 'number') setPerspectiveRx(content.perspectiveRx);
      if (typeof content.perspectiveRy === 'number') setPerspectiveRy(content.perspectiveRy);
      if (content.systemStatus) setSystemStatus(content.systemStatus);
      if (Array.isArray(content.links)) setLinks(content.links);

      triggerNotification(`STATE RESTORED FROM FILE: ${fileName.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      triggerNotification('DE-SERIALIZATION FAILURE. STATE DAMAGED.');
    }
  };

  const handleDeleteFromDrive = async (fileId: string, fileName: string) => {
    if (!token) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete '${fileName}' from your Google Drive? This action cannot be undone.`
    );
    if (!confirmed) return;

    triggerNotification(`REMOVING RECORD [${fileName.toUpperCase()}]...`);

    try {
      await deleteDriveFile(token, fileId);
      triggerNotification('RECORD DELETED. STORAGE VAULT STORAGE SYNCED.');
      loadDriveFilesList(token);
    } catch (err) {
      console.error(err);
      triggerNotification('DISMANTLE PIPELINE FAILURE');
    }
  };
  
  // Perspective control via mouse wheel button drag
  const [perspectiveRx, setPerspectiveRx] = useState<number>(0);
  const [perspectiveRy, setPerspectiveRy] = useState<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const startMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startRotRef = useRef<{ rx: number; ry: number }>({ rx: 0, ry: 0 });

  // Generate twinkling stars for cosmic space background
  const [stars] = useState(() => {
    return Array.from({ length: 120 }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 2.5 + 1, // 1px to 3.5px
      delay: Math.random() * 4 // random delay in seconds
    }));
  });

  // Track cursor position for custom 3D parallax look
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const zoomContainerRef = useRef<HTMLDivElement>(null);

  // Auto-rotation in AXIS mode
  useEffect(() => {
    if (cameraMode !== 'AXIS') return;
    const interval = setInterval(() => {
      setRotationAngle((prev) => (prev + 0.4) % 360);
    }, 16);
    return () => clearInterval(interval);
  }, [cameraMode]);

  // Track cursor coordinates
  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      // Normalize to range [-1, 1]
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x: nx, y: ny });
    };

    window.addEventListener('mousemove', handleMouseMoveGlobal);
    return () => window.removeEventListener('mousemove', handleMouseMoveGlobal);
  }, []);

  // Track middle-mouse button (wheel click) dragging for perspective rotation
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Middle click is button === 1
      if (e.button === 1) {
        e.preventDefault();
        if (isCameraLocked) return;
        isDraggingRef.current = true;
        startMouseRef.current = { x: e.clientX, y: e.clientY };
        startRotRef.current = { rx: perspectiveRx, ry: perspectiveRy };
        document.body.style.cursor = 'grabbing';
        triggerNotification('CAMERA DECK ROTATION MODE ACTIVE');
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - startMouseRef.current.x;
      const dy = e.clientY - startMouseRef.current.y;

      const newRy = startRotRef.current.ry + dx * 0.35;
      const newRx = startRotRef.current.rx - dy * 0.35;

      if (cameraMode === 'COORDINATES') {
        // Interior free-look: full 360° yaw, pitch clamped to avoid flipping
        setPerspectiveRx(Math.min(Math.max(newRx, -55), 55));
        setPerspectiveRy(newRy);
      } else {
        // Exterior orbit: free yaw, pitch capped so it doesn't flip upside-down
        setPerspectiveRx(Math.min(Math.max(newRx, -80), 80));
        setPerspectiveRy(newRy);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1 && isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        triggerNotification('CAMERA VIEWPORT LOCKED');
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [perspectiveRx, perspectiveRy, cameraMode, isCameraLocked]);

  // Proximity mouse effects on inactive cells
  useEffect(() => {
    const handleCellProximity = (e: MouseEvent) => {
      const cells = document.querySelectorAll('.grid-cell:not(.is-open):not(.has-session):not(.menu-cell)');
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      cells.forEach((cellNode) => {
        const cell = cellNode as HTMLDivElement;
        const rect = cell.getBoundingClientRect();
        const cellX = rect.left + rect.width / 2;
        const cellY = rect.top + rect.height / 2;
        const dx = mouseX - cellX;
        const dy = mouseY - cellY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radius = 220;

        const inner = cell.querySelector('.cell-3d') as HTMLDivElement | null;
        const face = cell.querySelector('.cell-face') as HTMLDivElement | null;
        const icon = cell.querySelector('.material-symbols-outlined') as HTMLSpanElement | null;
        if (!inner) return;

        if (distance < radius) {
          const power = 1 - distance / radius;
          const translateZ = power * 28;
          inner.style.transform = `translateZ(${translateZ}px)`;
          if (face) {
            face.style.backgroundColor = `rgba(255, 255, 255, ${power * 0.08})`;
            face.style.borderColor = `rgba(255, 255, 255, ${0.15 + power * 0.25})`;
          }
          if (icon) {
            icon.style.opacity = String(0.4 + power * 0.6);
            icon.style.transform = `scale(${1 + power * 0.35})`;
          }
        } else {
          inner.style.transform = 'translateZ(0px)';
          if (face) {
            face.style.backgroundColor = '#161616';
            face.style.borderColor = '#2a2a2a';
          }
          if (icon) {
            icon.style.opacity = '0.3';
            icon.style.transform = 'scale(1)';
          }
        }
      });
    };

    window.addEventListener('mousemove', handleCellProximity);
    return () => window.removeEventListener('mousemove', handleCellProximity);
  }, []);

  // Handle scroll wheel zoom
  useEffect(() => {
    const interior = cameraMode === 'COORDINATES';
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isCameraLocked) return;
      const delta = e.deltaY * -0.65;
      setCurrentZoom((prev) => {
        const nextZoom = prev + delta;
        // Interior: walk forward/back inside the room (walls cull per-cell,
        // so movement is safe) — the room now extends 300px further back.
        // Exterior: the original dolly range.
        return interior
          ? Math.min(Math.max(nextZoom, -600), 250)
          : Math.min(Math.max(nextZoom, 0), 400);
      });
    };

    const container = zoomContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [cameraMode, isCameraLocked]);

  // Touch controls (mobile/tablet): one finger = look around, pinch = walk
  useEffect(() => {
    const container = zoomContainerRef.current;
    if (!container) return;

    let lastX = 0;
    let lastY = 0;
    let lastDist: number | null = null;
    let looking = false;
    const interior = cameraMode === 'COORDINATES';
    const pitchCap = interior ? 55 : 80;

    const touchDist = (e: TouchEvent) =>
      Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        looking = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        looking = false;
        lastDist = touchDist(e);
      }
    };

    const onMove = (e: TouchEvent) => {
      if (isCameraLocked) return;
      if (e.touches.length === 1 && looking) {
        e.preventDefault();
        const dx = e.touches[0].clientX - lastX;
        const dy = e.touches[0].clientY - lastY;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        setPerspectiveRy((prev) => prev + dx * 0.35);
        setPerspectiveRx((prev) => Math.min(Math.max(prev - dy * 0.35, -pitchCap), pitchCap));
      } else if (e.touches.length === 2 && lastDist !== null) {
        e.preventDefault();
        const dist = touchDist(e);
        const delta = (dist - lastDist) * 1.2;
        lastDist = dist;
        setCurrentZoom((prev) => {
          const next = prev + delta;
          return interior
            ? Math.min(Math.max(next, -600), 250)
            : Math.min(Math.max(next, 0), 400);
        });
      }
    };

    const onEnd = () => {
      looking = false;
      lastDist = null;
    };

    container.addEventListener('touchstart', onStart, { passive: true });
    container.addEventListener('touchmove', onMove, { passive: false });
    container.addEventListener('touchend', onEnd);
    container.addEventListener('touchcancel', onEnd);
    return () => {
      container.removeEventListener('touchstart', onStart);
      container.removeEventListener('touchmove', onMove);
      container.removeEventListener('touchend', onEnd);
      container.removeEventListener('touchcancel', onEnd);
    };
  }, [cameraMode, isCameraLocked]);

  // Ctrl+Shift+L toggles the camera lock even while typing in a terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        toggleCameraLock();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cameraMode]);

  // Sensible default framing per camera mode
  useEffect(() => {
    setCurrentZoom(cameraMode === 'COORDINATES' ? SEAT_ZOOM : 0);
    if (cameraMode === 'COORDINATES') {
      setPerspectiveRx(0);
      setPerspectiveRy(0);
    } else if (cameraMode === 'ORBIT') {
      setPerspectiveRx(-15);
      setPerspectiveRy(15);
    } else if (cameraMode === 'PLAN') {
      // Bird's-eye isometric onto the world tree (looking DOWN, not up)
      setPerspectiveRx(-55);
      setPerspectiveRy(30);
    }
  }, [cameraMode]);

  // Active dashboard data
  const activeDim = DIMENSIONS[currentDimIndex];

  // Which wall cell hosts a session (CORE = the default, cell-less MAIN)
  const locationOf = (sessionId: string): string => {
    if (sessionId.startsWith('TREE_')) return 'WORLDTREE';
    if (sessionId.startsWith('SSH_')) return 'PORTAL';
    const key = Object.keys(cellSessions).find((k) => cellSessions[k] === sessionId);
    return key ? key.toUpperCase() : 'CORE';
  };

  // World tree branch click: open a terminal AT that branch's worktree path
  // (or the repo root when the branch has no worktree) and dock it.
  const openBranchTerminal = (project: TreeProject, branch: TreeBranch) => {
    const safeName = branch.name.replace(/[^A-Za-z0-9_-]/g, '_').toUpperCase();
    const sessionId = `TREE_${safeName}`;
    termClient.create(sessionId, branch.worktreePath || project.path);
    dockSession(sessionId);
    setSystemStatus(`${sessionId}_LINKED`);
    triggerNotification(
      `WORLD TREE BRANCH [${branch.name}] → TERMINAL DOCKED (${branch.worktreePath ? 'WORKTREE' : 'REPO ROOT'})`
    );
  };

  // Dock a session into the main screen (max 2 per column, 4 total).
  const dockSession = (id: string) => {
    setDocked((prev) => {
      if (prev.some((p) => p.id === id)) return prev;
      const countL = prev.filter((p) => p.side === 'L').length;
      const countR = prev.filter((p) => p.side === 'R').length;
      const side: 'L' | 'R' = id.startsWith('LEFT')
        ? 'L'
        : id.startsWith('RIGHT')
          ? 'R'
          : countL <= countR
            ? 'L'
            : 'R';
      const sameSide = prev.filter((p) => p.side === side);
      if (sameSide.length >= 2) {
        const oldest = sameSide[0];
        triggerNotification(`PANE [${oldest.id}] RETURNED TO ITS WALL — SLOT REASSIGNED`);
        return prev.map((p) => (p === oldest ? { id, side } : p));
      }
      return [...prev, { id, side }];
    });
    setFocusedSession(id);
  };

  // Remove a pane from the main screen (session keeps running on its wall).
  const undockSession = (id: string) => {
    const next = docked.filter((p) => p.id !== id);
    const finalDocked = next.length ? next : [{ id: 'MAIN', side: 'L' as const }];
    setDocked(finalDocked);
    if (focusedSession === id) setFocusedSession(finalDocked[0].id);
  };

  // Spawn a terminal with no cell chosen: auto-place on the emptier side
  // wall, nearest-to-main depth column first, then dock it.
  const autoSpawnTerminal = () => {
    const bySessionCount = (w: string) =>
      Object.keys(cellSessions).filter((k) => k.startsWith(`${w}-`)).length;
    const walls = ['left', 'right'].sort((a, b) => bySessionCount(a) - bySessionCount(b));

    for (const wall of walls) {
      const grid = WALL_GRID[wall];
      for (let col = 0; col < grid.cols; col++) {
        for (let row = 0; row < grid.rows; row++) {
          const i = row * grid.cols + col;
          const cellKey = `${wall}-${i}`;
          if (!cellSessions[cellKey]) {
            const sessionId = `${wall.toUpperCase()}_${i}`;
            termClient.create(sessionId);
            setCellSessions((prev) => ({ ...prev, [cellKey]: sessionId }));
            dockSession(sessionId);
            setSystemStatus(`${sessionId}_SPAWNED`);
            triggerNotification(`NEW TERMINAL AUTO-DOCKED AT [${cellKey.toUpperCase()}]`);
            return;
          }
        }
      }
    }
    triggerNotification('NO FREE WALL CELLS — CLEAR A SLOT FIRST');
  };

  // Ceiling menu module actions
  const menuAction = (m: number) => {
    const item = menuData[m];
    if (item.title === '시스템설정') {
      setSettingsOpen(true);
      setDriveOpen(false);
    } else if (item.title === '아카이브') {
      setDriveOpen(true);
      setSettingsOpen(false);
    } else {
      triggerNotification(`${item.title.toUpperCase()} MODULE — PHASE 2 LINK PENDING`);
    }
  };

  // Mind-map link helpers
  const addLink = (from: string, to: string) => {
    setLinks((prev) => {
      const exists = prev.some(
        (l) => (l.from === from && l.to === to) || (l.from === to && l.to === from)
      );
      if (exists) {
        triggerNotification('LINK ALREADY ESTABLISHED');
        return prev;
      }
      triggerNotification(`LINK ESTABLISHED: [${from.toUpperCase()}] ⇄ [${to.toUpperCase()}]`);
      return [...prev, { id: `${from}->${to}`, from, to }];
    });
  };

  const removeLink = (linkId: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
    triggerNotification('LINK SEVERED');
  };

  // Track left-drag from a cell: past a small threshold it becomes a
  // link-drawing gesture; releasing over another cell connects the two.
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const drag = linkDragRef.current;
      if (!drag) return;
      if (!drag.active && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 10) {
        drag.active = true;
        setLinkDragFrom(drag.from);
        document.body.style.cursor = 'crosshair';
      }
    };
    const handleUp = (e: MouseEvent) => {
      const drag = linkDragRef.current;
      if (!drag) return;
      if (drag.active) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const cellEl = el?.closest?.('[id*="-cell-"]') as HTMLElement | null;
        const match = cellEl?.id.match(/^(left|right|top|bottom)-cell-(\d+)$/);
        if (match) {
          const target = `${match[1]}-${match[2]}`;
          if (target !== drag.from) addLink(drag.from, target);
        }
        document.body.style.cursor = '';
        suppressClickRef.current = true;
        setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }
      linkDragRef.current = null;
      setLinkDragFrom(null);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  // Cell click: dock/focus its terminal, or spawn a new one for that cell.
  const handleCellClick = (wall: string, index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    if (suppressClickRef.current) return; // a link-drag just ended here

    const cellKey = `${wall}-${index}`;

    // MODEL mode: the floor is a voxel canvas
    if (modelMode && wall === 'bottom') {
      setVoxels((prev) => ({ ...prev, [cellKey]: Math.min((prev[cellKey] || 0) + 1, 5) }));
      return;
    }

    const existingSession = cellSessions[cellKey];

    if (existingSession) {
      if (docked.some((p) => p.id === existingSession)) {
        setFocusedSession(existingSession);
        triggerNotification(`PANE [${existingSession}] FOCUSED`);
      } else {
        dockSession(existingSession);
        triggerNotification(`TERMINAL [${existingSession}] DOCKED TO MAIN SCREEN`);
      }
      setSystemStatus(`${existingSession}_FOCUSED`);
      return;
    }

    const sessionId = `${wall.toUpperCase()}_${index}`;
    termClient.create(sessionId);
    setCellSessions((prev) => ({ ...prev, [cellKey]: sessionId }));
    dockSession(sessionId);
    setSystemStatus(`${sessionId}_SPAWNED`);
    triggerNotification(`NEW TERMINAL SESSION [${sessionId}] SPAWNED ON ${wall.toUpperCase()} WALL`);
  };

  // Snap the camera to face the main screen straight-on.
  const alignToFront = () => {
    const alreadyAligned =
      cameraMode === 'COORDINATES' &&
      perspectiveRx === 0 &&
      perspectiveRy === 0 &&
      currentZoom === SEAT_ZOOM;
    setPerspectiveRx(0);
    setPerspectiveRy(0);
    setCurrentZoom(SEAT_ZOOM);
    if (cameraMode !== 'COORDINATES') setCameraMode('COORDINATES');
    if (!alreadyAligned) triggerNotification('VIEWPORT ALIGNED TO MAIN SCREEN');
  };

  // Freeze/unfreeze all camera input; locking also aligns to the screen.
  const toggleCameraLock = () => {
    setIsCameraLocked((prev) => {
      const next = !prev;
      if (next) {
        setPerspectiveRx(0);
        setPerspectiveRy(0);
        setCurrentZoom(SEAT_ZOOM);
      }
      triggerNotification(next ? 'CAMERA LOCKED // WORK MODE ENGAGED' : 'CAMERA UNLOCKED // FREE LOOK');
      return next;
    });
  };

  // Right-click: kill the terminal bound to a cell.
  const handleCellKill = (wall: string, index: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const cellKey = `${wall}-${index}`;

    // MODEL mode: right-click removes the top voxel of the stack
    if (modelMode && wall === 'bottom') {
      setVoxels((prev) => {
        const next = (prev[cellKey] || 0) - 1;
        return next <= 0
          ? Object.fromEntries(Object.entries(prev).filter(([key]) => key !== cellKey))
          : { ...prev, [cellKey]: next };
      });
      return;
    }

    const sessionId = cellSessions[cellKey];
    if (!sessionId) return;

    termClient.kill(sessionId);
    setCellSessions((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([key]) => key !== cellKey))
    );
    undockSession(sessionId);
  };

  // Drag a ceiling menu module to another free ceiling cell.
  useEffect(() => {
    if (draggingMenu === null) return;

    const handleMove = () => {
      dragMovedRef.current = true;
    };
    const handleUp = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cellEl = el?.closest?.('[id^="top-cell-"]') as HTMLElement | null;
      if (cellEl) {
        const idx = Number(cellEl.id.replace('top-cell-', ''));
        const targetKey = `top-${idx}`;
        const occupied = Object.values(menuCells).includes(targetKey);
        const hasTerminal = Boolean(cellSessions[targetKey]);
        if (targetKey !== menuCells[draggingMenu] && !occupied && !hasTerminal) {
          setMenuCells((prev) => ({ ...prev, [draggingMenu]: targetKey }));
          triggerNotification(`MENU MODULE [${menuData[draggingMenu].title.toUpperCase()}] RELOCATED`);
        }
      }
      setDraggingMenu(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [draggingMenu, menuCells, cellSessions]);

  // Portal surface click opens the destination panel
  const handleBackWallClick = () => {
    if (isWarping || isSplitting) return;
    setPortalOpen((prev) => !prev);
    if (settingsOpen) setSettingsOpen(false);
    if (driveOpen) setDriveOpen(false);
  };

  // Shared warp sequence: doors split, stars streak, then arrive
  const runWarpTo = (arrive: () => void) => {
    if (isWarping || isSplitting) return;
    setIsSplitting(true);
    triggerNotification('OPENING COGNITIVE PORTAL TO THE DEEP COSMOS...');

    setTimeout(() => {
      setIsWarping(true);
      triggerNotification('WARPING IN PROGRESS: SPEED INTEGRATION FLOW ENGAGED...');

      setTimeout(() => {
        arrive();
        setIsWarping(false);
        setIsSplitting(false);
      }, 2000);
    }, 1200);
  };

  // Warp to a local dimension (color theme)
  const warpToDimension = (index: number) => {
    setPortalOpen(false);
    runWarpTo(() => {
      setCurrentDimIndex(index);
      setSystemStatus(DIMENSIONS[index].systemStatus);
    });
  };

  // Warp to a remote host: SSH terminal opens through the portal and docks
  const connectRemote = (host: string) => {
    const trimmed = host.trim();
    if (!trimmed) return;
    setPortalOpen(false);
    runWarpTo(() => {
      const safeName = trimmed.replace(/[^A-Za-z0-9_.@-]/g, '_').toUpperCase();
      const sessionId = `SSH_${safeName}`;
      portalClient.create(sessionId, undefined, trimmed);
      dockSession(sessionId);
      setCurrentDimIndex(1); // remote dimension = neon cyan
      setSystemStatus(`REMOTE_${safeName}_LINKED`);
      triggerNotification(`DIMENSIONAL SHIFT COMPLETE — REMOTE HOST [${trimmed}]`);
    });
  };

  const triggerNotification = (text: string) => {
    setCustomNotify(text);
    setTimeout(() => {
      setCustomNotify((prev) => (prev === text ? null : prev));
    }, 4500);
  };

  const handleExportSchematic = () => {
    triggerNotification('EXPORTING CORE VECTOR VECTOR_SCHEMATIC_REVISION_12.DWG...');
    setTimeout(() => {
      triggerNotification('EXPORT EXECUTED SUCCESSFULLY. SHARED DATA STREAM PIPELINE OPENED.');
    }, 1500);
  };

  // Interior 360° camera. Room walls span local z:-600..+200 (center -200).
  // The eye sits at the room's center with a wide-angle lens; grid walls are
  // per-cell planes (see renderWallCells) so Chrome's eye-plane culling only
  // removes the cells behind your head — the room stays closed at any yaw.
  const INTERIOR_PERSPECTIVE = 700;
  const INTERIOR_EYE_OFFSET = INTERIOR_PERSPECTIVE + 200;   // eye = room center
  const INTERIOR_EYE_LOCAL_Z = INTERIOR_PERSPECTIVE - INTERIOR_EYE_OFFSET; // -200
  // Default working distance: far enough back that the enlarged monitor
  // fits the viewport, close enough that text stays comfortably readable.
  const SEAT_ZOOM = -120;
  // Perspective magnification of the monitor wall at the seat position.
  // xterm hit-tests in CSS pixels and knows nothing about 3D projection, so
  // the terminal is pre-shrunk by 1/S (and its CSS box enlarged by S) to make
  // screen pixels and CSS pixels 1:1 — otherwise drags land ~3-4 rows off.
  const MAIN_SCREEN_SCALE = INTERIOR_PERSPECTIVE / (400 - SEAT_ZOOM); // ≈1.346
  const isInteriorMode = cameraMode === 'COORDINATES' || cameraMode === 'AXIS';

  // Determine the rotation styling of the Room container based on Camera Mode and Scroll Zoom
  const getRoomTransform = () => {
    let rx = -15;
    let ry = 15;
    let rz = 0;
    let zVal = isInteriorMode ? INTERIOR_EYE_OFFSET + currentZoom : currentZoom;

    if (isWarping) {
      zVal += 1600;           // Fly deep into the portal
      rz = rotationAngle * 8; // Rapid dimensional spin
    }

    switch (cameraMode) {
      case 'COORDINATES':
        // Look around from inside; angle controlled by middle-click drag
        rx = perspectiveRx;
        ry = perspectiveRy;
        break;
      case 'ORBIT':
        // Omniscient exterior view: orbit around the cube (the original camera)
        rx = perspectiveRx;
        ry = perspectiveRy;
        break;
      case 'AXIS':
        // Spin in place at the center of the room
        rx = -20;
        ry = rotationAngle;
        break;
      case 'PLAN':
        // STRUCTURE: free-rotating 3D X-ray inspection of the world tree
        rx = perspectiveRx;
        ry = perspectiveRy;
        break;
      case 'SECTION':
        // Isometric deep cuts view
        rx = -30;
        ry = 45;
        break;
    }

    return `translateZ(${zVal}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;
  };

  const calculatedZCoordinate = Math.round(12 + currentZoom / 50);

  // Room geometry. The room is 800 wide/tall (x,y: -400..400) and extends
  // deeper toward the rear portal (z: -600 monitor wall .. +500 portal wall,
  // 11 depth cells) so the world tree has real space to stand in.
  const CELL = 100;
  const HALF_W = 400;
  const HALF_H = 400;
  const Z_MIN = -600;
  const Z_MAX = 500;
  const DEPTH_CELLS = (Z_MAX - Z_MIN) / CELL; // 11

  const WALL_GRID: Record<string, { cols: number; rows: number }> = {
    left: { cols: DEPTH_CELLS, rows: 8 },
    right: { cols: DEPTH_CELLS, rows: 8 },
    top: { cols: 8, rows: DEPTH_CELLS },
    bottom: { cols: 8, rows: DEPTH_CELLS }
  };

  // Room-space center of a cell (with a small inward offset so link beams
  // never z-fight the wall faces).
  const cellCenter = (cellKey: string): [number, number, number] | null => {
    const dash = cellKey.lastIndexOf('-');
    const wall = cellKey.slice(0, dash);
    const i = Number(cellKey.slice(dash + 1));
    const grid = WALL_GRID[wall];
    if (!grid || Number.isNaN(i)) return null;
    const col = i % grid.cols;
    const row = Math.floor(i / grid.cols);
    switch (wall) {
      case 'left':
        return [-(HALF_W - 4), -HALF_H + row * CELL + 50, Z_MIN + col * CELL + 50];
      case 'right':
        return [HALF_W - 4, -HALF_H + row * CELL + 50, Z_MIN + col * CELL + 50];
      case 'top':
        return [-HALF_W + col * CELL + 50, -(HALF_H - 4), Z_MIN + row * CELL + 50];
      case 'bottom':
        return [-HALF_W + col * CELL + 50, HALF_H - 4, Z_MIN + row * CELL + 50];
      default:
        return null;
    }
  };

  // Explicit per-cell placement (each cell is its own 3D plane; inward-facing
  // normals so backface culling keeps the interior view clean).
  const cellTransform = (wallName: string, col: number, row: number): string => {
    switch (wallName) {
      case 'left': // x = -400; col walks depth, row walks height
        return `rotateY(90deg) translate3d(${-(Z_MIN + (col + 1) * CELL)}px, ${-HALF_H + row * CELL}px, ${-HALF_W}px)`;
      case 'right': // x = +400
        return `rotateY(-90deg) translate3d(${Z_MIN + col * CELL}px, ${-HALF_H + row * CELL}px, ${-HALF_W}px)`;
      case 'top': // y = -400 (ceiling); row walks depth
        return `rotateX(-90deg) translate3d(${-HALF_W + col * CELL}px, ${-(Z_MIN + (row + 1) * CELL)}px, ${-HALF_H}px)`;
      case 'bottom': // y = +400 (floor)
        return `rotateX(90deg) translate3d(${-HALF_W + col * CELL}px, ${Z_MIN + row * CELL}px, ${-HALF_H}px)`;
      default:
        return '';
    }
  };

  // Generate all cells for one grid wall
  const renderWallCells = (wallName: string) => {
    const cells = [];
    const grid = WALL_GRID[wallName];
    const total = grid.cols * grid.rows;
    for (let i = 0; i < total; i++) {
      const menuIndex = (i + (wallName.charCodeAt(0) * 3)) % menuData.length;
      const associatedMenu = menuData[menuIndex];
      const cellKey = `${wallName}-${i}`;
      const sessionId = cellSessions[cellKey];
      const isAlive = sessionId ? liveSessions.includes(sessionId) : false;
      const isFocusedCell = sessionId !== undefined && sessionId === focusedSession;
      const isDocked = sessionId !== undefined && docked.some((p) => p.id === sessionId);
      const col = i % grid.cols;
      const row = Math.floor(i / grid.cols);

      // Ceiling menu module cell
      const menuEntry =
        wallName === 'top'
          ? Object.entries(menuCells).find(([, ck]) => ck === cellKey)
          : undefined;
      if (menuEntry) {
        const m = Number(menuEntry[0]);
        const item = menuData[m];
        cells.push(
          <div
            key={cellKey}
            id={`${wallName}-cell-${i}`}
            className={`grid-cell menu-cell ${draggingMenu === m ? 'is-dragging' : ''}`}
            style={{
              left: 0,
              top: 0,
              transformOrigin: '0 0',
              transform: cellTransform(wallName, col, row)
            }}
            onMouseDown={(e) => {
              if (e.button === 0) {
                e.stopPropagation();
                dragMovedRef.current = false;
                setDraggingMenu(m);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!dragMovedRef.current) menuAction(m);
            }}
            title={`${item.title} — 클릭: 열기 / 드래그: 위치 이동`}
          >
            <div className="cell-3d">
              <div className="cell-face flex flex-col justify-center items-center gap-1">
                <span className="material-symbols-outlined text-sm select-none">{item.icon}</span>
                <span className="font-sans text-[7px] tracking-wider text-amber-200/70 select-none">
                  {item.title}
                </span>
              </div>
              <div className="cell-side side-top" />
              <div className="cell-side side-bottom" />
              <div className="cell-side side-left" />
              <div className="cell-side side-right" />
            </div>
          </div>
        );
        continue;
      }

      cells.push(
        <div
          key={cellKey}
          id={`${wallName}-cell-${i}`}
          className={`grid-cell ${isFocusedCell ? 'is-open' : ''} ${isDocked ? 'is-docked' : ''} ${sessionId ? 'has-session' : ''} ${linkDragFrom === cellKey ? 'link-origin' : ''}`}
          style={{
            left: 0,
            top: 0,
            transformOrigin: '0 0',
            transform: cellTransform(wallName, col, row)
          }}
          onMouseDown={(e) => {
            if (e.button === 0) {
              linkDragRef.current = { from: cellKey, startX: e.clientX, startY: e.clientY, active: false };
            }
          }}
          onClick={(e) => handleCellClick(wallName, i, e)}
          onContextMenu={(e) => handleCellKill(wallName, i, e)}
          title={sessionId ? `${sessionId} — 클릭: 메인으로 / 드래그: 연결 / 우클릭: 종료` : '클릭: 새 터미널 / 드래그: 다른 큐브와 연결'}
        >
          <div className="cell-3d">
            {/* Main Face */}
            <div className="cell-face bg-[#161616] flex flex-col justify-center items-center gap-1">
              <span className="material-symbols-outlined text-xs text-zinc-400 opacity-30 select-none">
                {sessionId ? 'terminal' : associatedMenu.icon}
              </span>
              {sessionId && (
                <span
                  className="session-dot w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: isAlive ? '#34d399' : '#ef4444',
                    boxShadow: isAlive ? '0 0 6px #34d399' : 'none'
                  }}
                />
              )}
            </div>

            {/* 3D Extrusion Side Panels */}
            <div className="cell-side side-top" />
            <div className="cell-side side-bottom" />
            <div className="cell-side side-left" />
            <div className="cell-side side-right" />
          </div>
        </div>
      );
    }
    return cells;
  };

  return (
    <div className={`relative min-h-screen w-screen overflow-hidden bg-gradient-to-b ${activeDim.bgGradient} text-white select-none transition-all duration-1000 ${isGrayscale ? 'grayscale' : ''}`}>
      <div className="atmospheric-vignette" />

      {/* Top Header styled with Geometric Balance Theme */}
      <header className="fixed top-0 left-0 w-full z-50 h-[80px] flex justify-between items-center px-10 bg-[#111111]/90 backdrop-blur-xl border-b border-[#333333]">
        <div className="flex items-center gap-3">
          <Compass className="w-5 h-5 text-white stroke-[2.5]" />
          <span className="font-headline font-black tracking-[4px] text-lg text-white uppercase">
            ARCHITECT_OS
          </span>
        </div>
        
        <nav className="hidden md:flex items-center gap-10">
          <button
            onClick={() => {
              setCameraMode('COORDINATES');
              triggerNotification('VIEW MODE: INTERIOR COORDINATES INITIALIZED');
            }}
            className={`font-headline tracking-[2px] uppercase text-[11px] font-bold pb-1.5 transition-all border-b-2 ${
              cameraMode === 'COORDINATES' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-white'
            }`}
          >
            INTERIOR
          </button>
          <button
            onClick={() => {
              setCameraMode('PLAN');
              triggerNotification('STRUCTURE X-RAY: WORLD TREE INSPECTION MODE');
            }}
            className={`font-headline tracking-[2px] uppercase text-[11px] font-bold pb-1.5 transition-all border-b-2 ${
              cameraMode === 'PLAN' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-white'
            }`}
          >
            STRUCTURE
          </button>
          <button
            onClick={() => {
              setCameraMode('SECTION');
              triggerNotification('VIEW MODE: CROSS SECTION ISOMETRIC INITIALIZED');
            }}
            className={`font-headline tracking-[2px] uppercase text-[11px] font-bold pb-1.5 transition-all border-b-2 ${
              cameraMode === 'SECTION' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-white'
            }`}
          >
            LAYERS
          </button>
        </nav>

        <div className="flex items-center gap-4 text-white">
          <button
            id="btn-links-toggle"
            onClick={() => {
              setShowLinks((prev) => {
                triggerNotification(prev ? 'LINK BEAMS HIDDEN' : 'LINK BEAMS VISIBLE');
                return !prev;
              });
            }}
            className={`p-2 rounded border transition-all cursor-pointer ${
              showLinks
                ? 'text-white bg-white/10 border-[#333333]'
                : 'border-[#333333] text-zinc-500 hover:text-white'
            }`}
            title={`연결선 ${showLinks ? '숨기기' : '보이기'} (${links.length}개)`}
          >
            <Share2 className="w-4.5 h-4.5" />
          </button>
          <button
            id="btn-camera-lock"
            onClick={toggleCameraLock}
            className={`p-2 rounded border transition-all cursor-pointer ${
              isCameraLocked
                ? 'text-black bg-white border-white'
                : 'border-[#333333] text-zinc-400 hover:text-white hover:border-zinc-500'
            }`}
            title={isCameraLocked ? '카메라 잠금 해제 (Ctrl+Shift+L)' : '카메라 잠금 — 작업 모드 (Ctrl+Shift+L)'}
          >
            {isCameraLocked ? <Lock className="w-4.5 h-4.5" /> : <Unlock className="w-4.5 h-4.5" />}
          </button>
          <button
            id="btn-drive-toggle"
            className={`p-2 rounded border border-[#333333] transition-all flex items-center gap-1.5 cursor-pointer ${driveOpen ? 'text-white bg-white/15 border-white/50' : 'text-zinc-400 hover:text-white hover:border-zinc-500'}`}
            onClick={() => {
              setDriveOpen(!driveOpen);
              if (settingsOpen) setSettingsOpen(false);
            }}
            title="Google Drive Storage Vault"
          >
            <Cloud className="w-4.5 h-4.5" />
            {token && (
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            )}
          </button>
          <button 
            id="btn-settings-toggle"
            className={`p-2 rounded border border-[#333333] transition-colors cursor-pointer ${settingsOpen ? 'text-white bg-white/10' : 'text-zinc-400 hover:text-white'}`}
            onClick={() => {
              setSettingsOpen(!settingsOpen);
              if (driveOpen) setDriveOpen(false);
            }}
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
          <button
            id="btn-rise-toggle"
            onClick={() => {
              setIsRisen(!isRisen);
              triggerNotification(isRisen ? 'DE-ACTIVATING WIREFRAME AXIS COLLAPSE' : 'RECALIBRATING CORE STRUCTURE ELEVATION');
            }}
            className="p-2 rounded border border-[#333333] text-zinc-400 hover:text-white transition-colors"
            title="Toggle Core Schematic Rise"
          >
            <Grid className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Side Navigation Bar */}
      <aside className="fixed left-0 top-0 h-full flex flex-col justify-center items-center gap-12 z-40 border-r border-[#333333]/40 w-20 bg-[#111111]/30 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-9">
          <button
            onClick={() => {
              setCameraMode('COORDINATES');
              triggerNotification('COORDINATE SECTOR SYSTEM ACTIVATED');
            }}
            className={`flex flex-col items-center gap-1.5 group cursor-pointer transition-all ${
              cameraMode === 'COORDINATES' ? 'text-white font-black scale-105' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: cameraMode === 'COORDINATES' ? "'FILL' 1" : "'FILL' 0" }}>
              location_searching
            </span>
            <span className="font-sans uppercase tracking-[2px] text-[8px] font-bold">COORDS</span>
          </button>

          <button
            onClick={() => {
              setCameraMode('ORBIT');
              triggerNotification('OMNISCIENT ORBIT VIEW ENGAGED');
            }}
            className={`flex flex-col items-center gap-1.5 group cursor-pointer transition-all ${
              cameraMode === 'ORBIT' ? 'text-white font-black scale-105' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              orbit
            </span>
            <span className="font-sans uppercase tracking-[2px] text-[8px] font-bold">ORBIT</span>
          </button>

          <button
            onClick={() => {
              setCameraMode('AXIS');
              triggerNotification('TURNTABLE AUTO-AXIS ALIGNMENT ACTIVATED');
            }}
            className={`flex flex-col items-center gap-1.5 group cursor-pointer transition-all ${
              cameraMode === 'AXIS' ? 'text-white font-black scale-105' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              3d_rotation
            </span>
            <span className="font-sans uppercase tracking-[2px] text-[8px] font-bold">AXIS</span>
          </button>

          <button
            onClick={() => {
              setCameraMode('PLAN');
              triggerNotification('WORLD TREE X-RAY: DRAG TO ORBIT THE STRUCTURE');
            }}
            className={`flex flex-col items-center gap-1.5 group cursor-pointer transition-all ${
              cameraMode === 'PLAN' ? 'text-white font-black scale-105' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              layers
            </span>
            <span className="font-sans uppercase tracking-[2px] text-[8px] font-bold">PLAN</span>
          </button>

          <button
            onClick={() => {
              setModelMode((prev) => {
                triggerNotification(
                  prev
                    ? 'MODELING CANVAS CLOSED'
                    : 'MODELING CANVAS OPEN — 바닥 클릭: 블록 쌓기 / 우클릭: 제거'
                );
                return !prev;
              });
            }}
            className={`flex flex-col items-center gap-1.5 group cursor-pointer transition-all ${
              modelMode ? 'text-emerald-400 font-black scale-105' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-xl">deployed_code</span>
            <span className="font-sans uppercase tracking-[2px] text-[8px] font-bold">MODEL</span>
          </button>

          <button
            onClick={() => {
              setCameraMode('SECTION');
              triggerNotification('STRUCTURAL CROSS-SECTION ELEVATION LOCKED');
            }}
            className={`flex flex-col items-center gap-1.5 group cursor-pointer transition-all ${
              cameraMode === 'SECTION' ? 'text-white font-black scale-105' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              architecture
            </span>
            <span className="font-sans uppercase tracking-[2px] text-[8px] font-bold">SECTION</span>
          </button>
        </div>
      </aside>

      {/* Google Drive Panel Overlay */}
      {driveOpen && (
        <div className="fixed top-24 right-8 w-80 bg-[#161616]/95 border border-[#333333] p-6 z-50 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-250 shadow-2xl overflow-y-auto max-h-[82vh] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5 pb-2.5 border-b border-[#333333]">
              <h3 className="font-headline font-bold text-xs uppercase tracking-[2px] text-white flex items-center gap-2">
                <Cloud className="w-4 h-4 text-sky-400" />
                <span>CLOUD STORAGE VAULT</span>
              </h3>
              <button onClick={() => setDriveOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-5 font-sans text-xs">
              {!user ? (
                <div className="space-y-4">
                  <div className="text-zinc-400 leading-relaxed text-[10px] uppercase tracking-wider bg-zinc-900/50 p-3 border border-zinc-800/60">
                    Connect your secure Google workspace to save, version-control, and load your custom architectural drafts and blueprint coordinate states across machines.
                  </div>
                  
                  {/* GSI style button */}
                  <button 
                    onClick={handleDriveSignIn}
                    className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-2.5 px-4 rounded hover:bg-zinc-200 transition-all shadow-lg text-[10px] uppercase tracking-widest cursor-pointer"
                  >
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>Connect Google Drive</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* User profile */}
                  <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer" className="w-6 h-6 rounded-full border border-zinc-700" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-white uppercase font-black">
                          {user.displayName?.[0] || 'U'}
                        </div>
                      )}
                      <div className="truncate">
                        <span className="block font-bold text-white text-[10px] truncate leading-tight">{user.displayName}</span>
                        <span className="block text-zinc-500 text-[8px] truncate leading-tight">{user.email}</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleDriveLogout}
                      className="p-1.5 border border-zinc-800 hover:border-red-900 hover:bg-red-950/20 text-zinc-400 hover:text-red-400 rounded cursor-pointer transition-colors"
                      title="Disconnect account"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Save Draft */}
                  <div className="space-y-2 border-t border-zinc-800 pt-3">
                    <span className="text-zinc-400 block uppercase tracking-wider text-[9px] font-bold">COMMIT SYSTEM SCHEMATIC</span>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={saveFilename}
                        onChange={(e) => setSaveFilename(e.target.value)}
                        placeholder="schematic_rev_1"
                        className="flex-1 bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-white font-mono text-[10px] rounded focus:outline-none focus:border-zinc-500"
                        disabled={isSaving}
                      />
                      <button 
                        onClick={handleSaveToDrive}
                        disabled={isSaving || !saveFilename.trim()}
                        className="px-3 bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-widest text-[9px] rounded flex items-center gap-1 cursor-pointer transition-all disabled:opacity-40"
                      >
                        {isSaving ? 'WRITING...' : 'SAVE'}
                      </button>
                    </div>
                  </div>

                  {/* File List */}
                  <div className="space-y-2 border-t border-zinc-800 pt-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-zinc-400 block uppercase tracking-wider text-[9px] font-bold">SAVED SYSTEM REVISIONS</span>
                      <button 
                        onClick={() => token && loadDriveFilesList(token)}
                        className="text-zinc-500 hover:text-white cursor-pointer p-0.5"
                        title="Refresh index"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>

                    {isLoadingFiles ? (
                      <div className="py-8 flex flex-col justify-center items-center gap-2.5 text-zinc-500">
                        <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
                        <span className="text-[8px] tracking-widest uppercase font-mono animate-pulse">Syncing storage...</span>
                      </div>
                    ) : driveFiles.length === 0 ? (
                      <div className="py-6 text-center text-zinc-500 text-[9px] uppercase tracking-wider border border-dashed border-zinc-800">
                        No drafts found in Drive.
                      </div>
                    ) : (
                      <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                        {driveFiles.map((file) => (
                          <div 
                            key={file.id}
                            className="flex items-center justify-between p-2 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-850/80 rounded transition-all group"
                          >
                            <button 
                              onClick={() => handleLoadFromDrive(file.id, file.name)}
                              className="flex-1 text-left min-w-0 pr-2 cursor-pointer"
                              title="Restore state"
                            >
                              <span className="block font-bold text-zinc-300 group-hover:text-white font-mono text-[9px] truncate">
                                {file.name.replace('.json', '')}
                              </span>
                              <span className="block text-[7px] text-zinc-500 font-mono">
                                {file.createdTime ? new Date(file.createdTime).toLocaleString() : 'N/A'}
                              </span>
                            </button>
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleLoadFromDrive(file.id, file.name)}
                                className="p-1 hover:bg-zinc-800 text-sky-400 hover:text-sky-300 rounded cursor-pointer"
                                title="Load revision"
                              >
                                <Play className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => handleDeleteFromDrive(file.id, file.name)}
                                className="p-1 hover:bg-zinc-800 text-red-500 hover:text-red-400 rounded cursor-pointer"
                                title="Delete revision"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel Overlay */}
      {settingsOpen && (
        <div className="fixed top-24 right-8 w-80 bg-[#161616]/95 border border-[#333333] p-6 z-50 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-250 shadow-2xl">
          <div className="flex justify-between items-center mb-5 pb-2.5 border-b border-[#333333]">
            <h3 className="font-headline font-bold text-xs uppercase tracking-[2px] text-white">SYSTEM CONFIG</h3>
            <button onClick={() => setSettingsOpen(false)} className="text-zinc-400 hover:text-white">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
          
          <div className="space-y-4 font-sans text-xs">
            <div>
              <span className="text-zinc-400 block mb-1 uppercase tracking-wider text-[9px]">CORE MODEL INTEGRITY</span>
              <div className="bg-zinc-900 p-2.5 border border-zinc-800 uppercase tracking-widest text-[9px] text-zinc-300 font-mono">
                VIRTUALIZED_CORE_ACTIVE
              </div>
            </div>

            <div>
              <span className="text-zinc-400 block mb-1 uppercase tracking-wider text-[9px]">RENDER QUALITY DECK</span>
              <div className="flex gap-2">
                <button className="flex-1 py-1.5 bg-white text-black text-[9px] font-bold tracking-widest uppercase">ULTRA</button>
                <button className="flex-1 py-1.5 border border-[#333333] hover:bg-zinc-900 text-[9px] tracking-widest uppercase text-zinc-300">DRAFT</button>
              </div>
            </div>

            <div>
              <span className="text-zinc-400 block mb-1 uppercase tracking-wider text-[9px]">Focal Depth (Perspective)</span>
              <div className="flex justify-between items-center bg-zinc-950 p-2.5 border border-zinc-800 text-zinc-300 font-mono">
                <span>ZOOM FACTOR:</span>
                <span>{currentZoom}px</span>
              </div>
            </div>

            <div>
              <span className="text-zinc-400 block mb-1 uppercase tracking-wider text-[9px]">3D CAMERA INTERACTION (카메라 조작)</span>
              <div className="bg-zinc-950 p-2.5 border border-zinc-800 space-y-2 text-[9px] font-mono text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">WHEEL SCROLL / DRAG:</span>
                  <span className="text-white font-bold">ZOOM IN / OUT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">WHEEL BUTTON DRAG:</span>
                  <span className="text-white font-bold">ROTATE VIEWPOINT</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-zinc-400 block mb-1 uppercase tracking-wider text-[9px]">MONOCHROME DISPLAY (흑백 모드)</span>
              <button 
                onClick={() => {
                  setIsGrayscale(!isGrayscale);
                  triggerNotification(!isGrayscale ? 'MONOCHROME DISPLAY RENDERED' : 'CHROMATIC CORE RESTORED');
                }}
                className={`w-full py-2 border text-[9px] font-bold tracking-widest uppercase transition-all ${
                  isGrayscale 
                    ? 'bg-white text-black border-white' 
                    : 'border-[#333333] text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                {isGrayscale ? 'MONOCHROME: ON' : 'MONOCHROME: OFF'}
              </button>
            </div>

            <div className="pt-2">
              <button 
                onClick={() => {
                  setCurrentZoom(0);
                  setCameraMode('COORDINATES');
                  setIsRisen(true);
                  triggerNotification('FULL CONTROLS RESTORED TO FACTORY ORIGIN');
                }}
                className="w-full py-2.5 bg-white text-black font-bold tracking-widest text-[10px] uppercase hover:bg-zinc-200 transition-colors"
              >
                RESET ENVIRONMENT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STRUCTURE mode: plant a new project tree */}
      {cameraMode === 'PLAN' && (
        <div className="fixed bottom-16 left-28 z-50 w-80 bg-[#161616]/95 border border-[#333333] p-4 backdrop-blur-md shadow-2xl">
          <span className="text-zinc-400 block mb-2 uppercase tracking-wider text-[9px] font-bold">
            WORLD TREE FOREST — 새 나무 심기 (git 저장소 경로)
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={newProjectPath}
              onChange={(e) => setNewProjectPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') plantProject();
              }}
              placeholder="D:\Git\my-project"
              className="flex-1 bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-white font-mono text-[10px] rounded focus:outline-none focus:border-emerald-700"
            />
            <button
              onClick={plantProject}
              disabled={!newProjectPath.trim()}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-widest text-[9px] rounded cursor-pointer transition-all disabled:opacity-40"
            >
              PLANT
            </button>
          </div>
        </div>
      )}

      {/* Portal Destination Panel */}
      {portalOpen && (
        <div className="fixed top-24 right-8 w-80 bg-[#161616]/95 border border-[#333333] p-6 z-50 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-250 shadow-2xl">
          <div className="flex justify-between items-center mb-5 pb-2.5 border-b border-[#333333]">
            <h3 className="font-headline font-bold text-xs uppercase tracking-[2px] text-white">
              PORTAL: SELECT DIMENSION
            </h3>
            <button onClick={() => setPortalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <div className="space-y-4 font-sans text-xs">
            <div>
              <span className="text-zinc-400 block mb-2 uppercase tracking-wider text-[9px]">
                LOCAL DIMENSIONS (색 테마)
              </span>
              <div className="space-y-1.5">
                {DIMENSIONS.map((dim, idx) => (
                  <button
                    key={dim.id}
                    onClick={() => warpToDimension(idx)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 border text-left transition-all cursor-pointer ${
                      idx === currentDimIndex
                        ? 'border-white/60 bg-white/10'
                        : 'border-zinc-800 hover:border-zinc-500 hover:bg-zinc-900'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: dim.starColor, boxShadow: `0 0 6px ${dim.starColor}` }}
                    />
                    <span className="font-mono text-[9px] tracking-widest text-zinc-300 uppercase truncate">
                      {dim.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-3">
              <span className="text-zinc-400 block mb-2 uppercase tracking-wider text-[9px]">
                REMOTE DIMENSIONS (SSH)
              </span>
              {sshProfiles.length > 0 && (
                <div className="space-y-1.5 mb-2 max-h-[140px] overflow-y-auto pr-1">
                  {sshProfiles.map((host) => (
                    <button
                      key={host}
                      onClick={() => connectRemote(host)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 border border-zinc-800 hover:border-cyan-700 hover:bg-cyan-950/20 text-left transition-all cursor-pointer"
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-cyan-400" style={{ boxShadow: '0 0 6px #22d3ee' }} />
                      <span className="font-mono text-[9px] tracking-widest text-zinc-300 truncate">{host}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={remoteHostInput}
                  onChange={(e) => setRemoteHostInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      connectRemote(remoteHostInput);
                      setRemoteHostInput('');
                    }
                  }}
                  placeholder="user@host"
                  className="flex-1 bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-white font-mono text-[10px] rounded focus:outline-none focus:border-cyan-700"
                />
                <button
                  onClick={() => {
                    connectRemote(remoteHostInput);
                    setRemoteHostInput('');
                  }}
                  disabled={!remoteHostInput.trim()}
                  className="px-3 bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-widest text-[9px] rounded cursor-pointer transition-all disabled:opacity-40"
                >
                  WARP
                </button>
              </div>
              <p className="text-zinc-500 text-[8px] tracking-wider mt-2 leading-relaxed uppercase">
                비밀번호/호스트키 확인은 열린 터미널 안에서 그대로 진행됩니다
              </p>
            </div>
          </div>
        </div>
      )}

      {/* UI Overlay for Live Metadata & HUD */}
      <div className="ui-overlay p-8 flex flex-col justify-between">
        
        {/* Upper Readout */}
        <div className="flex justify-between items-start pt-16 pl-24">
          <div className="flex flex-col gap-1.5">
            <span className="font-sans uppercase tracking-[2px] text-[9px] text-zinc-400">Spatial Coordinate</span>
            <span className="font-headline font-bold text-2xl tracking-tight text-white" id="coord-display">
              X: 02 / Y: 04 / Z: {calculatedZCoordinate < 10 ? `0${calculatedZCoordinate}` : calculatedZCoordinate}
            </span>
          </div>

          <div className="text-right flex flex-col gap-1.5">
            <span className="font-sans uppercase tracking-[2px] text-[9px] text-zinc-400">System Status</span>
            <span className="font-headline font-bold text-2xl tracking-tight text-white uppercase font-mono">
              {systemStatus}
            </span>
          </div>
        </div>

        {/* Custom Event Flasher */}
        {customNotify && (
          <div className="fixed top-40 left-1/2 -translate-x-1/2 bg-[#161616] text-white px-6 py-3 border border-[#333333] font-mono tracking-widest text-[10px] uppercase z-50 flex items-center gap-3 animate-in fade-in slide-in-from-top-5 shadow-2xl max-w-lg text-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
            <span>{customNotify}</span>
          </div>
        )}

        {/* Lower Readout & Actions */}
        <div className="pl-24 pb-8 flex justify-between items-end">
          <div className="max-w-xs space-y-4">
            <div className="h-[1px] w-12 bg-white" />
            <p className="font-sans text-[10px] text-zinc-400 leading-relaxed uppercase tracking-wider">
              {`OPERATOR CONSOLE: ${liveSessions.length} LIVE TERMINAL${liveSessions.length === 1 ? '' : 'S'}, ${docked.length}/4 DOCKED. CLICK ANY WALL CELL TO SPAWN OR DOCK / RIGHT-CLICK TO KILL. FOCUSED: [${focusedSession}]`}
            </p>
          </div>

          <div className="flex gap-4 pointer-all">
            <button
              onClick={() => {
                setIsRisen(!isRisen);
                triggerNotification(!isRisen ? 'RECALIBRATION AXIS DESCENDED' : 'RECALIBRATION AXIS RETRACTED');
              }}
              className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest text-[10px] hover:bg-zinc-200 transition-all shadow-md"
            >
              RECALIBRATE_AXIS
            </button>
            <button
              onClick={handleExportSchematic}
              className="px-8 py-3 bg-transparent border border-zinc-700 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-zinc-900 transition-colors flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT_SCHEMATIC</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3D Scene Viewport */}
      <main
        ref={zoomContainerRef}
        className="perspective-container relative"
        id="zoom-container"
        style={{
          // Wide-angle lens inside the room, telephoto for exterior views
          perspective: isInteriorMode ? `${INTERIOR_PERSPECTIVE}px` : '1200px'
        }}
      >
        {/* Cosmic Starfield Background (twinkling space stars) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {stars.map((star) => (
            <div
              key={star.id}
              className={`twinkling-star ${isWarping ? 'star-streaking' : ''}`}
              style={{
                position: 'absolute',
                top: `${star.top}%`,
                left: `${star.left}%`,
                width: `${star.size}px`,
                height: `${isWarping ? star.size * 5 : star.size}px`,
                backgroundColor: isGrayscale ? '#ffffff' : activeDim.starColor,
                borderRadius: '9999px',
                animationDelay: `${star.delay}s`,
                opacity: isWarping ? 0.95 : 0.6,
                boxShadow: star.size > 2 && !isGrayscale ? `0 0 8px ${activeDim.starColor}` : 'none',
                transition: 'background-color 1s ease, height 0.5s ease, box-shadow 1s ease'
              }}
            />
          ))}
        </div>

        <div
          className={`cube-room ${isRisen ? 'is-risen' : ''} ${cameraMode === 'PLAN' ? 'structure-xray' : ''}`}
          id="cube-room"
          style={{
            transform: getRoomTransform(),
            // Pivot at the viewer's eye so rotation = turning your head
            transformOrigin: isInteriorMode ? `50% 50% ${INTERIOR_EYE_LOCAL_Z}px` : '50% 50%'
          }}
        >
          {/* GRID WALLS — cells are direct children of the room anchor so each
              renders on its own plane (no whole-wall culling from inside) */}
          {renderWallCells('bottom')}
          {cameraMode !== 'PLAN' && cameraMode !== 'SECTION' && renderWallCells('top')}
          {renderWallCells('left')}
          {renderWallCells('right')}

          {/* VOXEL BLOCKS — the floor as a simple modeling canvas */}
          {Object.entries(voxels).flatMap(([cellKey, count]) => {
            const center = cellCenter(cellKey);
            if (!center) return [];
            const [vx, , vz] = center;
            return Array.from({ length: Number(count) }, (_, h) => (
              <div
                key={`${cellKey}-vox-${h}`}
                className="voxel-anchor"
                style={{ transform: `translate3d(${vx}px, ${400 - 35 - h * 70}px, ${vz}px)` }}
              >
                {[0, 90, 180, 270].map((angle) => (
                  <div
                    key={angle}
                    className="voxel-face"
                    style={{
                      transform: `rotateY(${angle}deg) translateZ(35px)`,
                      backgroundColor: `${activeDim.starColor}15`,
                      borderColor: `${activeDim.starColor}55`
                    }}
                  />
                ))}
                <div
                  className="voxel-face"
                  style={{
                    transform: 'rotateX(90deg) translateZ(35px)',
                    backgroundColor: `${activeDim.starColor}22`,
                    borderColor: `${activeDim.starColor}55`
                  }}
                />
              </div>
            ));
          })}

          {/* MIND-MAP LINK BEAMS — segmented so the interior camera only
              culls the piece behind your head, never the whole line */}
          {showLinks &&
            links.map((link) => {
              const a = cellCenter(link.from);
              const b = cellCenter(link.to);
              if (!a || !b) return null;
              const dx = b[0] - a[0];
              const dy = b[1] - a[1];
              const dz = b[2] - a[2];
              const len = Math.hypot(dx, dy, dz);
              if (len < 1) return null;
              const pitchDeg = (Math.asin(dy / len) * 180) / Math.PI;
              const yawDeg = (Math.atan2(-dz, dx) * 180) / Math.PI;
              const segCount = Math.max(4, Math.ceil(len / 90));
              const segLen = len / segCount;
              return (
                <div
                  key={link.id}
                  className="link-beam-anchor"
                  style={{
                    transform: `translate3d(${a[0]}px, ${a[1]}px, ${a[2]}px) rotateY(${yawDeg}deg) rotateZ(${pitchDeg}deg)`
                  }}
                >
                  {Array.from({ length: segCount }, (_, s) => (
                    <React.Fragment key={s}>
                      <div
                        className="link-seg"
                        style={{
                          left: `${segLen * s}px`,
                          width: `${segLen + 1}px`,
                          color: activeDim.starColor,
                          backgroundColor: activeDim.starColor,
                          animationDelay: `${(s / segCount) * 1.2}s`
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeLink(link.id);
                        }}
                        title={`${link.from.toUpperCase()} ⇄ ${link.to.toUpperCase()} — 우클릭: 연결 해제`}
                      />
                      <div
                        className="link-seg fin"
                        style={{
                          left: `${segLen * s}px`,
                          width: `${segLen + 1}px`,
                          color: activeDim.starColor,
                          backgroundColor: activeDim.starColor,
                          animationDelay: `${(s / segCount) * 1.2}s`
                        }}
                      />
                    </React.Fragment>
                  ))}
                </div>
              );
            })}

          {/* THE WORLD TREE — grown from real git data, rooted mid-room.
              From the default seat it is behind you (turn around to see it);
              STRUCTURE mode x-rays the walls to inspect it. */}
          <div className="building-container" id="building-mass">
            <WorldTree
              accentColor={activeDim.starColor}
              risen={isRisen}
              refreshNonce={treeRefreshNonce}
              onBranchClick={openBranchTerminal}
            />
          </div>

          {/* OPPOSITE FRONT WALL PORTAL */}
          <div 
            className={`wall wall-front cursor-pointer relative ${isSplitting ? 'is-splitting' : ''}`}
            id="front-wall"
            onClick={(e) => {
              e.stopPropagation();
              handleBackWallClick();
            }}
            style={{
              borderColor: isGrayscale ? undefined : `${activeDim.starColor}40`
            }}
          >
            {/* The Portal Vortex & Physical Gateway Structure */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-10 pointer-events-none">
              {/* Outer Circular Portal Frame */}
              <div 
                className="absolute w-[350px] h-[350px] border border-dashed rounded-full flex items-center justify-center transition-all duration-1000"
                style={{ 
                  borderColor: isGrayscale ? 'rgba(255,255,255,0.15)' : `${activeDim.starColor}35`,
                  boxShadow: isGrayscale ? 'none' : `0 0 15px ${activeDim.starColor}15, inset 0 0 15px ${activeDim.starColor}10`
                }}
              >
                {/* Orbital dots marker ring */}
                <div 
                  className="absolute inset-2 border border-dotted rounded-full animate-[spin-clockwise_35s_linear_infinite] opacity-40"
                  style={{ borderColor: isGrayscale ? 'rgba(255,255,255,0.1)' : `${activeDim.starColor}25` }}
                />
                
                {/* Gateway Status Banner Label */}
                <div 
                  className="absolute -top-11 px-3 py-1 border font-mono text-[8px] tracking-[0.25em] bg-[#111111]/95 select-none"
                  style={{ 
                    borderColor: isGrayscale ? 'rgba(255,255,255,0.2)' : `${activeDim.starColor}30`,
                    color: isGrayscale ? '#888' : activeDim.starColor
                  }}
                >
                  {isWarping ? 'PORTAL: WARP_ENGAGED' : 'PORTAL: SYSTEM_READY'}
                </div>
              </div>

              {/* Swirling Dimensional Vortex */}
              <div 
                className={`portal-vortex-container ${isSplitting || isWarping ? 'warp-supercharge' : ''}`}
                style={{ color: activeDim.starColor }}
              >
                <div className="portal-ring ring-1" style={{ borderColor: isGrayscale ? undefined : `${activeDim.starColor}50` }} />
                <div className="portal-ring ring-2" style={{ borderColor: isGrayscale ? undefined : `${activeDim.starColor}35` }} />
                <div className="portal-ring ring-3" style={{ borderColor: isGrayscale ? undefined : `${activeDim.starColor}20` }} />
                <div 
                  className="portal-core" 
                  style={{ background: `radial-gradient(circle, ${activeDim.starColor} 0%, transparent 75%)` }} 
                />
              </div>
            </div>

            {/* Sliding Glassy Shutter Doors */}
            <div 
              className="dashboard-split-left flex items-center justify-end pr-4 text-zinc-500 font-mono text-[9px]"
              style={{
                borderColor: isGrayscale ? 'rgba(255, 255, 255, 0.1)' : `${activeDim.starColor}25`,
                backgroundColor: 'rgba(20, 20, 20, 0.45)'
              }}
            >
              <span style={{ color: isGrayscale ? undefined : `${activeDim.starColor}70` }}>[PORTAL_L_GATE]</span>
            </div>
            <div 
              className="dashboard-split-right flex items-center justify-start pl-4 text-zinc-500 font-mono text-[9px]"
              style={{
                borderColor: isGrayscale ? 'rgba(255, 255, 255, 0.1)' : `${activeDim.starColor}25`,
                backgroundColor: 'rgba(20, 20, 20, 0.45)'
              }}
            >
              <span style={{ color: isGrayscale ? undefined : `${activeDim.starColor}70` }}>[PORTAL_R_GATE]</span>
            </div>

            {/* Text Overlay indicating Opposing Portal */}
            <div className="relative z-30 p-12 flex flex-col items-center justify-center text-center w-full select-none pointer-events-none">
              <span className="font-sans text-[10px] tracking-[0.4em] text-zinc-400 uppercase font-bold">
                OPPOSITE_HYPER_GATEWAY_B
              </span>
              <span className="font-mono text-[8px] text-zinc-500 mt-2 tracking-[0.2em]">
                CLICK GATEWAY SURFACE TO INITIATE DIMENSIONAL SHIFT
              </span>
            </div>
          </div>

          {/* FAR BACK WALL - MAIN OPERATIONAL DASHBOARD */}
          <div 
            className="wall wall-back relative"
            id="back-wall"
            style={{
              borderColor: isGrayscale ? undefined : `${activeDim.starColor}40`
            }}
          >
            {/* Main Terminal Viewport: a monitor mounted at the wall's center,
                sized to stay fully visible from the interior cockpit camera */}
            <div
              className="relative z-30 w-full h-full flex items-center justify-center cursor-pointer"
              id="dashboard-content"
              onClick={(e) => {
                // Clicking the monitor frame / wall around it aligns the view
                // (clicks inside the terminal are stopped by TerminalView)
                e.stopPropagation();
                alignToFront();
              }}
              title="클릭하면 정면 정렬"
            >
              <div
                className="w-[710px] h-[630px] flex flex-col-reverse bg-[#0c0c0c]/95 shadow-2xl"
                style={{
                  border: `1px solid ${activeDim.starColor}30`,
                  boxShadow: `0 0 32px ${activeDim.starColor}12`,
                  transform: 'translateY(-10px)'
                }}
              >
                {/* Status strip lives at the BOTTOM (flex-col-reverse): the top
                    edge may sit under the fixed HUD bar, and a terminal's
                    important content is at the bottom anyway */}
                <div className="flex justify-between items-center px-3 py-1 border-t border-[#222222] shrink-0">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3 h-3" style={{ color: activeDim.starColor }} />
                    <span className="font-headline font-black tracking-[2px] text-[11px] text-white uppercase">
                      {focusedSession}
                    </span>
                    <span
                      className="font-mono text-[8px] tracking-widest uppercase px-1.5 py-0.5 border"
                      style={{ color: activeDim.starColor, borderColor: `${activeDim.starColor}50` }}
                      title="이 터미널이 위치한 큐브 셀"
                    >
                      @ {locationOf(focusedSession)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[8px] text-zinc-500 tracking-widest uppercase">
                      SESSIONS: {liveSessions.length} / DOCKED: {docked.length}/4
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        autoSpawnTerminal();
                      }}
                      className="font-mono text-[8px] tracking-widest uppercase px-1.5 py-0.5 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-400 cursor-pointer transition-colors"
                      title="새 터미널 — 메인에서 가까운 빈 셀에 자동 배치"
                    >
                      + NEW
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 flex">
                  {(['L', 'R'] as const).map((side) => {
                    const panes = docked.filter((p) => p.side === side);
                    if (panes.length === 0) return null;
                    return (
                      <div key={side} className="flex-1 min-w-0 flex flex-col">
                        {panes.map((pane) => (
                          <div
                            key={pane.id}
                            className="flex-1 min-h-0 flex flex-col"
                            style={{
                              border:
                                focusedSession === pane.id && docked.length > 1
                                  ? `1px solid ${activeDim.starColor}60`
                                  : '1px solid #1a1a1a'
                            }}
                            onClick={() => setFocusedSession(pane.id)}
                          >
                            {/* pane label sits at the BOTTOM (order-last) so the
                                top pane row never hides under the fixed HUD bar */}
                            {docked.length > 1 && (
                              <div className="order-last flex justify-between items-center px-2 py-0.5 bg-[#111111] shrink-0">
                                <span
                                  className="font-mono text-[8px] tracking-widest uppercase truncate"
                                  style={{
                                    color: focusedSession === pane.id ? activeDim.starColor : '#71717a'
                                  }}
                                >
                                  {pane.id} @ {locationOf(pane.id)}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    undockSession(pane.id);
                                  }}
                                  className="text-zinc-500 hover:text-white text-[10px] leading-none cursor-pointer pl-2"
                                  title="벽으로 되돌리기 (세션 유지)"
                                >
                                  ×
                                </button>
                              </div>
                            )}
                            <div className="flex-1 min-h-0 relative overflow-hidden">
                              {/* Inverse-scale wrapper: projection(S) x scale(1/S) = 1,
                                  so xterm's mouse mapping is exact at the seat */}
                              <div
                                className="absolute"
                                style={{
                                  left: 2,
                                  top: 2,
                                  width: `calc((100% - 4px) * ${MAIN_SCREEN_SCALE})`,
                                  height: `calc((100% - 4px) * ${MAIN_SCREEN_SCALE})`,
                                  transform: `scale(${1 / MAIN_SCREEN_SCALE})`,
                                  transformOrigin: '0 0'
                                }}
                              >
                                <TerminalView
                                  sessionId={pane.id}
                                  accentColor={activeDim.starColor}
                                  focused={focusedSession === pane.id}
                                  fontSize={Math.round(14 * MAIN_SCREEN_SCALE)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Technical Framing Brackets */}
            <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-[#333333] z-30 pointer-events-none" />
            <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-[#333333] z-30 pointer-events-none" />
          </div>
        </div>
      </main>

      {/* Bottom Footer Status Bar */}
      <footer className="fixed bottom-0 left-0 w-full px-8 py-3.5 flex justify-between items-center bg-[#111111]/90 backdrop-blur-sm z-50 border-t border-[#333333]">
        <div className="flex gap-8">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-white" />
            <span className="text-[9px] font-black tracking-[0.3em] uppercase text-white">Render Engine: Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 border border-zinc-600" />
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-zinc-400">Drafting: v.05</span>
          </div>
          <div className="flex items-center gap-2">
            {isCameraLocked ? (
              <Lock className="w-3 h-3 text-white" />
            ) : (
              <Unlock className="w-3 h-3 text-zinc-500" />
            )}
            <span className={`text-[9px] font-bold tracking-[0.3em] uppercase ${isCameraLocked ? 'text-white' : 'text-zinc-400'}`}>
              CAMERA: {isCameraLocked ? 'LOCKED' : 'FREE'}
            </span>
          </div>
        </div>
        <div className="font-sans text-[9px] tracking-widest text-zinc-500">
          © 2026 ARCHITECT_OS / CORE_SYSTEM_REVISION_12
        </div>
      </footer>
    </div>
  );
}
