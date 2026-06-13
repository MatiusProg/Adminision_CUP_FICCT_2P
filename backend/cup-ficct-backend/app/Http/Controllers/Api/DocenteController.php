<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDocenteRequest;
use App\Http\Requests\UpdateDocenteRequest;
use App\Http\Resources\DocenteResource;
use App\Models\Docente;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Gestión de docentes del CUP-FICCT (UC-11).
 * Solo Administrador. Los docentes persisten entre gestiones (sin gestion_id).
 *
 * Particularidad: al crear un docente se puede crear opcionalmente una cuenta
 * de usuario asociada (rol 'docente') para que pueda acceder al sistema.
 * La desactivación es lógica (campo activo = false), nunca física.
 *
 * Verificación de formación (P3 del examen):
 * El sistema registra grado_academico y diplomado_docencia como atributos
 * del docente. La validación de qué puede impartir se aplica en UC-15
 * al momento de asignar docentes a grupos.
 */
class DocenteController extends Controller
{
    public function __construct(private AuditService $audit)
    {
    }

    /**
     * Lista docentes con búsqueda y filtro por estado activo.
     * Parámetros opcionales: ?search=, ?activo=
     * Ruta: GET /api/docentes
     */
    public function index(Request $request): JsonResponse
    {
        $query = Docente::with('user');

        // Búsqueda por nombre, apellido, CI o email.
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('nombres', 'ILIKE', "%{$search}%")
                  ->orWhere('apellidos', 'ILIKE', "%{$search}%")
                  ->orWhere('ci', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%");
            });
        }

        // Filtro por activo/inactivo.
        if ($request->has('activo')) {
            $activo = filter_var($request->query('activo'), FILTER_VALIDATE_BOOLEAN);
            $query->whereRaw($activo ? '"activo" = TRUE' : '"activo" = FALSE');
        }

        $docentes = $query->orderBy('apellidos')->paginate(15);

        return DocenteResource::collection($docentes)->response();
    }

    /**
     * Muestra un docente puntual con su usuario asociado.
     * Ruta: GET /api/docentes/{docente}
     */
    public function show(Docente $docente): DocenteResource
    {
        $docente->load('user');

        return new DocenteResource($docente);
    }

    /**
     * Crea un docente y opcionalmente su cuenta de usuario.
     * Si se envía crear_cuenta=true, se crea un User con rol 'docente'.
     * Todo en transacción para garantizar consistencia.
     * Ruta: POST /api/docentes
     */
    public function store(StoreDocenteRequest $request): JsonResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($data, $request, &$docente) {
            $userId = null;

            // Crear cuenta de usuario si se solicitó.
            if (! empty($data['crear_cuenta']) && ! empty($data['password'])) {
                $user = User::create([
                    'name'     => trim($data['nombres'] . ' ' . $data['apellidos']),
                    'email'    => $data['email'],
                    'password' => Hash::make($data['password']),
                    'rol'      => 'docente',
                    'activo'   => DB::raw('TRUE'),
                ]);
                $userId = $user->id;
            }

            $docente = Docente::create([
                'ci'                  => $data['ci'],
                'nombres'             => $data['nombres'],
                'apellidos'           => $data['apellidos'],
                'email'               => $data['email'],
                'telefono'            => $data['telefono'] ?? null,
                'titulo'              => $data['titulo'] ?? null,
                'grado_academico'     => $data['grado_academico'],
                // DB::raw para evitar boolean=integer con PDO::ATTR_EMULATE_PREPARES.
                'diplomado_docencia'  => ($data['diplomado_docencia'] ?? false)
                                            ? DB::raw('TRUE') : DB::raw('FALSE'),
                'user_id'             => $userId,
                'activo'              => DB::raw('TRUE'),
            ]);

            $this->audit->log('crear', 'Docente', $docente->id, [
                'ci'              => $docente->ci,
                'nombre'          => trim($docente->nombres . ' ' . $docente->apellidos),
                'grado_academico' => $docente->grado_academico,
                'con_cuenta'      => $userId !== null,
            ], $request);
        });

        $docente->load('user');

        return response()->json(['data' => new DocenteResource($docente)], 201);
    }

    /**
     * Actualiza los datos de un docente.
     * Si tiene cuenta asociada, actualiza también el nombre en users.
     * Ruta: PUT /api/docentes/{docente}
     */
    public function update(UpdateDocenteRequest $request, Docente $docente): DocenteResource
    {
        $data  = $request->validated();
        $antes = $docente->toArray();

        DB::transaction(function () use ($data, $docente, $request, $antes) {
            $docente->update([
                'ci'                 => $data['ci']                 ?? $docente->ci,
                'nombres'            => $data['nombres']            ?? $docente->nombres,
                'apellidos'          => $data['apellidos']          ?? $docente->apellidos,
                'email'              => $data['email']              ?? $docente->email,
                'telefono'           => $data['telefono']           ?? $docente->telefono,
                'titulo'             => $data['titulo']             ?? $docente->titulo,
                'grado_academico'    => $data['grado_academico']    ?? $docente->grado_academico,
                'diplomado_docencia' => $data['diplomado_docencia'] ?? $docente->diplomado_docencia,
            ]);

            // Sincronizar nombre en la cuenta de usuario si existe.
            if ($docente->user_id && ($data['nombres'] ?? null || $data['apellidos'] ?? null)) {
                $docente->user->update([
                    'name' => trim($docente->nombres . ' ' . $docente->apellidos),
                ]);
            }

            $this->audit->log('editar', 'Docente', $docente->id, [
                'antes'   => $antes,
                'despues' => $docente->fresh()->toArray(),
            ], $request);
        });

        $docente->load('user');

        return new DocenteResource($docente->fresh());
    }

    /**
     * Desactiva lógicamente un docente.
     * También desactiva su cuenta de usuario si tiene una.
     * Ruta: PUT /api/docentes/{docente}/desactivar
     */
    public function desactivar(Request $request, Docente $docente): JsonResponse
    {
        DB::transaction(function () use ($docente, $request) {
            if ($docente->user_id) {
                DB::table('users')->where('id', $docente->user_id)
                    ->update(['activo' => DB::raw('FALSE')]);
                $docente->user->tokens()->delete();
            }

            DB::table('docentes')->where('id', $docente->id)
                ->update(['activo' => DB::raw('FALSE')]);

            $this->audit->log('desactivar', 'Docente', $docente->id, [
                'nombre' => trim($docente->nombres . ' ' . $docente->apellidos),
            ], $request);
        });

        return response()->json([
            'message' => "Docente {$docente->nombres} {$docente->apellidos} desactivado correctamente.",
        ]);
    }

    /**
     * Reactiva un docente y su cuenta de usuario si tiene una.
     * Ruta: PUT /api/docentes/{docente}/reactivar
     */
    public function reactivar(Request $request, Docente $docente): JsonResponse
    {
        DB::transaction(function () use ($docente, $request) {
            if ($docente->user_id) {
                DB::table('users')->where('id', $docente->user_id)
                    ->update(['activo' => DB::raw('TRUE')]);
            }

            DB::table('docentes')->where('id', $docente->id)
                ->update(['activo' => DB::raw('TRUE')]);

            $this->audit->log('reactivar', 'Docente', $docente->id, [
                'nombre' => trim($docente->nombres . ' ' . $docente->apellidos),
            ], $request);
        });

        return response()->json([
            'message' => "Docente {$docente->nombres} {$docente->apellidos} reactivado correctamente.",
        ]);
    }
}
