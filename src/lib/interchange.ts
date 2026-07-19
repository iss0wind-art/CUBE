// CUBE 공용 왕복 형식 변환기 (Interchange Format v1) — 3D(Architect OS) 쪽
// 규격서 원본: 나스 2D 레포 docs/CUBE_INTERCHANGE_FORMAT_v1.md
// 봉투(envelope): 공용 코어(acts·molecules·atoms·links) + 전용 ext.architect3d / ext.orca2d
// 무손실 철칙: 내가 모르는 것(2D 로직 코어 + ext.orca2d)은 절대 건드리지 않고 그대로 보존한다.
//   → 오토캐드 ↔ 스케치업처럼 한 파일로 왕복해도 아무것도 잃지 않는다.

export const FORMAT = 'orca-cube';
export const FORMAT_VERSION = 1;

// 3D가 소유하는 공간 상태 (기존 Architect_OS_Schematic)
export interface Architect3D {
  appIdentifier: string;
  timestamp?: number;
  saveName?: string;
  currentDimIndex?: number;
  cameraMode?: string;
  currentZoom?: number;
  isRisen?: boolean;
  isGrayscale?: boolean;
  perspectiveRx?: number;
  perspectiveRy?: number;
  systemStatus?: string;
  links?: any[];
  [k: string]: any;
}

// 3D가 이해하지 못해 "보존만" 하는 것 (2D 로직층 + 미지 채널)
export interface Preserved {
  id?: string;
  name?: string;
  acts: any[];
  molecules: Record<string, any>;
  atoms: Record<string, any>;
  links: any[];                    // 공용 코어 링크 (2D 로직 연결)
  extOrca2d: any | null;           // ext.orca2d 통째
  extOther: Record<string, any>;   // 그 밖의 미지 ext 채널
}

export function emptyPreserved(): Preserved {
  return { acts: [], molecules: {}, atoms: {}, links: [], extOrca2d: null, extOther: {} };
}

const clone = (v: any): any => (v == null ? v : JSON.parse(JSON.stringify(v)));

// 3D 공간상태 + 보존분 → 공용 봉투 형식
export function toInterchange(arch: Architect3D, name: string, preserved?: Preserved): any {
  const pv = preserved || emptyPreserved();
  const ext: Record<string, any> = { architect3d: clone(arch) };
  if (pv.extOrca2d) ext.orca2d = clone(pv.extOrca2d);     // 2D 로직층 그대로 되돌려 놓기
  for (const [k, v] of Object.entries(pv.extOther || {})) {
    if (k !== 'architect3d' && k !== 'orca2d') ext[k] = clone(v);
  }
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    id: pv.id,
    name: name || pv.name || 'CUBE 프로젝트',
    savedAt: new Date().toISOString(),
    acts: clone(pv.acts || []),         // 공용 코어는 손대지 않고 통과
    molecules: clone(pv.molecules || {}),
    atoms: clone(pv.atoms || {}),
    links: clone(pv.links || []),
    ext,
  };
}

// 공용 봉투(또는 구형 순정 3D 파일) → { 3D가 쓸 공간상태, 보존할 나머지 }
export function fromInterchange(file: any): { arch: Architect3D | null; preserved: Preserved } {
  const obj = typeof file === 'string' ? JSON.parse(file) : file;

  // 구형 순정 3D 파일 하위호환
  if (obj && obj.format !== FORMAT && obj.appIdentifier === 'Architect_OS_Schematic') {
    return { arch: obj as Architect3D, preserved: emptyPreserved() };
  }
  if (!obj || obj.format !== FORMAT) {
    return { arch: null, preserved: emptyPreserved() };
  }

  const ext = obj.ext || {};
  const extOther: Record<string, any> = {};
  for (const [k, v] of Object.entries(ext)) {
    if (k !== 'architect3d' && k !== 'orca2d') extOther[k] = clone(v);
  }
  const preserved: Preserved = {
    id: obj.id,
    name: obj.name,
    acts: clone(obj.acts || []),
    molecules: clone(obj.molecules || {}),
    atoms: clone(obj.atoms || {}),
    links: clone(obj.links || []),
    extOrca2d: ext.orca2d ? clone(ext.orca2d) : null,
    extOther,
  };
  const arch: Architect3D | null = ext.architect3d ? clone(ext.architect3d) : null;
  return { arch, preserved };
}
