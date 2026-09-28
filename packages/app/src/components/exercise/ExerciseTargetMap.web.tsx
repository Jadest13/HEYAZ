import type { Exercise } from '../../types';
import { colors as c } from '../../styles';

// These are schematic regions, not an anatomical model or a measure of intensity.
const regions = [
  {
    match: /대흉근|가슴/,
    side: 'front',
    path: 'M46 53 Q57 47 69 52 L69 72 Q55 77 46 68Z M73 52 Q85 47 96 53 L96 68 Q86 77 73 72Z',
  },
  {
    match: /삼각근|어깨/,
    side: 'front',
    path: 'M44 51 Q31 52 30 69 L41 72 46 57Z M98 51 Q111 52 112 69 L101 72 96 57Z',
  },
  {
    match: /이두근/,
    side: 'front',
    path: 'M30 74 L40 76 36 97 25 94Z M102 76 L112 74 117 94 106 97Z',
  },
  {
    match: /복직근|복횡근|코어/,
    side: 'front',
    path: 'M54 78 L68 80 68 108 56 112Z M74 80 L88 78 86 112 74 108Z',
  },
  {
    match: /대퇴사두근|하체/,
    side: 'front',
    path: 'M49 123 L68 123 65 165 51 165Z M74 123 L93 123 91 165 77 165Z',
  },
  {
    match: /광배근|능형근|등/,
    side: 'back',
    path: 'M47 54 Q58 48 69 54 L69 103 56 110Z M73 54 Q84 48 95 54 L86 110 73 103Z',
  },
  {
    match: /삼두근|삼두/,
    side: 'back',
    path: 'M30 73 L41 75 36 99 25 95Z M101 75 L112 73 117 95 106 99Z',
  },
  {
    match: /둔근/,
    side: 'back',
    path: 'M51 112 Q60 108 69 112 L69 133 49 132Z M73 112 Q82 108 91 112 L93 132 73 133Z',
  },
  {
    match: /햄스트링/,
    side: 'back',
    path: 'M50 138 L68 138 64 168 51 166Z M74 138 L92 138 91 166 78 168Z',
  },
  {
    match: /종아리/,
    side: 'back',
    path: 'M52 175 L64 175 61 202 54 202Z M78 175 L90 175 88 202 81 202Z',
  },
];
function Body({ info, back }: { info: Exercise; back?: boolean }) {
  const targets = info.targets ?? [info.muscle];
  return (
    <g>
      <g fill="#222a32" stroke="#73818b" strokeWidth="1.3">
        <ellipse cx="71" cy="23" rx="12" ry="16" />
        <path d="M63 39 L62 46 Q41 47 33 53 L20 104 15 122 Q15 129 20 128 L28 115 38 87 45 75 51 112 46 130 48 168 50 205 46 215 Q48 221 63 217 L65 176 71 143 77 176 79 217 Q94 221 96 215 L92 205 94 168 96 130 91 112 97 75 104 87 114 115 122 128 Q127 129 127 122 L122 104 109 53 Q101 47 80 46 L79 39" />
      </g>
      {regions
        .filter((region) => region.side === (back ? 'back' : 'front'))
        .map((region) => {
          const index = targets.findIndex((target) => region.match.test(target));
          return (
            <path
              key={region.path}
              d={region.path}
              fill={index === 0 ? c.accent : index > 0 ? '#ffc6ad' : '#303a44'}
              stroke="#151d25"
              strokeWidth="1"
            />
          );
        })}
      <path
        d={back ? 'M71 49V107' : 'M71 52V112 M55 90H87 M56 101H86'}
        stroke="#151d25"
        fill="none"
      />
      <text x="71" y="240" textAnchor="middle" fill={c.muted} fontSize="11">
        {back ? '뒤' : '앞'}
      </text>
    </g>
  );
}

export function ExerciseTargetMap({ info }: { info: Exercise }) {
  return (
    <svg
      viewBox="0 0 304 250"
      role="img"
      aria-label={`${info.name} 자극 부위 개략도: ${(info.targets ?? [info.muscle]).join(', ')}`}
      style={{ width: '100%', height: 216, display: 'block' }}
    >
      <Body info={info} />
      <g transform="translate(162 0)">
        <Body info={info} back />
      </g>
    </svg>
  );
}

export function BenchIllustration() {
  return (
    <svg
      viewBox="0 0 280 250"
      role="img"
      aria-label="벤치에 누워 바벨을 들어 올리는 동작 개략도"
      style={{ width: '100%', height: 216, display: 'block' }}
    >
      <g fill="none" stroke="#64727c" strokeWidth="4" strokeLinejoin="round">
        <path d="M54 48V216 M201 48V216 M38 216H73 M185 216H216 M54 75H64 M190 75H201" />
        <path d="M64 167H192V176H64Z M79 176V216 M181 176V216 M63 216H94 M166 216H197" />
      </g>
      <g stroke="#b2bdc5" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M99 147L170 152 204 176 217 213 237 216" />
        <path d="M165 154L172 183 170 218 187 221" stroke="#7c8b98" />
        <path d="M105 139L124 114 127 73 M155 141L163 111 163 73" />
      </g>
      <circle cx="83" cy="140" r="13" fill="#b2bdc5" />
      <path d="M100 136Q118 129 142 139L148 155 100 154Z" fill={c.accent} stroke="#d6e0e5" />
      <path d="M146 140L170 145 177 160 149 158Z" fill="#29353e" stroke="#b2bdc5" />
      <path d="M38 70H226" stroke="#d9e2e8" strokeWidth="4" />
      <g fill="#28343d" stroke="#abb9c3" strokeWidth="2">
        <rect x="48" y="47" width="10" height="46" rx="4" />
        <rect x="61" y="51" width="7" height="38" rx="3" />
        <rect x="201" y="47" width="10" height="46" rx="4" />
        <rect x="191" y="51" width="7" height="38" rx="3" />
      </g>
      <path d="M29 223H250" stroke="#303c45" />
      <text x="140" y="242" textAnchor="middle" fill={c.muted} fontSize="10">
        동작 개략도
      </text>
    </svg>
  );
}
