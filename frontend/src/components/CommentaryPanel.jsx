import React from 'react';

/**
 * Ball circle colors (CricHeroes style)
 * 0 = gray dot, 1/2/3 = white, 4 = blue, 6 = green, W = red, Wd = yellow, NB = orange
 */
function BallCircle({ ball }) {
  let bg = 'bg-neutral-200 text-neutral-600';
  let label = '0';

  if (!ball) return null;

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
    bg = 'bg-neutral-300 text-neutral-600';
    label = '0';
  }

  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs ${bg} shrink-0`}>
      {label}
    </span>
  );
}

export default function CommentaryPanel({ balls = [] }) {
  if (balls.length === 0) return null;

  // Group balls by over
  const byOver = {};
  [...balls].reverse().forEach(ball => {
    const key = ball.over;
    if (!byOver[key]) byOver[key] = [];
    byOver[key].push(ball);
  });

  const overKeys = Object.keys(byOver).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="card">
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Ball-by-ball Commentary</p>
      <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
        {overKeys.map(overNum => {
          const overBalls = [...byOver[overNum]].sort((a, b) => b.ballNumber - a.ballNumber);
          return (
            <div key={overNum}>
              {/* Over header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-neutral-800 text-white text-xs font-bold px-2 py-0.5 rounded">
                  Over {parseInt(overNum) + 1}
                </span>
                <div className="flex gap-1 flex-wrap">
                  {[...overBalls].reverse().map((b, i) => <BallCircle key={i} ball={b} />)}
                </div>
              </div>
              {/* Ball commentary lines */}
              {overBalls.map((ball, i) => (
                <div key={i} className="flex items-start gap-3 py-1.5 border-b border-neutral-50 last:border-0">
                  <div className="flex flex-col items-center shrink-0 w-10 text-xs text-neutral-400 font-mono pt-0.5">
                    {parseInt(overNum) + 1}.{ball.ballNumber}
                  </div>
                  <BallCircle ball={ball} />
                  <p className="text-sm text-neutral-700 leading-relaxed flex-1">
                    {ball.commentary || `${ball.bowler?.name || 'Bowler'} to ${ball.batsman?.name || 'Batsman'}`}
                  </p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
