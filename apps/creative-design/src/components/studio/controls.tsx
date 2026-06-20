import React from 'react';

const ACCENT = '#FFB800';

export const panelField =
  'w-full bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5 text-sm '
  + 'text-white focus:border-[#FFB800] outline-none';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      {children}
    </label>
  );
}

export function NumberField({
  label, value, onChange, min, max, step = 1,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        className={panelField}
        value={Math.round(value * 100) / 100}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

export function Slider({
  label, value, min, max, step, suffix = '', onChange,
}: {
  label: string; value: number; min: number; max: number;
  step: number; suffix?: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-white/40 mb-1">
        <span>{label}</span>
        <span className="text-white/70 normal-case tracking-normal">{value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#FFB800]"
      />
    </div>
  );
}

export function ColorField({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value?.startsWith('#') ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded bg-transparent border border-white/10 cursor-pointer shrink-0"
        />
        <input
          className={panelField}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
  );
}

export function Segmented<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: React.ReactNode; title?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 bg-white/5 rounded-md p-1">
      {options.map((o) => (
        <button
          key={o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={`flex-1 text-xs py-1.5 rounded transition ${
            value === o.value
              ? 'bg-[#FFB800] text-black font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ToggleChip({
  active, onClick, children, title,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; title?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded text-xs font-bold transition border ${
        active
          ? 'bg-[#FFB800] text-black border-[#FFB800]'
          : 'text-white/60 border-white/10 hover:border-white/30'
      }`}
    >
      {children}
    </button>
  );
}

export const accentColor = ACCENT;
