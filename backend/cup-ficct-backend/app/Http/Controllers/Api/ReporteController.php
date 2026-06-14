<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Carrera;
use App\Models\CupoAsignado;
use App\Models\Examen;
use App\Models\Gestion;
use App\Models\Materia;
use App\Models\Nota;
use App\Models\Postulante;
use App\Services\AuditService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\ReportePostulantesExport;
use App\Exports\ReporteResultadosExport;
use App\Exports\ReporteNotasExport;

/**
 * Generación de reportes estáticos y dinámicos (UC-18 PDF, UC-19 Excel).
 *
 * Los 3 reportes disponibles con filtros dinámicos:
 *   1. Postulantes    → lista de postulantes con estado y carrera de opción
 *   2. Resultados     → ranking de admitidos/no admitidos por carrera
 *   3. Notas          → calificaciones por materia con promedios
 *
 * Cada reporte se puede generar en PDF (UC-18) o Excel (UC-19).
 *
 * Rutas:
 *   GET /api/reportes/preview          → datos en JSON para vista previa
 *   GET /api/reportes/pdf              → descargar PDF
 *   GET /api/reportes/excel            → descargar Excel
 */
class ReporteController extends Controller
{
    public function __construct(private AuditService $audit)
    {
    }

    /**
     * Vista previa del reporte en JSON (para mostrar en la UI antes de descargar).
     * Parámetros: ?tipo=postulantes|resultados|notas &estado=&carrera_id=&materia_id=
     * Ruta: GET /api/reportes/preview
     */
    public function preview(Request $request)
    {
        $gestion = Gestion::actual();
        if (! $gestion) {
            return response()->json(['message' => 'No hay una gestión activa.'], 422);
        }

        $tipo = $request->query('tipo', 'postulantes');
        $data = $this->obtenerDatos($tipo, $request, $gestion);

        return response()->json([
            'data'    => $data,
            'tipo'    => $tipo,
            'gestion' => ['codigo' => $gestion->codigo, 'estado' => $gestion->estado],
            'total'   => count($data),
        ]);
    }

    /**
     * Genera y descarga el reporte en PDF (UC-18).
     * Usa DomPDF con plantillas Blade.
     * Ruta: GET /api/reportes/pdf
     */
    public function pdf(Request $request)
    {
        $gestion = Gestion::actual();
        if (! $gestion) {
            return response()->json(['message' => 'No hay una gestión activa.'], 422);
        }

        $tipo = $request->query('tipo', 'postulantes');
        $data = $this->obtenerDatos($tipo, $request, $gestion);

        $titulos = [
            'postulantes' => 'Reporte de Postulantes',
            'resultados'  => 'Reporte de Resultados y Admisión',
            'notas'       => 'Reporte de Notas',
        ];

        $pdf = Pdf::loadView("reportes.{$tipo}", [
            'data'    => $data,
            'gestion' => $gestion,
            'titulo'  => $titulos[$tipo] ?? 'Reporte CUP-FICCT',
            'filtros' => $this->describeFiltros($request),
        ])->setPaper('a4', 'landscape');

        $this->audit->log('generar_reporte_pdf', 'Gestion', $gestion->id, [
            'tipo' => $tipo, 'total' => count($data),
        ], $request);

        $nombre = "reporte_{$tipo}_{$gestion->codigo}.pdf";
        return $pdf->download($nombre);
    }

