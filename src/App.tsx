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
  Play
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

type CameraMode = 'COORDINATES' | 'AXIS' | 'PLAN' | 'SECTION';

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
  const [activeCell, setActiveCell] = useState<{ wall: string; index: number; data: MenuItem } | null>(null);
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

  // Trigger 3D model descent from ceiling on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRisen(true);
      triggerNotification('CORE STRUCTURAL MODEL DESCENDING FROM THE CEILING...');
    }, 1000);
    return () => clearTimeout(timer);
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
      activeCell,
      systemStatus,
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
      if (content.activeCell !== undefined) setActiveCell(content.activeCell);
      if (content.systemStatus) setSystemStatus(content.systemStatus);

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
  const [perspectiveRx, setPerspectiveRx] = useState<number>(-15);
  const [perspectiveRy, setPerspectiveRy] = useState<number>(15);
  const isDraggingRef = useRef<boolean>(false);
  const startMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startRotRef = useRef<{ rx: number; ry: number }>({ rx: -15, ry: 15 });

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
      
      // Keep Rx in a reasonable view boundary (-80 to 80 deg) so it doesn't clip or flip upside-down
      const cappedRx = Math.min(Math.max(newRx, -80), 80);
      
      setPerspectiveRx(cappedRx);
      setPerspectiveRy(newRy);
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
  }, [perspectiveRx, perspectiveRy]);

  // Proximity mouse effects on inactive cells
  useEffect(() => {
    const handleCellProximity = (e: MouseEvent) => {
      const cells = document.querySelectorAll('.grid-cell:not(.is-open)');
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

        const face = cell.querySelector('.cell-face') as HTMLDivElement | null;
        const icon = cell.querySelector('.material-symbols-outlined') as HTMLSpanElement | null;

        if (distance < radius) {
          const power = 1 - distance / radius;
          const translateZ = power * 28;
          cell.style.transform = `translateZ(${translateZ}px)`;
          if (face) {
            face.style.backgroundColor = `rgba(255, 255, 255, ${power * 0.08})`;
            face.style.borderColor = `rgba(255, 255, 255, ${0.15 + power * 0.25})`;
          }
          if (icon) {
            icon.style.opacity = String(0.4 + power * 0.6);
            icon.style.transform = `scale(${1 + power * 0.35})`;
          }
        } else {
          cell.style.transform = 'translateZ(0px)';
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
  }, [activeCell]);

  // Handle scroll wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * -0.65;
      setCurrentZoom((prev) => {
        const nextZoom = prev + delta;
        return Math.min(Math.max(nextZoom, 0), 400);
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
  }, []);

  // Active dashboard data
  const activeDim = DIMENSIONS[currentDimIndex];

  const dashboardTitle = activeCell ? activeCell.data.title : activeDim.name;
  const dashboardIcon = activeCell ? activeCell.data.icon : 'compass_calibration';
  const dashboardStat1 = activeCell ? activeCell.data.stat1 : activeDim.systemStatus;
  const dashboardStat2 = activeCell ? activeCell.data.stat2 : activeDim.id;
  const dashboardSectionText = activeCell ? `SECTION: ${activeCell.data.title.toUpperCase()}` : activeDim.sub;

  const handleCellClick = (wall: string, index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Check if the clicked cell was already selected
    if (activeCell && activeCell.wall === wall && activeCell.index === index) {
      // De-select
      setActiveCell(null);
      setSystemStatus(activeDim.systemStatus);
    } else {
      // Find a pseudo-random menu item for this cell to keep it highly dynamic
      const menuIndex = (index + (wall.charCodeAt(0) * 3)) % menuData.length;
      const selectedMenu = menuData[menuIndex];
      
      setActiveCell({
        wall,
        index,
        data: selectedMenu
      });
      setSystemStatus(selectedMenu.title.toUpperCase() + '_ACTIVE');
      
      // Temporarily flash a status alert message
      triggerNotification(selectedMenu.statusText);
    }
  };

  const handleBackWallClick = () => {
    if (isWarping || isSplitting) return;

    setIsSplitting(true);
    triggerNotification('OPENING COGNITIVE PORTAL TO THE DEEP COSMOS...');

    setTimeout(() => {
      setIsWarping(true);
      triggerNotification('WARPING IN PROGRESS: SPEED INTEGRATION FLOW ENGAGED...');

      setTimeout(() => {
        setCurrentDimIndex((prev) => {
          const nextIndex = (prev + 1) % DIMENSIONS.length;
          setSystemStatus(DIMENSIONS[nextIndex].systemStatus);
          return nextIndex;
        });
        setIsWarping(false);
        setIsSplitting(false);
      }, 2000);
    }, 1200);
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

  // Determine the rotation styling of the Room container based on Camera Mode and Scroll Zoom
  const getRoomTransform = () => {
    let rx = -15;
    let ry = 15;
    let rz = 0;
    let zVal = currentZoom;

    if (isWarping) {
      zVal = currentZoom + 1600; // Fly deep into the back wall portal
      rz = rotationAngle * 8;    // Rapid dimensional spin
    }

    switch (cameraMode) {
      case 'COORDINATES':
        // Camera angle is fully controlled by mouse wheel button (middle click) drag rotation
        rx = perspectiveRx;
        ry = perspectiveRy;
        break;
      case 'AXIS':
        // turntable auto rotation, independent of mouse pos
        rx = -20;
        ry = rotationAngle;
        break;
      case 'PLAN':
        // Top-down perspective map view, static and clean
        rx = 90;
        ry = 0;
        rz = 0;
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

  // Generate 64 cells per wall
  const renderWallCells = (wallName: string) => {
    const cells = [];
    for (let i = 0; i < 64; i++) {
      const menuIndex = (i + (wallName.charCodeAt(0) * 3)) % menuData.length;
      const associatedMenu = menuData[menuIndex];
      const isOpen = activeCell?.wall === wallName && activeCell?.index === i;

      cells.push(
        <div
          key={`${wallName}-${i}`}
          id={`${wallName}-cell-${i}`}
          className={`grid-cell ${isOpen ? 'is-open' : ''}`}
          onClick={(e) => handleCellClick(wallName, i, e)}
        >
          {/* Main Face */}
          <div className="cell-face bg-[#161616] flex flex-col justify-center items-center">
            <span className="material-symbols-outlined text-xs text-zinc-400 opacity-30 select-none">
              {associatedMenu.icon}
            </span>
          </div>

          {/* 3D Extrusion Side Panels */}
          <div className="cell-side side-top" />
          <div className="cell-side side-bottom" />
          <div className="cell-side side-left" />
          <div className="cell-side side-right" />
        </div>
      );
    }
    return cells;
  };

  const getSideStyle = (width: string, height: string, transform: string) => {
    return {
      width,
      height,
      transform,
      borderColor: isGrayscale ? 'rgba(255, 255, 255, 0.25)' : `${activeDim.starColor}60`,
      boxShadow: isGrayscale ? 'none' : `0 0 8px ${activeDim.starColor}20, inset 0 0 12px ${activeDim.starColor}10`,
      backgroundColor: isGrayscale ? 'rgba(22, 22, 22, 0.45)' : `${activeDim.starColor}0c`,
      transition: 'border-color 1s ease, box-shadow 1s ease, background-color 1s ease'
    };
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
              triggerNotification('VIEW MODE: 2D BLUEPRINT PLAN INITIALIZED');
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
              triggerNotification('TOP DRAFT BLUEPRINT SYSTEM ENGAGED');
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
              {activeCell 
                ? `ACTIVE MODULAR UNIT FOUND AT SECTOR [${activeCell.wall.toUpperCase()}-${activeCell.index}]. DRAFTING DIAGNOSTIC TELEMETRY CAPTURED.`
                : 'ARCHITECTURAL PRECISION SYSTEM: SELECT A SECTOR FROM THE PERIMETER WALLS TO ACTIVATE CORE MODULES. DASHBOARD SYNC INITIATED.'
              }
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
        onClick={() => {
          // Clicking outer background clears selected cell
          if (activeCell) {
            setActiveCell(null);
            setSystemStatus('STABLE_GRID_INIT');
            triggerNotification('SECTOR ACCESS SYSTEM RETURNED TO STANDBY');
          }
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
          className={`cube-room ${isRisen ? 'is-risen' : ''}`} 
          id="cube-room"
          style={{ transform: getRoomTransform() }}
        >
          {/* FLOOR WALL */}
          {cameraMode !== 'PLAN' && (
            <div className="wall wall-bottom" id="bottom-wall">
              {renderWallCells('bottom')}
            </div>
          )}

          {/* CEILING WALL */}
          {cameraMode !== 'PLAN' && cameraMode !== 'SECTION' && (
            <div className="wall wall-top" id="top-wall">
              {renderWallCells('top')}
            </div>
          )}

          {/* LEFT WALL */}
          <div className="wall wall-left" id="left-wall">
            {renderWallCells('left')}
          </div>

          {/* RIGHT WALL */}
          <div className="wall wall-right" id="right-wall">
            {renderWallCells('right')}
          </div>

          {/* CENTRAL WIREFRAME BUILDING MASS */}
          <div className="building-container floating-mass" id="building-mass">
            {/* Level 1: Ceiling Massive Foundation */}
            <div
              className="building-level"
              style={{
                width: '240px',
                height: '240px',
                marginLeft: '-120px',
                marginTop: '-120px',
                transitionDelay: '0s',
                transform: isRisen ? 'translateZ(400px)' : 'translateZ(600px)',
                opacity: isRisen ? 1 : 0,
                borderColor: isGrayscale ? 'rgba(255, 255, 255, 0.15)' : `${activeDim.starColor}30`
              }}
            >
              <div className="level-side side-front" style={getSideStyle('240px', '80px', 'translateZ(120px)')} />
              <div className="level-side side-back" style={getSideStyle('240px', '80px', 'rotateY(180deg) translateZ(120px)')} />
              <div className="level-side side-left" style={getSideStyle('240px', '80px', 'rotateY(-90deg) translateZ(120px)')} />
              <div className="level-side side-right" style={getSideStyle('240px', '80px', 'rotateY(90deg) translateZ(120px)')} />
              <div className="level-side side-top" style={getSideStyle('240px', '240px', 'rotateX(90deg) translateZ(40px)')} />
            </div>

            {/* Level 2: Mid-Tier Layer */}
            <div
              className="building-level"
              style={{
                width: '180px',
                height: '180px',
                marginLeft: '-90px',
                marginTop: '-90px',
                transitionDelay: '0.2s',
                transform: isRisen ? 'translateZ(320px)' : 'translateZ(600px)',
                opacity: isRisen ? 1 : 0,
                borderColor: isGrayscale ? 'rgba(255, 255, 255, 0.15)' : `${activeDim.starColor}30`
              }}
            >
              <div className="level-side side-front" style={getSideStyle('180px', '100px', 'translateZ(90px)')} />
              <div className="level-side side-back" style={getSideStyle('180px', '100px', 'rotateY(180deg) translateZ(90px)')} />
              <div className="level-side side-left" style={getSideStyle('180px', '100px', 'rotateY(-90deg) translateZ(90px)')} />
              <div className="level-side side-right" style={getSideStyle('180px', '100px', 'rotateY(90deg) translateZ(90px)')} />
              <div className="level-side side-top" style={getSideStyle('180px', '180px', 'rotateX(90deg) translateZ(50px)')} />
            </div>

            {/* Level 3: Lower Core Slab */}
            <div
              className="building-level"
              style={{
                width: '120px',
                height: '120px',
                marginLeft: '-60px',
                marginTop: '-60px',
                transitionDelay: '0.4s',
                transform: isRisen ? 'translateZ(220px)' : 'translateZ(600px)',
                opacity: isRisen ? 1 : 0,
                borderColor: isGrayscale ? 'rgba(255, 255, 255, 0.15)' : `${activeDim.starColor}30`
              }}
            >
              <div className="level-side side-front" style={getSideStyle('120px', '120px', 'translateZ(60px)')} />
              <div className="level-side side-back" style={getSideStyle('120px', '120px', 'rotateY(180deg) translateZ(60px)')} />
              <div className="level-side side-left" style={getSideStyle('120px', '120px', 'rotateY(-90deg) translateZ(60px)')} />
              <div className="level-side side-right" style={getSideStyle('120px', '120px', 'rotateY(90deg) translateZ(60px)')} />
              <div className="level-side side-top" style={getSideStyle('120px', '120px', 'rotateX(90deg) translateZ(60px)')} />
            </div>

            {/* Level 4: Bottom Antenna Core */}
            <div
              className="building-level"
              style={{
                width: '60px',
                height: '60px',
                marginLeft: '-30px',
                marginTop: '-30px',
                transitionDelay: '0.6s',
                transform: isRisen ? 'translateZ(100px)' : 'translateZ(600px)',
                opacity: isRisen ? 1 : 0,
                borderColor: isGrayscale ? 'rgba(255, 255, 255, 0.15)' : `${activeDim.starColor}30`
              }}
            >
              <div className="level-side side-front" style={getSideStyle('60px', '160px', 'translateZ(30px)')} />
              <div className="level-side side-back" style={getSideStyle('60px', '160px', 'rotateY(180deg) translateZ(30px)')} />
              <div className="level-side side-left" style={getSideStyle('60px', '160px', 'rotateY(-90deg) translateZ(30px)')} />
              <div className="level-side side-right" style={getSideStyle('60px', '160px', 'rotateY(90deg) translateZ(30px)')} />
              <div className="level-side side-top" style={getSideStyle('60px', '60px', 'rotateX(90deg) translateZ(80px)')} />
            </div>
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
            {/* Interactive Dashboard Content */}
            <div className="relative z-30 p-12 flex flex-col items-center justify-center text-center w-full" id="dashboard-content">
              <div className="mb-6 transition-all duration-500" id="dash-icon-container">
                <span className="material-symbols-outlined text-6xl text-white" id="dash-icon">
                  {dashboardIcon}
                </span>
              </div>

              <h1 className="font-headline text-5xl font-black tracking-tighter mb-4 text-white uppercase" id="dash-title">
                {dashboardTitle}
              </h1>

              <div className="flex items-center gap-4 text-zinc-400 font-sans text-[10px] tracking-widest uppercase mb-12">
                <span id="dash-coord-x" className="font-mono">
                  {activeCell ? `X: 0${activeCell.index % 8}` : 'X: 02'}
                </span>
                <div className="w-1.5 h-1.5 bg-[#333333] rounded-full" />
                <span id="dash-coord-y" className="font-mono">
                  {activeCell ? `Y: 0${Math.floor(activeCell.index / 8)}` : 'Y: 04'}
                </span>
                <div className="w-1.5 h-1.5 bg-[#333333] rounded-full" />
                <span id="dash-section">
                  {dashboardSectionText}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                <div className="p-6 border border-[#333333] text-left bg-zinc-950/80 transition-all duration-300 hover:bg-zinc-900">
                  <span className="font-sans text-[9px] tracking-widest text-zinc-500 block mb-1 uppercase">SYNC_STATUS</span>
                  <span className="font-headline font-bold text-2xl text-white" id="dash-stat-1">
                    {dashboardStat1}
                  </span>
                </div>
                <div className="p-6 border border-[#333333] text-left bg-zinc-950/80 transition-all duration-300 hover:bg-zinc-900">
                  <span className="font-sans text-[9px] tracking-widest text-zinc-500 block mb-1 uppercase">ACCESS_LEVEL</span>
                  <span className="font-headline font-bold text-2xl text-white" id="dash-stat-2">
                    {dashboardStat2}
                  </span>
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
        </div>
        <div className="font-sans text-[9px] tracking-widest text-zinc-500">
          © 2026 ARCHITECT_OS / CORE_SYSTEM_REVISION_12
        </div>
      </footer>
    </div>
  );
}
