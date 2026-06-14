<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 7.5px; color: #1e293b; }
  .header { background: #0f3460; color: white; padding: 10px 14px; margin-bottom: 10px; }
  .header h1 { font-size: 13px; font-weight: bold; }
  .header p  { font-size: 8px; margin-top: 3px; opacity: 0.85; }
  .meta { margin-bottom: 8px; padding: 0 4px; font-size: 7.5px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; }
  thead tr.main { background: #1e3a5f; color: white; }
  thead tr.sub  { background: #334155; color: #e2e8f0; }
  thead th { padding: 5px 5px; text-align: center; font-size: 7.5px; font-weight: bold; border: 1px solid #475569; }
  thead th.left { text-align: left; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody td { padding: 4px 5px; border: 1px solid #e2e8f0; text-align: center; font-size: 7.5px; }
  tbody td.left { text-align: left; }
  .aprobado { color: #15803d; font-weight: bold; }
  .reprobado { color: #dc2626; font-weight: bold; }
  .prom { font-weight: bold; background: #f0fdf4; }
  .prom-rep { font-weight: bold; background: #fef2f2; color: #dc2626; }
  .gen { font-weight: bold; background: #eff6ff; }
  /* Colores de cabecera por materia */
  .comp { background: #0e7490; }
  .mat  { background: #b45309; }
  .ing  { background: #065f46; }
  .fis  { background: #6b21a8; }
  .footer { margin-top: 10px; text-align: right; font-size: 6.5px; color: #94a3b8; }
</style>
</head>
<body>

<div class="header">
  <h1>{{ $titulo }}</h1>
  <p>Gestión: {{ $gestion->codigo }} &nbsp;|&nbsp; Generado: {{ now()->format('d/m/Y H:i') }}
    @if(count($filtros)) &nbsp;|&nbsp; Filtros: {{ implode(', ', $filtros) }} @endif
  </p>
</div>

<div class="meta">Total registros: <strong>{{ count($data) }}</strong> &nbsp;|&nbsp;
  Fórmula: Examen 1 (30%) + Examen 2 (30%) + Examen 3 (40%) | Mínimo aprobatorio: 60 pts
</div>

<table>
  <thead>
    <tr class="main">
      <th class="left" rowspan="2">#</th>
      <th class="left" rowspan="2">CI</th>
      <th class="left" rowspan="2">Apellidos y Nombres</th>
      <th rowspan="2">Estado</th>
      <th colspan="4" class="comp">Computación</th>
      <th colspan="4" class="mat">Matemáticas</th>
      <th colspan="4" class="ing">Inglés</th>
      <th colspan="4" class="fis">Física</th>
      <th rowspan="2">Prom. Gral</th>
    </tr>
    <tr class="sub">
      <th>Ex1</th><th>Ex2</th><th>Ex3</th><th>Prom</th>
      <th>Ex1</th><th>Ex2</th><th>Ex3</th><th>Prom</th>
      <th>Ex1</th><th>Ex2</th><th>Ex3</th><th>Prom</th>
      <th>Ex1</th><th>Ex2</th><th>Ex3</th><th>Prom</th>
    </tr>
  </thead>
  <tbody>
    @foreach($data as $i => $f)
    @php
      $compProm = $f['COMP_prom'] ?? '—';
      $matProm  = $f['MAT_prom']  ?? '—';
      $ingProm  = $f['ING_prom']  ?? '—';
      $fisProm  = $f['FIS_prom']  ?? '—';
    @endphp
    <tr>
      <td class="left">{{ $i + 1 }}</td>
      <td class="left">{{ $f['ci'] }}</td>
      <td class="left"><strong>{{ $f['apellidos'] }}</strong>, {{ $f['nombres'] }}</td>
      <td>{{ ucfirst(str_replace('_',' ',$f['estado'])) }}</td>
      {{-- COMP --}}
      <td>{{ $f['COMP_ex1'] ?? '—' }}</td>
      <td>{{ $f['COMP_ex2'] ?? '—' }}</td>
      <td>{{ $f['COMP_ex3'] ?? '—' }}</td>
      <td class="{{ $compProm !== '—' && (float)$compProm >= 60 ? 'prom' : 'prom-rep' }}">{{ $compProm }}</td>
      {{-- MAT --}}
      <td>{{ $f['MAT_ex1'] ?? '—' }}</td>
      <td>{{ $f['MAT_ex2'] ?? '—' }}</td>
      <td>{{ $f['MAT_ex3'] ?? '—' }}</td>
      <td class="{{ $matProm !== '—' && (float)$matProm >= 60 ? 'prom' : 'prom-rep' }}">{{ $matProm }}</td>
      {{-- ING --}}
      <td>{{ $f['ING_ex1'] ?? '—' }}</td>
      <td>{{ $f['ING_ex2'] ?? '—' }}</td>
      <td>{{ $f['ING_ex3'] ?? '—' }}</td>
      <td class="{{ $ingProm !== '—' && (float)$ingProm >= 60 ? 'prom' : 'prom-rep' }}">{{ $ingProm }}</td>
      {{-- FIS --}}
      <td>{{ $f['FIS_ex1'] ?? '—' }}</td>
      <td>{{ $f['FIS_ex2'] ?? '—' }}</td>
      <td>{{ $f['FIS_ex3'] ?? '—' }}</td>
      <td class="{{ $fisProm !== '—' && (float)$fisProm >= 60 ? 'prom' : 'prom-rep' }}">{{ $fisProm }}</td>
      {{-- Promedio general --}}
      <td class="gen">{{ $f['promedio_general'] }}</td>
    </tr>
    @endforeach
  </tbody>
</table>

<div class="footer">CUP-FICCT &mdash; Universidad Autónoma Gabriel René Moreno</div>
</body>
</html>
