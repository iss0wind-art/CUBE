// World Tree API: reads real git data (branches, worktrees, commit counts)
// for the registered project roots. Runs as its own process so the PTY
// server (and the user's live terminal sessions) never restart with it.
import express from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const run = promisify(execFile);
const PORT = Number(process.env.CUBE_TREE_PORT || 3002);
const PROJECT_ROOTS = (process.env.CUBE_PROJECTS || 'D:/Git/CUBE').split(';').filter(Boolean);

const app = express();
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

const git = async (root: string, args: string[]): Promise<string> =>
  (await run('git', ['-C', root, ...args])).stdout.trim();

app.get('/api/tree', async (_req, res) => {
  try {
    const projects = [];
    for (const root of PROJECT_ROOTS) {
      const current = await git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);

      const wtRaw = await git(root, ['worktree', 'list', '--porcelain']);
      const worktrees: Record<string, string> = {};
      let wtPath = '';
      for (const line of wtRaw.split('\n')) {
        if (line.startsWith('worktree ')) wtPath = line.slice('worktree '.length).trim();
        if (line.startsWith('branch refs/heads/')) {
          worktrees[line.slice('branch refs/heads/'.length).trim()] = wtPath;
        }
      }

      const refRaw = await git(root, [
        'for-each-ref',
        'refs/heads',
        '--format=%(refname:short)|%(committerdate:unix)'
      ]);
      const branches = [];
      for (const line of refRaw.split('\n').filter(Boolean)) {
        const [name, ts] = line.split('|');
        let commits = 0;
        try {
          commits = Number(await git(root, ['rev-list', '--count', name]));
        } catch {
          commits = 0;
        }
        branches.push({
          name,
          commits,
          lastCommit: Number(ts),
          isCurrent: name === current,
          worktreePath: worktrees[name] || null
        });
      }

      projects.push({ name: path.basename(root), path: root, currentBranch: current, branches });
    }
    res.json({ projects });
  } catch (err) {
    console.error('[cube-tree] error:', err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`[cube-tree] world-tree API on http://localhost:${PORT} (roots: ${PROJECT_ROOTS.join(', ')})`);
});
