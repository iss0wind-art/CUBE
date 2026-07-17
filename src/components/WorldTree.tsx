import React, { useEffect, useState } from 'react';

// The World Tree: a 3D tree grown from REAL git data. The trunk's height
// follows total commits; each branch is a real git branch placed on a
// golden-angle spiral; clicking a branch opens a terminal at its worktree.

export interface TreeBranch {
  name: string;
  commits: number;
  lastCommit: number;
  isCurrent: boolean;
  worktreePath: string | null;
}

export interface TreeProject {
  name: string;
  path: string;
  currentBranch: string;
  branches: TreeBranch[];
}

interface WorldTreeProps {
  accentColor: string;
  risen: boolean;
  refreshNonce?: number;
  onBranchClick: (project: TreeProject, branch: TreeBranch) => void;
}

const API_URL = '/api/tree';
const FLOOR_Z = 400; // building-container local z of the floor plane
const GOLDEN_ANGLE = 137.508;

// Forest layout: where each registered project's tree stands on the floor
// (container-local x, y; local y maps to room depth, negative = rearward).
const FOREST_SPOTS: Array<[number, number]> = [
  [0, -60],
  [-230, 100],
  [230, 100],
  [-230, -240],
  [230, -240],
  [0, 260]
];

export default function WorldTree({ accentColor, risen, refreshNonce = 0, onBranchClick }: WorldTreeProps) {
  const [projects, setProjects] = useState<TreeProject[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        if (alive && Array.isArray(data.projects)) setProjects(data.projects);
      } catch {
        // tree API not up yet — the sapling will appear on the next poll
      }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [refreshNonce]);

  return (
    <>
      {projects.map((project, pIndex) => {
        const totalCommits = project.branches.reduce((sum, b) => sum + b.commits, 0);
        const trunkHeight = Math.min(340, 120 + Math.log2(totalCommits + 2) * 30);
        const count = project.branches.length;
        const [spotX, spotY] = FOREST_SPOTS[pIndex % FOREST_SPOTS.length];

        return (
          <div
            key={project.path}
            className="world-tree"
            style={{ transform: `translate3d(${spotX}px, ${spotY}px, 0)` }}
          >
            <div className={`tree-grow ${risen ? 'is-grown' : ''}`}>
            {/* Trunk: two crossed vertical ribbons */}
            {[0, 90].map((rz) => (
              <div
                key={rz}
                className="tree-anchor"
                style={{ transform: `translateZ(${FLOOR_Z}px) rotateZ(${rz}deg)` }}
              >
                <div
                  className="tree-limb trunk"
                  style={{
                    width: `${trunkHeight}px`,
                    transform: 'rotateY(90deg)',
                    background: `linear-gradient(90deg, ${accentColor}66, ${accentColor}11)`,
                    boxShadow: `0 0 12px ${accentColor}30`
                  }}
                />
              </div>
            ))}

            {/* Project name floating at the treetop (readable from above) */}
            <div
              className="tree-anchor"
              style={{ transform: `translateZ(${FLOOR_Z - trunkHeight - 26}px)` }}
            >
              <div className="tree-label project-label" style={{ color: accentColor }}>
                {project.name} · {totalCommits}
              </div>
            </div>

            {/* Branches: golden-angle spiral, length follows commit count */}
            {project.branches.map((branch, i) => {
              const height = 50 + ((trunkHeight - 70) * (i + 1)) / (count + 1);
              const azimuth = i * GOLDEN_ANGLE;
              const length = 60 + Math.min(1, branch.commits / 200) * 120;
              const pitch = 26 + (i % 3) * 9;
              const color = branch.isCurrent ? accentColor : branch.worktreePath ? '#34d399' : '#9ca3af';

              return (
                <div
                  key={branch.name}
                  className="tree-anchor"
                  style={{ transform: `translateZ(${FLOOR_Z - height}px) rotateZ(${azimuth}deg)` }}
                >
                  <div
                    className="tree-limb branch"
                    style={{
                      width: `${length}px`,
                      transform: `rotateY(${pitch}deg)`,
                      background: `linear-gradient(90deg, ${color}cc, ${color}22)`,
                      boxShadow: `0 0 8px ${color}44`
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBranchClick(project, branch);
                    }}
                    title={`${branch.name} — ${branch.commits} commits${branch.worktreePath ? ' (worktree)' : ''}\n클릭: 이 가지에서 터미널 열기`}
                  >
                    <div
                      className="limb-fin"
                      style={{ background: `linear-gradient(90deg, ${color}77, transparent)` }}
                    />
                    <div
                      className="branch-tip"
                      style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                    />
                    <span className="tree-label branch-label" style={{ color }}>
                      {branch.name}
                    </span>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        );
      })}
    </>
  );
}
