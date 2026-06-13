<?php

namespace App\Http\Controllers\Api;

use App\Exports\PlantillaNotasExport;
use App\Http\Controllers\Controller;
use App\Imports\ImportarNotasExcel;
use App\Models\Gestion;
use App\Models\Materia;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Importación masiva de notas desde Excel/CSV y descarga de plantilla.
 *
 * Rutas:
 *   GET  /api/notas/plantilla/{materia}  → descargar plantilla Excel con CIs
 *   POST /api/notas/importar             → subir Excel con notas y procesarlas
 */
class ImportNotasController extends Controller
{
    public function __construct(private AuditService $audit)
    {
    }

    /**
     * Descarga la plantilla Excel con los postulantes de la gestión activa.
     * El coordinador rellena las columnas examen_1, examen_2, examen_3 y sube el archivo.
     * Ruta: GET /api/notas/plantilla/{materia}
     */
    public function descargarPlantilla(Materia $materia)
    {
        $gestion = Gestion::actual();
        if (! $gestion) {
            return response()->json(['message' => 'No hay una gestión activa.'], 422);
        }

        $nombre = "plantilla_notas_{$materia->codigo}_{$gestion->codigo}.xlsx";

        return Excel::download(
            new PlantillaNotasExport($materia->id, $gestion),
            $nombre
        );
    }

    /**
     * Importa notas desde un archivo Excel/CSV.
     * El archivo debe seguir el formato de la plantilla descargable.
     * Ruta: POST /api/notas/importar
     *
     * Body (multipart/form-data):
     *   materia_id: int
     *   archivo: file (xlsx, xls, csv)
     */
    public function importar(Request $request): JsonResponse
    {
        $request->validate([
            'materia_id' => ['required', 'integer', 'exists:materias,id'],
            'archivo'    => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:10240'],
        ], [
            'materia_id.required' => 'La materia es obligatoria.',
            'materia_id.exists'   => 'La materia seleccionada no existe.',
            'archivo.required'    => 'El archivo es obligatorio.',
            'archivo.mimes'       => 'El archivo debe ser Excel (.xlsx, .xls) o CSV (.csv).',
            'archivo.max'         => 'El archivo no puede superar 10 MB.',
        ]);

        $gestion = Gestion::actual();
        if (! $gestion) {
            return response()->json(['message' => 'No hay una gestión activa.'], 422);
        }

        $import = new ImportarNotasExcel($request->materia_id, $gestion);

        try {
            Excel::import($import, $request->file('archivo'));
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al procesar el archivo: ' . $e->getMessage(),
            ], 422);
        }

        $this->audit->log('importar_notas', 'Nota', null, [
            'materia_id'  => $request->materia_id,
            'importadas'  => $import->getImportadas(),
            'omitidas'    => $import->getOmitidas(),
            'errores'     => count($import->getErrores()),
        ], $request);

        return response()->json([
            'message'    => "Importación completada: {$import->getImportadas()} postulantes procesados.",
            'data' => [
                'importadas' => $import->getImportadas(),
                'omitidas'   => $import->getOmitidas(),
                'errores'    => $import->getErrores(),
            ],
        ]);
    }
}
