<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #1e293b; }
  .header { background: #0f3460; color: white; padding: 12px 16px; margin-bottom: 12px; }
  .header h1 { font-size: 14px; font-weight: bold; }
  .header p { font-size: 9px; margin-top: 3px; opacity: 0.85; }
  .meta { display: flex; gap: 20px; margin-bottom: 10px; padding: 0 4px; font-size: 8px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #1e3a5f; color: white; }
  thead th { padding: 6px 8px; text-align: left; font-size: 8.5px; font-weight: bold; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody tr:hover { background: #eff6ff; }
  tbody td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 7.5px; font-weight: bold; }
  .confirmado  { background: #dbeafe; color: #1d4ed8; }
  .aprobado    { background: #dcfce7; color: #15803d; }
  .reprobado   { background: #fee2e2; color: #dc2626; }
  .admitido    { background: #d1fae5; color: #065f46; }
  .no_admitido { background: #fee2e2; color: #991b1b; }
  .footer { margin-top: 12px; text-align: right; font-size: 7px; color: #94a3b8; }
</style>
</head>
<body>

<div class="header">
  <h1>{{ $titulo }}</h1>
  <p>Gestión: {{ $gestion->codigo }} &nbsp;|&nbsp; Generado: {{ now()->format('d/m/Y H:i') }}
    @if(count($filtros)) &nbsp;|&nbsp; Filtros: {{ implode(', ', $filtros) }} @endif
  </p>
</div>

<div class="meta">
  <span>Total registros: <strong>{{ count($data) }}</strong></span>
  <span>Período: {{ $gestion->fecha_inicio?->format('d/m/Y') }} – {{ $gestion->fecha_fin?->format('d/m/Y') ?? 'En curso' }}</span>
</div>

<table>
  <thead>
    <tr>
      <th>#</th>
      <th>CI</th>
      <th>Apellidos</th>
      <th>Nombres</th>
      <th>Estado</th>
      <th>1ra Opción</th>
      <th>2da Opción</th>
      <th>Ciudad</th>
    </tr>
  </thead>
  <tbody>
    @foreach($data as $i => $fila)
    <tr>
      <td>{{ $i + 1 }}</td>
      <td>{{ $fila['ci'] }}</td>
      <td><strong>{{ $fila['apellidos'] }}</strong></td>
      <td>{{ $fila['nombres'] }}</td>
      <td><span class="badge {{ $fila['estado'] }}">{{ ucfirst(str_replace('_', ' ', $fila['estado'])) }}</span></td>
      <td>{{ $fila['carrera_1ra'] }}</td>
      <td>{{ $fila['carrera_2da'] }}</td>
      <td>{{ $fila['ciudad'] }}</td>
    </tr>
    @endforeach
  </tbody>
</table>

<div class="footer">CUP-FICCT &mdash; Universidad Autónoma Gabriel René Moreno</div>
</body>
</html>
