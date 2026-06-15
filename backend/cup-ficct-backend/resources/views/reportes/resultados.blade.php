<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #1e293b; }
  .header { background: #0f3460; color: white; padding: 12px 16px; margin-bottom: 12px; }
  .header h1 { font-size: 14px; font-weight: bold; }
  .header p  { font-size: 9px; margin-top: 3px; opacity: 0.85; }
  .meta { display: flex; gap: 20px; margin-bottom: 10px; padding: 0 4px; font-size: 8px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #1e3a5f; color: white; }
  thead th { padding: 6px 8px; text-align: left; font-size: 8.5px; font-weight: bold; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
  .rank { font-weight: bold; color: #0f3460; }
  .promedio { font-weight: bold; text-align: center; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 7.5px; font-weight: bold; }
  .primera     { background: #dcfce7; color: #15803d; }
  .segunda     { background: #fef9c3; color: #a16207; }
  .no_admitido { background: #fee2e2; color: #dc2626; }
  .footer { margin-top: 12px; text-align: right; font-size: 7px; color: #94a3b8; }
  .medal { color: #f59e0b; }
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
  <span>Total en ranking: <strong>{{ count($data) }}</strong></span>
</div>

@if($truncado)
<div style="background:#fef9c3;border:1px solid #ca8a04;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:8px;color:#92400e;">
  ⚠ Este PDF muestra los primeros {{ $limite }} registros de {{ $total ?? 'N/A' }}. Para el conjunto completo, use <strong>Descargar Excel</strong>.
</div>
@endif

<table>
  <thead>
    <tr>
      <th>#</th>
      <th>CI</th>
      <th>Apellidos</th>
      <th>Nombres</th>
      <th style="text-align:center">Promedio</th>
      <th>Carrera Asignada</th>
      <th>Opción</th>
    </tr>
  </thead>
  <tbody>
    @foreach($data as $fila)
    <tr>
      <td class="rank">
        @if($fila['posicion'] <= 3) 🏅 @endif{{ $fila['posicion'] }}
      </td>
      <td>{{ $fila['ci'] }}</td>
      <td><strong>{{ $fila['apellidos'] }}</strong></td>
      <td>{{ $fila['nombres'] }}</td>
      <td class="promedio">{{ $fila['promedio_general'] }}</td>
      <td>{{ $fila['carrera'] }}</td>
      <td>
        @php
          $clase = match(true) {
            str_contains($fila['opcion_asignada'], '1ra') => 'primera',
            str_contains($fila['opcion_asignada'], '2da') => 'segunda',
            default => 'no_admitido',
          };
        @endphp
        <span class="badge {{ $clase }}">{{ $fila['opcion_asignada'] }}</span>
      </td>
    </tr>
    @endforeach
  </tbody>
</table>

<div class="footer">CUP-FICCT &mdash; Universidad Autónoma Gabriel René Moreno</div>
</body>
</html>
