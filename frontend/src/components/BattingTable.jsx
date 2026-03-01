import React from 'react';

export default function BattingTable({ stats = [], extras, total, strikerId, nonStrikerId }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200">
            <th className="text-left px-3 py-2 font-semibold text-neutral-600">Batter</th>
            <th className="text-center px-3 py-2 font-semibold text-neutral-600 w-8">R</th>
            <th className="text-center px-3 py-2 font-semibold text-neutral-600 w-8">B</th>
            <th className="text-center px-3 py-2 font-semibold text-neutral-600 w-8">4s</th>
            <th className="text-center px-3 py-2 font-semibold text-neutral-600 w-8">6s</th>
            <th className="text-center px-3 py-2 font-semibold text-neutral-600 w-14">SR</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((b, i) => {
            const name        = b.player?.name || '—';
            const ballsPlayed = b.balls ?? b.ballsFaced ?? 0;
            const sr          = ballsPlayed > 0 ? ((b.runs / ballsPlayed) * 100).toFixed(1) : '—';
            const pid         = b.player?._id?.toString() || b.player?.toString();
            const isStriker   = strikerId && pid === strikerId?.toString();
            const isNonStriker= nonStrikerId && pid === nonStrikerId?.toString();
            return (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-neutral-800">{name}</span>
                    {isStriker    && <span className="text-xs text-primary-600 font-bold" title="On strike">*</span>}
                    {isNonStriker && <span className="text-xs text-neutral-400" title="Non-striker">†</span>}
                  </div>
                  {b.isOut ? (
                    <p className="text-xs text-neutral-400 capitalize">{b.dismissal || 'out'}</p>
                  ) : (pid === strikerId?.toString() || pid === nonStrikerId?.toString()) ? (
                    <p className="text-xs text-green-600 font-medium">batting</p>
                  ) : !b.isOut && b.balls === 0 && b.runs === 0 ? null : (
                    <p className="text-xs text-neutral-400">not out</p>
                  )}
                </td>
                <td className="text-center px-3 py-2 font-bold text-neutral-900">{b.runs}</td>
                <td className="text-center px-3 py-2 text-neutral-600">{ballsPlayed}</td>
                <td className="text-center px-3 py-2 text-neutral-600">{b.fours || 0}</td>
                <td className="text-center px-3 py-2 text-neutral-600">{b.sixes || 0}</td>
                <td className="text-center px-3 py-2 text-neutral-600">{sr}</td>
              </tr>
            );
          })}
        </tbody>
        {(extras !== undefined || total) && (
          <tfoot>
            {extras !== undefined && (
              <tr className="border-t border-neutral-200">
                <td className="px-3 py-2 text-neutral-500 text-xs font-medium">Extras</td>
                <td colSpan={5} className="px-3 py-2 text-neutral-600 text-xs">
                  {typeof extras === 'object'
                    ? `${extras.total || 0} (w ${extras.wides || 0}, nb ${extras.noBalls || 0}, b ${extras.byes || 0}, lb ${extras.legByes || 0})`
                    : extras}
                </td>
              </tr>
            )}
            {total && (
              <tr className="bg-neutral-100">
                <td className="px-3 py-2 font-bold text-neutral-800">Total</td>
                <td colSpan={5} className="px-3 py-2 font-bold text-neutral-800">{total}</td>
              </tr>
            )}
          </tfoot>
        )}
      </table>
    </div>
  );
}
