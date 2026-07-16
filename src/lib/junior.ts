// 피지수 주니어 v2.1 접속부 — 구글 드라이브(drive.ts) 대체 모듈
// 같은 함수 서명을 유지해 App.tsx에서는 임포트 경로만 바꾸면 된다.
//   저장소: 큐브 상태 JSON을 나스의 주니어 서비스(:5697)에 저장
//   가입: 버튼 한 번 = 토큰 자동 발급(localStorage 보관) — 무설정 온보딩
//   덤: juniorChat()/juniorWiki() — 카파시 위키 두뇌 (큐브 안 집사 셀용)

const JUNIOR_URL = (import.meta as any).env?.VITE_JUNIOR_URL || '';

const LS_TOKEN = 'junior21_token';
const LS_NAME = 'junior21_name';

// drive.ts와의 호환을 위한 최소 User 형태
export interface User {
  displayName: string | null;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  size?: string;
}

let cachedAccessToken: string | null = null;

async function api(path: string, opts: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (token) headers['X-Junior-Token'] = token;
  const res = await fetch(`${JUNIOR_URL}${path}`, { ...opts, headers });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Junior API ${res.status}: ${errText}`);
  }
  return res.json();
}

// 세션 복원 — 보관된 토큰이 살아 있으면 즉시 로그인 처리
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  const token = localStorage.getItem(LS_TOKEN);
  if (!token) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
  api('/junior/me', {}, token)
    .then((me) => {
      cachedAccessToken = token;
      localStorage.setItem(LS_NAME, me.name);
      if (onAuthSuccess) onAuthSuccess({ displayName: me.name }, token);
    })
    .catch(() => {
      localStorage.removeItem(LS_TOKEN);
      if (onAuthFailure) onAuthFailure();
    });
  return () => {};
};

// "로그인" = 토큰이 없으면 즉석 가입 (구글 팝업 대신 무설정 온보딩)
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  const existing = localStorage.getItem(LS_TOKEN);
  if (existing) {
    try {
      const me = await api('/junior/me', {}, existing);
      cachedAccessToken = existing;
      return { user: { displayName: me.name }, accessToken: existing };
    } catch {
      localStorage.removeItem(LS_TOKEN);
    }
  }
  const name = localStorage.getItem(LS_NAME) || '';
  const reg = await api('/junior/register', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  localStorage.setItem(LS_TOKEN, reg.token);
  localStorage.setItem(LS_NAME, reg.name);
  cachedAccessToken = reg.token;
  return { user: { displayName: reg.name }, accessToken: reg.token };
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || localStorage.getItem(LS_TOKEN);
};

export const logout = async () => {
  // 기기에서만 절단 — 서버의 우주(기억·파일)는 보존된다
  localStorage.removeItem(LS_TOKEN);
  cachedAccessToken = null;
};

export const listDriveFiles = async (accessToken: string): Promise<DriveFile[]> => {
  const data = await api('/junior/files', {}, accessToken);
  return data.files || [];
};

export const saveDriveFile = async (
  accessToken: string,
  filename: string,
  content: any
): Promise<DriveFile> => {
  const data = await api('/junior/files', {
    method: 'POST',
    body: JSON.stringify({ name: filename, content }),
  }, accessToken);
  return data.file as DriveFile;
};

export const downloadDriveFile = async (accessToken: string, fileId: string): Promise<any> => {
  return api(`/junior/files/${fileId}`, {}, accessToken);
};

export const deleteDriveFile = async (accessToken: string, fileId: string): Promise<void> => {
  await api(`/junior/files/${fileId}`, { method: 'DELETE' }, accessToken);
};

// ── 두뇌 창구 (큐브 안 집사 셀용) ─────────────────────────────────

export const juniorChat = async (
  accessToken: string,
  message: string
): Promise<{ reply: string; busy: boolean; backend: string | null }> => {
  return api('/junior/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }, accessToken);
};

export const juniorWiki = async (accessToken: string): Promise<string> => {
  const data = await api('/junior/wiki', {}, accessToken);
  return data.wiki || '';
};
