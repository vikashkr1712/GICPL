import React from 'react';

export default function BowlingTable({ stats = [], currentBowlerId }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200">
            <th className="text-left px-3 py-2 font-semibold text-neutral-600">Bowler</th>
            <th className="text-center px-3 py-2 font-semibold text-neutral-600 w-10">O</th>
            <th className="text-center px-3 py-2 font-semibold text-neutral-600 w-8">R</th>
            <th className="text-center px-3 py-2 font-semibold text-neutral-600 w-8">W</th>
            <th className="text-center px-3 py-2 font-semibold text-neutral-600 w-14">Eco</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((b, i) => {
            const name       = b.player?.name || '—';
            const totalBalls = (b.overs || 0) * 6 + (b.balls || 0);
            const oversDisp  = b.oversDisplay || `${b.overs || 0}.${b.balls || 0}`;
            const eco        = totalBalls > 0 ? ((b.runsConceded / totalBalls) * 6).toFixed(2) : '—';
            const pid        = b.player?._id?.toString() || b.player?.toString();
            const isCurrent  = currentBowlerId && pid === currentBowlerId?.toString();
            return (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                <td className="px-3 py-2 font-medium text-neutral-800">
                  <div className="flex items-center gap-1">
                    {name}
                    {isCurrent && <span className="text-xs text-primary-600 font-bold" title="Currently bowling">*</span>}
                  </div>
                </td>
                <td className="text-center px-3 py-2 text-neutral-600">{oversDisp}</td>
                <td className="text-center px-3 py-2 text-neutral-600">{b.runsConceded || 0}</td>
                <td className="text-center px-3 py-2 font-bold text-neutral-900">{b.wickets || 0}</td>
                <td className="text-center px-3 py-2 text-neutral-600">{eco}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
