<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

/**
 * Gestión de usuarios internos del sistema (UC-02).
 * Solo Administrador puede crear, editar y desactivar usuarios.
 * Roles permitidos: admin, coordinador_academico, autoridad, docente.
 * Los postulantes NO se gestionan aquí — se crean via webhook de Stripe.
 *
 * Desactivación: lógica (campo activo = false), nunca física.
 */
class UserController extends Controller
{
    // Roles internos válidos — los postulantes se excluyen de esta gestión.
    private const ROLES_INTERNOS = ['admin', 'coordinador_academico', 'autoridad', 'docente'];

    public function __construct(private AuditService $audit)
    {
    }

    /**
     * Lista usuarios internos con búsqueda y filtro por rol.
     * Parámetros opcionales: ?search=, ?rol=, ?activo=
     * Ruta: GET /api/usuarios
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::whereIn('rol', self::ROLES_INTERNOS);

        // Búsqueda por nombre o email.
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%");
            });
        }

        // Filtro por rol específico.
        if ($rol = $request->query('rol')) {
            if (in_array($rol, self::ROLES_INTERNOS)) {
                $query->where('rol', $rol);
            }
        }

        // Filtro por estado activo/inactivo.
        if ($request->has('activo')) {
            $activo = filter_var($request->query('activo'), FILTER_VALIDATE_BOOLEAN);
            $query->whereRaw($activo ? '"activo" = TRUE' : '"activo" = FALSE');
        }
        $perPage  = (int) $request->query('per_page', 15);
        $users = $query->orderBy('name')->paginate($perPage);

        return UserResource::collection($users)->response();
    }

    /**
     * Muestra un usuario puntual.
     * Ruta: GET /api/usuarios/{user}
     */
    public function show(User $user): UserResource
    {
        // Proteger: no exponer postulantes por esta ruta.
        abort_if(! in_array($user->rol, self::ROLES_INTERNOS), 404);

        return new UserResource($user);
    }

    /**
     * Crea un nuevo usuario interno.
     * Ruta: POST /api/usuarios
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
            'rol'      => $data['rol'],
            'activo'   => DB::raw('TRUE'),
        ]);

        $this->audit->log('crear', 'User', $user->id, [
            'name'  => $user->name,
            'email' => $user->email,
            'rol'   => $user->rol,
        ], $request);

        return response()->json(['data' => new UserResource($user)], 201);
    }

    /**
     * Actualiza datos de un usuario interno.
     * Ruta: PUT /api/usuarios/{user}
     */
    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        abort_if(! in_array($user->rol, self::ROLES_INTERNOS), 404);

        $data    = $request->validated();
        $antes   = $user->only(['name', 'email', 'rol']);

        // Actualizar contraseña solo si se envió una nueva.
        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        $this->audit->log('editar', 'User', $user->id, [
            'antes'   => $antes,
            'despues' => $user->fresh()->only(['name', 'email', 'rol']),
        ], $request);

        return new UserResource($user->fresh());
    }

    /**
     * Desactiva lógicamente un usuario (activo = false).
     * No se permite auto-desactivarse ni desactivar al único admin.
     * Ruta: PUT /api/usuarios/{user}/desactivar
     */
    public function desactivar(Request $request, User $user): JsonResponse
    {
        abort_if(! in_array($user->rol, self::ROLES_INTERNOS), 404);

        if ($request->user()->id === $user->id) {
            return response()->json([
                'message' => 'No puede desactivar su propia cuenta.',
            ], 422);
        }

        if ($user->rol === 'admin') {
            $adminsActivos = User::where('rol', 'admin')
                ->whereRaw('"activo" = TRUE')
                ->count();

            if ($adminsActivos <= 1) {
                return response()->json([
                    'message' => 'No se puede desactivar al único administrador activo del sistema.',
                ], 422);
            }
        }

        // Usar DB::table para evitar el problema boolean con PDO::ATTR_EMULATE_PREPARES.
        DB::table('users')->where('id', $user->id)
            ->update(['activo' => DB::raw('FALSE')]);

        $user->tokens()->delete();

        $this->audit->log('desactivar', 'User', $user->id, [
            'name' => $user->name,
            'rol'  => $user->rol,
        ], $request);

        return response()->json(['message' => "Usuario {$user->name} desactivado correctamente."]);
    }

    /**
     * Reactiva un usuario previamente desactivado.
     * Ruta: PUT /api/usuarios/{user}/reactivar
     */
    public function reactivar(Request $request, User $user): JsonResponse
{
    abort_if(! in_array($user->rol, self::ROLES_INTERNOS), 404);

    DB::table('users')->where('id', $user->id)
        ->update(['activo' => DB::raw('TRUE')]);

    $this->audit->log('reactivar', 'User', $user->id, [
        'name' => $user->name,
        'rol'  => $user->rol,
    ], $request);

    return response()->json(['message' => "Usuario {$user->name} reactivado correctamente."]);
}
}
