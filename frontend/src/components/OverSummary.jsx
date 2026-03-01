import React from 'react';

/**
 * Ball circle for current over — CricHeroes-style colored circles.
 */
function BallPip({ ball }) {
  let bg = 'bg-neutral-200 text-neutral-600';
  let label = '·';

  if (ball.wicket) {
    bg = 'bg-red-500 text-white font-bold';
    label = 'W';
  } else if (ball.extraType === 'wide') {
    bg = 'bg-yellow-400 text-yellow-900 font-bold';
    label = 'Wd';
  } else if (ball.extraType === 'no-ball') {
    bg = 'bg-orange-400 text-white font-bold';
    label = 'NB';
  } else if (ball.runs === 4) {
    bg = 'bg-blue-500 text-white font-bold';
    label = '4';
  } else if (ball.runs === 6) {
    bg = 'bg-green-500 text-white font-bold';
    label = '6';
  } else if (ball.runs > 0) {
    bg = 'bg-white border border-neutral-300 text-neutral-700 font-semibold';
    label = String(ball.runs);
  } else {
    bg = 'bg-neutral-300 text-neutral-500';
    label = '0';
  }

  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs ${bg}`}>
      {label}
    </span>
  );
}

/**
 * Shows "This Over" with the current over's balls and run total.
 */
export default function OverSummary({ balls = [], currentOvers = 0, currentBalls = 0, bowlerName }) {
  // Get the current (last) over's balls
  const lastOverNum = currentBalls === 0 ? currentOvers - 1 : currentOvers;
  const thisOverBalls = balls
    .filter(b => b.over === lastOverNum)
    .sort((a, b) => a.ballNumber - b.ballNumber);

  const oversRun = thisOverBalls.reduce((sum, b) => sum + b.runs + (b.extraRuns || 0), 0);

  // Show placeholder pips if no balls in over yet
  const pips = [...thisOverBalls];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">This Over</p>
        {bowlerName && (
          <p className="text-xs text-neutral-500">
            <span className="font-semibold text-neutral-700">{bowlerName}</span>
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {pips.length === 0 ? (
          <span className="text-neutral-400 text-sm">Over not started yet</span>
        ) : (
          pips.map((b, i) => <BallPip key={i} ball={b} />)
        )}
        {/* Show runs scored this over */}
        {pips.length > 0 && (
          <span className="ml-auto text-sm font-semibold text-neutral-600">{oversRun} runs</span>
        )}
      </div>
    </div>
  );
}
