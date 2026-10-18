'use client';

import { useState, type KeyboardEvent } from 'react';
import {
  TOOTH_CONDITION_FILL,
  TOOTH_CONDITION_LABELS,
  type ToothCondition,
} from '@/packages/clinico/enum/Odontogram/ToothConditionEnum';
import { TOOTH_FACES, TOOTH_FACE_LABELS, type ToothFace } from '@/packages/clinico/enum/Odontogram/ToothFaceEnum';
import { odontogramFaceCondition } from '@/packages/clinico/helpers/OdontogramCondition';
import { odontogramFaceRect, odontogramNumberHitRect } from '@/packages/clinico/helpers/OdontogramReferenceFaces';
import {
  ODONTOGRAM_REFERENCE_SIZE,
  ODONTOGRAM_REFERENCE_TEETH,
} from '@/packages/clinico/helpers/OdontogramReferenceRegions';
import type { OdontogramTooth } from '@/packages/clinico/types/Odontogram/OdontogramTypes';
import { cn } from '@/shared/helpers/utils';

type OdontogramReferenceChartProps = {
  teeth: OdontogramTooth[];
  onSelect: (toothCode: string, face: ToothFace | null) => void;
};

type HoverTarget = { toothCode: string; face: ToothFace | null };

function activate(event: KeyboardEvent, run: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    run();
  }
}

function findingFill(condition: ToothCondition): string {
  if (condition === 'HEALTHY') return 'fill-transparent';
  return cn(TOOTH_CONDITION_FILL[condition], 'opacity-75');
}

function hoverHint(target: HoverTarget | null): string {
  if (!target) {
    return 'Toque (ou passe o mouse) no dente: a coroa escolhe a face; a raiz ou o número, o dente inteiro.';
  }
  if (!target.face) return `Dente ${target.toothCode} · inteiro`;
  return `Dente ${target.toothCode} · ${TOOTH_FACE_LABELS[target.face]}`;
}

export function OdontogramReferenceChart({ teeth, onSelect }: OdontogramReferenceChartProps) {
  const { width, height } = ODONTOGRAM_REFERENCE_SIZE;
  const [hover, setHover] = useState<HoverTarget | null>(null);

  return (
    <div className="grid min-w-0 gap-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full max-w-full"
        role="img"
        aria-label="Odontograma permanente"
      >
        <image href="/odontogram/reference-fdi.png" width={width} height={height} />
        {ODONTOGRAM_REFERENCE_TEETH.map((tooth) => {
          const whole = odontogramFaceCondition(teeth, tooth.code, null);
          const numberHit = odontogramNumberHitRect(tooth);
          return (
            <g
              key={tooth.code}
              className="group/tooth"
              onPointerLeave={() => setHover(null)}
            >
              <rect
                x={tooth.x}
                y={tooth.y}
                width={tooth.w}
                height={tooth.h}
                rx={3}
                className={cn(
                  'pointer-events-none fill-transparent stroke-transparent',
                  'group-hover/tooth:fill-emerald-700/20 group-hover/tooth:stroke-emerald-800/70',
                  'group-focus-within/tooth:fill-emerald-700/25 group-focus-within/tooth:stroke-emerald-800',
                )}
                strokeWidth={2.25}
              />
              <rect
                x={tooth.x}
                y={tooth.y}
                width={tooth.w}
                height={tooth.h}
                rx={3}
                className={cn('cursor-pointer outline-none', findingFill(whole))}
                tabIndex={0}
                role="button"
                aria-label={`Dente ${tooth.code} inteiro, ${TOOTH_CONDITION_LABELS[whole]}`}
                onPointerEnter={() => setHover({ toothCode: tooth.code, face: null })}
                onFocus={() => setHover({ toothCode: tooth.code, face: null })}
                onClick={() => onSelect(tooth.code, null)}
                onKeyDown={(event) => activate(event, () => onSelect(tooth.code, null))}
              />
              {TOOTH_FACES.map((face) => {
                const box = odontogramFaceRect(tooth, face);
                const condition = odontogramFaceCondition(teeth, tooth.code, face);
                return (
                  <rect
                    key={face}
                    x={box.x}
                    y={box.y}
                    width={box.w}
                    height={box.h}
                    className={cn('cursor-pointer outline-none', findingFill(condition))}
                    tabIndex={0}
                    role="button"
                    aria-label={`Dente ${tooth.code}, ${TOOTH_FACE_LABELS[face]}, ${TOOTH_CONDITION_LABELS[condition]}`}
                    onPointerEnter={() => setHover({ toothCode: tooth.code, face })}
                    onFocus={() => setHover({ toothCode: tooth.code, face })}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(tooth.code, face);
                    }}
                    onKeyDown={(event) => activate(event, () => onSelect(tooth.code, face))}
                  />
                );
              })}
              <rect
                x={numberHit.x}
                y={numberHit.y}
                width={numberHit.w}
                height={numberHit.h}
                className="cursor-pointer fill-transparent outline-none"
                tabIndex={0}
                role="button"
                aria-label={`Dente ${tooth.code} inteiro`}
                onPointerEnter={() => setHover({ toothCode: tooth.code, face: null })}
                onFocus={() => setHover({ toothCode: tooth.code, face: null })}
                onClick={() => onSelect(tooth.code, null)}
                onKeyDown={(event) => activate(event, () => onSelect(tooth.code, null))}
              />
            </g>
          );
        })}
      </svg>
      <p className="min-h-4 text-xs text-muted-foreground" aria-live="polite">
        {hoverHint(hover)}
      </p>
    </div>
  );
}