    /**
     * Genera y descarga el reporte en Excel (UC-19).
     * Ruta: GET /api/reportes/excel
     */
    public function excel(Request $request)
    {
        $gestion = Gestion::actual();
        if (! $gestion) {
            return response()->json(['message' => 'No hay una gestión activa.'], 422);
        }

        $tipo = $request->query('tipo', 'postulantes');
        $data = $this->obtenerDatos($tipo, $request, $gestion);

        $this->audit->log('generar_reporte_excel', 'Gestion', $gestion->id, [
            'tipo' => $tipo, 'total' => count($data),
        ], $request);

        $nombre   = "reporte_{$tipo}_{$gestion->codigo}.xlsx";
        $exportClass = match ($tipo) {
            'resultados' => new ReporteResultadosExport($data, $gestion),
            'notas'      => new ReporteNotasExport($data, $gestion),
            default      => new ReportePostulantesExport($data, $gestion),
        };

        return Excel::download($exportClass, $nombre);
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    /**
     * Obtiene los datos según el tipo de reporte y los filtros aplicados.
     */
    private function obtenerDatos(string $tipo, Request $request, Gestion $gestion): array
    {
        return match ($tipo) {
            'resultados' => $this->datosResultados($gestion, $request),
            'notas'      => $this->datosNotas($gestion, $request),
            default      => $this->datosPostulantes($gestion, $request),
        };
    }

    /**
     * Reporte 1: Lista de postulantes con filtros de estado y carrera.
     */
    private function datosPostulantes(Gestion $gestion, Request $request): array
    {
        $query = Postulante::where('gestion_id', $gestion->id)
            ->with(['carreraPrimeraOpcion', 'carreraSegundaOpcion'])
            ->orderBy('apellidos');

        if ($estado = $request->query('estado')) {
            $query->where('estado', $estado);
        }

        if ($carreraId = $request->query('carrera_id')) {
            $query->where('carrera_1ra_opcion_id', $carreraId);
        }

        return $query->get()->map(fn($p) => [
            'ci'             => $p->ci,
            'apellidos'      => $p->apellidos,
            'nombres'        => $p->nombres,
            'estado'         => $p->estado,
            'carrera_1ra'    => $p->carreraPrimeraOpcion?->nombre ?? '—',
            'carrera_2da'    => $p->carreraSegundaOpcion?->nombre ?? '—',
            'ciudad'         => $p->ciudad ?? '—',
            'colegio'        => $p->colegio ?? '—',
        ])->toArray();
    }

    /**
     * Reporte 2: Ranking de resultados (admitidos/no admitidos) por carrera.
     */
    private function datosResultados(Gestion $gestion, Request $request): array
    {
        $query = CupoAsignado::where('gestion_id', $gestion->id)
            ->with(['postulante', 'carrera'])
            ->orderBy('posicion_ranking');

        if ($carreraId = $request->query('carrera_id')) {
            $query->where('carrera_id', $carreraId);
        }

        if ($opcion = $request->query('opcion')) {
            $query->where('opcion_asignada', $opcion);
        }

        return $query->get()->map(fn($c) => [
            'posicion'        => $c->posicion_ranking,
            'ci'              => $c->postulante?->ci ?? '—',
            'apellidos'       => $c->postulante?->apellidos ?? '—',
            'nombres'         => $c->postulante?->nombres ?? '—',
            'promedio_general'=> number_format((float) $c->promedio_general, 2),
            'carrera'         => $c->carrera?->nombre ?? 'Sin cupo',
            'opcion_asignada' => match($c->opcion_asignada) {
                'primera'     => '1ra opción',
                'segunda'     => '2da opción',
                'no_admitido' => 'No admitido',
                default       => $c->opcion_asignada,
            },
        ])->toArray();
    }

    /**
     * Reporte 3: Notas de todos los postulantes con promedios ponderados.
     * Filtro opcional por materia.
     */
    private function datosNotas(Gestion $gestion, Request $request): array
    {
        $materiaId = $request->query('materia_id');

        $pesos = [
            1 => (float) \App\Models\ConfiguracionSistema::obtener('peso_examen_1', 30),
            2 => (float) \App\Models\ConfiguracionSistema::obtener('peso_examen_2', 30),
            3 => (float) \App\Models\ConfiguracionSistema::obtener('peso_examen_3', 40),
        ];

        $materias = $materiaId
            ? Materia::where('id', $materiaId)->get()
            : Materia::orderBy('id')->get();

        $postulantes = Postulante::where('gestion_id', $gestion->id)
            ->whereIn('estado', ['confirmado', 'aprobado', 'reprobado', 'admitido', 'no_admitido'])
            ->orderBy('apellidos')
            ->get(['id', 'ci', 'nombres', 'apellidos', 'estado']);

        $resultado = [];

        foreach ($postulantes as $postulante) {
            $fila = [
                'ci'        => $postulante->ci,
                'apellidos' => $postulante->apellidos,
                'nombres'   => $postulante->nombres,
                'estado'    => $postulante->estado,
            ];

            $promedios = [];

            foreach ($materias as $materia) {
                $examenes = Examen::where('gestion_id', $gestion->id)
                    ->where('materia_id', $materia->id)
                    ->orderBy('numero')
                    ->get();

                $notasPorExamen = Nota::where('postulante_id', $postulante->id)
                    ->whereIn('examen_id', $examenes->pluck('id'))
                    ->get()
                    ->keyBy('examen_id');

                $n1 = $notasPorExamen->get($examenes->get(0)?->id)?->calificacion;
                $n2 = $notasPorExamen->get($examenes->get(1)?->id)?->calificacion;
                $n3 = $notasPorExamen->get($examenes->get(2)?->id)?->calificacion;

                $promedio = ($n1 !== null && $n2 !== null && $n3 !== null)
                    ? round(((float)$n1 * $pesos[1] + (float)$n2 * $pesos[2] + (float)$n3 * $pesos[3]) / 100, 2)
                    : null;

                $fila["{$materia->codigo}_ex1"]  = $n1 !== null ? number_format((float)$n1, 2) : '—';
                $fila["{$materia->codigo}_ex2"]  = $n2 !== null ? number_format((float)$n2, 2) : '—';
                $fila["{$materia->codigo}_ex3"]  = $n3 !== null ? number_format((float)$n3, 2) : '—';
                $fila["{$materia->codigo}_prom"] = $promedio !== null ? number_format($promedio, 2) : '—';

                if ($promedio !== null) $promedios[] = $promedio;
            }

            $fila['promedio_general'] = count($promedios) === $materias->count()
                ? number_format(array_sum($promedios) / count($promedios), 2)
                : '—';

            $resultado[] = $fila;
        }

        return $resultado;
    }

    /**
     * Describe los filtros aplicados para mostrarlos en el encabezado del reporte.
     */
    private function describeFiltros(Request $request): array
    {
        $filtros = [];

        if ($estado = $request->query('estado')) {
            $filtros[] = "Estado: {$estado}";
        }
        if ($carreraId = $request->query('carrera_id')) {
            $carrera = Carrera::find($carreraId);
            if ($carrera) $filtros[] = "Carrera: {$carrera->nombre}";
        }
        if ($materiaId = $request->query('materia_id')) {
            $materia = Materia::find($materiaId);
            if ($materia) $filtros[] = "Materia: {$materia->nombre}";
        }
        if ($opcion = $request->query('opcion')) {
            $filtros[] = "Opción: {$opcion}";
        }

        return $filtros;
    }
}
