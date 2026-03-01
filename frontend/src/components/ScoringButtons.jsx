import React, { useState } from 'react';

const BTN = ({ label, onClick, color = 'bg-white border-neutral-200 text-neutral-800', disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`score-btn ${color} disabled:opacity-40 disabled:cursor-not-allowed`}
  >
    {label}
  </button>
);

/* Mini modal shown as an overlay chip in-card */
function ExtraRunPicker({ title, runOptions, onSelect, onCancel }) {
  return (
    <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-4 space-y-3">
      <p className="text-sm font-bold text-neutral-700">{title}</p>
      <p className="text-xs text-neutral-500">How many runs scored?</p>
      <div className="flex flex-wrap justify-center gap-2">
        {runOptions.map(r => (
          <button
            key={r}
            onClick={() => onSelect(r)}
            className="w-12 h-12 rounded-full border-2 border-primary-400 bg-primary-50 text-primary-700 font-bold text-sm hover:bg-primary-100 transition"
          >
            {r}
          </button>
        ))}
      </div>
      <button onClick={onCancel} className="text-xs text-neutral-400 hover:text-neutral-600 underline">Cancel</button>
    </div>
  );
}

export default function ScoringButtons({ onScore, onUndo, disabled }) {
  const [picker, setPicker] = useState(null); // { type, title, options }

  const closePicker = () => setPicker(null);

  const handlePick = (runs) => {
    const p = picker;
    closePicker();
    switch (p.type) {
      case 'wide':   onScore({ type: 'wide',   runs }); break;
      case 'noBall': onScore({ type: 'noBall', runs }); break;
      case 'bye':    onScore({ type: 'bye',    runs }); break;
      case 'legBye': onScore({ type: 'legBye', runs }); break;
    }
  };

  const runs = [0, 1, 2, 3, 4, 6];

  return (
    <div className="card space-y-3 relative overflow-hidden">
      {/* Extra run picker overlay */}
      {picker && (
        <ExtraRunPicker
          title={picker.title}
          runOptions={picker.options}
          onSelect={handlePick}
          onCancel={closePicker}
        />
      )}

      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Runs</p>
      <div className="grid grid-cols-3 gap-2">
        {runs.map(r => (
          <BTN
            key={r}
            label={r === 4 ? '4 ◆' : r === 6 ? '6 ◆' : r === 0 ? '· Dot' : String(r)}
            onClick={() => onScore({ type: 'run', runs: r })}
            disabled={disabled}
            color={
              r === 4 ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
            : r === 6 ? 'bg-green-50 border-green-300 text-green-700 font-bold'
            : r === 0 ? 'bg-neutral-100 border-neutral-300 text-neutral-500'
            : 'bg-white border-neutral-200 text-neutral-800'
            }
          />
        ))}
      </div>

      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider pt-1">Extras &amp; Events</p>
      <div className="grid grid-cols-3 gap-2">
        {/* Wide → ask runs */}
        <BTN
          label="Wide"
          onClick={() => setPicker({ type: 'wide', title: 'Wide Ball', options: [0, 1, 2, 4] })}
          disabled={disabled}
          color="bg-yellow-50 border-yellow-300 text-yellow-800 font-semibold"
        />
        {/* No Ball → ask runs off bat */}
        <BTN
          label="No Ball"
          onClick={() => setPicker({ type: 'noBall', title: 'No Ball — Runs off bat', options: [0, 1, 2, 4, 6] })}
          disabled={disabled}
          color="bg-orange-50 border-orange-300 text-orange-800 font-semibold"
        />
        {/* Wicket — handled by parent */}
        <BTN
          label={<><span className="text-base">⚡</span> Wicket</>}
          onClick={() => onScore({ type: 'wicket' })}
          disabled={disabled}
          color="bg-red-50 border-red-400 text-red-700 font-bold text-lg"
        />
        {/* Bye → ask runs */}
        <BTN
          label="Bye"
          onClick={() => setPicker({ type: 'bye', title: 'Bye — Runs', options: [1, 2, 3, 4] })}
          disabled={disabled}
          color="bg-neutral-50 border-neutral-300 text-neutral-600"
        />
        {/* Leg Bye → ask runs */}
        <BTN
          label="Leg Bye"
          onClick={() => setPicker({ type: 'legBye', title: 'Leg Bye — Runs', options: [1, 2, 3, 4] })}
          disabled={disabled}
          color="bg-neutral-50 border-neutral-300 text-neutral-600"
        />
      </div>

      <div className="pt-1 border-t border-neutral-100">
        <button
          onClick={onUndo}
          disabled={disabled}
          className="w-full py-2 rounded-lg border-2 border-dashed border-neutral-300 text-neutral-500 hover:border-red-400 hover:text-red-600 transition text-sm font-medium disabled:opacity-40"
        >
          ↩ Undo Last Ball
        </button>
      </div>
    </div>
  );
}
