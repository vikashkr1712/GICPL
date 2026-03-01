import React from 'react';

export default function ScoreBoard({ innings, matchStatus, requiredRate, targetRuns }) {
  if (!innings) return null;
  const { battingTeam, totalRuns, totalWickets, overs, balls, oversDisplay, runRate,
          striker, nonStriker, currentBowler, partnershipRuns, partnershipBalls } = innings;

  const teamName  = typeof battingTeam === 'object' ? battingTeam?.name : 'Batting Team';
  const display   = oversDisplay || `${overs}.${balls}`;
  const crr       = runRate || (totalRuns > 0 && (overs > 0 || balls > 0)
    ? ((totalRuns / (overs + balls / 6)) || 0).toFixed(2)
    : '0.00');

  // 2nd innings chase info
  const target2   = targetRuns !== undefined ? targetRuns + 1 : null;
  const runsNeeded= target2 !== null ? Math.max(0, target2 - totalRuns) : null;
  const pship     = partnershipRuns !== undefined && partnershipBalls !== undefined;

  return (
    <div className="card">
      {/* Innings label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          {innings.inningsNumber === 1 ? '1st Innings' : '2nd Innings'}
        </span>
        {matchStatus === 'live' && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />LIVE
          </span>
        )}
      </div>

      {/* Score */}
      <div className="flex items-end gap-4 mb-2">
        <div>
          <p className="text-neutral-500 font-medium text-xs mb-0.5 uppercase tracking-wide">{teamName}</p>
          <p className="text-5xl font-black text-neutral-900 leading-none">
            {totalRuns}
            <span className="text-2xl text-neutral-400 font-normal">/{totalWickets}</span>
          </p>
        </div>
        <div className="text-right ml-auto">
          <p className="text-xl font-bold text-neutral-700">{display} Ov</p>
          <p className="text-sm text-neutral-500 font-medium">CRR: <span className="text-neutral-700">{crr}</span></p>
        </div>
      </div>

      {/* Target / RRR (2nd innings) */}
      {target2 !== null && innings.inningsNumber === 2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-neutral-600">
              Target <strong className="text-neutral-900">{target2}</strong>
              {' · '}Need <strong className="text-primary-700">{runsNeeded}</strong> runs
            </span>
            {requiredRate && (
              <span className="font-semibold text-amber-700 ml-2">RRR: {requiredRate}</span>
            )}
          </div>
        </div>
      )}

      {/* Current batters */}
      {(striker || nonStriker) && (
        <div className="flex gap-4 flex-wrap mt-1 pt-2 border-t border-neutral-100">
          {striker?.name && (
            <div className="text-xs">
              <span className="text-neutral-500">Striker </span>
              <span className="font-semibold text-neutral-800">{striker.name}</span>
              <span className="ml-1 text-primary-600 font-bold">*</span>
            </div>
          )}
          {nonStriker?.name && (
            <div className="text-xs">
              <span className="text-neutral-500">Non-striker </span>
              <span className="font-semibold text-neutral-800">{nonStriker.name}</span>
            </div>
          )}
          {currentBowler?.name && (
            <div className="text-xs ml-auto">
              <span className="text-neutral-500">Bowler </span>
              <span className="font-semibold text-neutral-800">{currentBowler.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Partnership */}
      {pship && (partnershipRuns > 0 || partnershipBalls > 0) && (
        <div className="mt-1 pt-1.5 border-t border-neutral-100">
          <p className="text-xs text-neutral-500">
            Partnership: <span className="font-semibold text-neutral-700">{partnershipRuns} ({partnershipBalls} balls)</span>
          </p>
        </div>
      )}
    </div>
  );
}
