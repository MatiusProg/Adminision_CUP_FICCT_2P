<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CarreraController;
use App\Http\Controllers\Api\ConfiguracionController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\GestionController;
use App\Http\Controllers\Api\PagoController;
use App\Http\Controllers\Api\PostulanteController;
use Illuminate\Support\Facades\Route;
//CU23 -KAREN
use App\Http\Controllers\Api\PostulantePortalController;
//CU22 - MATEO
use App\Http\Controllers\Api\PasswordResetController;
//CU-02 - MATEO
use App\Http\Controllers\Api\UserController;
//CU-11 - KAREN
use App\Http\Controllers\Api\DocenteController;
//CU-14/15 - MATEO
use App\Http\Controllers\Api\GrupoController;
//CU-16 - MATEO
use App\Http\Controllers\Api\CupoController;

/*
|--------------------------------------------------------------------------
| Rutas API — Ciclo 1 CUP-FICCT
|--------------------------------------------------------------------------
| Roles: admin, coordinador_academico, docente, autoridad, postulante.
| Protección por rol mediante el middleware 'role:...' (lee users.rol).
| Públicas: login y webhook de Stripe (este último valida firma).
*/

// ----- Públicas -----
Route::post('/auth/login', [AuthController::class, 'login']);
// Webhook de Stripe: público (Stripe no envía token); la firma se verifica dentro.
Route::post('/pagos/webhook', [PagoController::class, 'webhook']);
// UC-22: recuperación de contraseña — públicas (no requieren token)
Route::post('/auth/forgot-password', [PasswordResetController::class, 'forgotPassword']);
Route::post('/auth/reset-password',  [PasswordResetController::class, 'resetPassword']);

// ----- Protegidas (requieren token Sanctum) -----
Route::middleware('auth:sanctum')->group(function () {

    // Sesión
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Carreras — lectura: cualquier autenticado · escritura: admin
    Route::get('/carreras', [CarreraController::class, 'index']);
    Route::get('/carreras/{carrera}', [CarreraController::class, 'show']);
    Route::middleware('role:admin')->group(function () {
        Route::post('/carreras', [CarreraController::class, 'store']);
        Route::put('/carreras/{carrera}', [CarreraController::class, 'update']);
    });

    // Postulantes
    // Listar/ver: admin, coordinador, autoridad (lectura)
    Route::middleware('role:admin,coordinador_academico,autoridad')->group(function () {
        Route::get('/postulantes', [PostulanteController::class, 'index']);
        Route::get('/postulantes/{postulante}', [PostulanteController::class, 'show']);
    });
    // Editar/eliminar: admin, coordinador
    Route::middleware('role:admin,coordinador_academico')->group(function () {
        Route::put('/postulantes/{postulante}', [PostulanteController::class, 'update']);
        Route::delete('/postulantes/{postulante}', [PostulanteController::class, 'destroy']);
    });

    // Pagos — iniciar checkout: admin, coordinador (registran en nombre del postulante)
    Route::middleware('role:admin,coordinador_academico')->group(function () {
        Route::post('/pagos/checkout-session', [PagoController::class, 'createSession']);
        Route::get('/pagos/postulante/{postulanteId}', [PagoController::class, 'porPostulante']);
    });

    // Configuración — solo admin
    Route::middleware('role:admin')->group(function () {
        Route::get('/configuracion', [ConfiguracionController::class, 'index']);
        Route::put('/configuracion/{clave}', [ConfiguracionController::class, 'update']);
    });

    // Gestiones — lectura: cualquier autenticado · escritura: admin
    Route::get('/gestiones', [GestionController::class, 'index']);
    Route::get('/gestiones/actual', [GestionController::class, 'actual']);
    Route::middleware('role:admin')->group(function () {
        Route::post('/gestiones', [GestionController::class, 'store']);
        Route::put('/gestiones/{gestion}/estado', [GestionController::class, 'updateEstado']);
        Route::put('/gestiones/{gestion}/activar', [GestionController::class, 'activar']);
    });

    // Dashboard — admin y autoridad
    Route::middleware('role:admin,autoridad')->group(function () {
        Route::get('/dashboard/kpis', [DashboardController::class, 'kpis']);
    });
    
    // Portal del postulante (UC-23) — solo el propio postulante accede
    Route::middleware('role:postulante')->group(function () {
        Route::get('/postulante/mis-materias', [PostulantePortalController::class, 'misMaterias']);
        Route::get('/postulante/mis-notas',    [PostulantePortalController::class, 'misNotas']);
    });

    // UC-02: Gestión de usuarios internos — solo admin
    Route::middleware('role:admin')->group(function () {
        Route::get('/usuarios',                       [UserController::class, 'index']);
        Route::get('/usuarios/{user}',                [UserController::class, 'show']);
        Route::post('/usuarios',                      [UserController::class, 'store']);
        Route::put('/usuarios/{user}',                [UserController::class, 'update']);
        Route::put('/usuarios/{user}/desactivar',     [UserController::class, 'desactivar']);
        Route::put('/usuarios/{user}/reactivar',      [UserController::class, 'reactivar']);
    });

    // UC-11: Gestión de docentes — admin y coordinador_academico
    Route::middleware('role:admin')->group(function () {
        Route::get('/docentes',                         [DocenteController::class, 'index']);
        Route::get('/docentes/{docente}',               [DocenteController::class, 'show']);
        Route::post('/docentes',                        [DocenteController::class, 'store']);
        Route::put('/docentes/{docente}',               [DocenteController::class, 'update']);
        Route::put('/docentes/{docente}/desactivar',    [DocenteController::class, 'desactivar']);
        Route::put('/docentes/{docente}/reactivar',     [DocenteController::class, 'reactivar']);
    });

    // UC-14/15: Gestión de grupos — admin y coordinador
    Route::middleware('role:admin,coordinador_academico')->group(function () {
        // UC-14: generación y edición de grupos
        Route::get('/grupos',                                [GrupoController::class, 'index']);
        Route::get('/grupos/horarios',                       [GrupoController::class, 'horarios']);
        Route::post('/grupos/generar',                       [GrupoController::class, 'generar']);
        Route::put('/grupos/{grupo}/horario',                [GrupoController::class, 'actualizarHorario']);
    
        // UC-15: asignación de docentes con validaciones
        Route::get('/grupos/{grupo}/docentes-disponibles',   [GrupoController::class, 'docentesDisponibles']);
        Route::put('/grupos/{grupo}/asignar-docente',        [GrupoController::class, 'asignarDocente']);
        Route::delete('/grupos/{grupo}/docente',             [GrupoController::class, 'desasignarDocente']);
    });

    // UC-16: Asignación de cupos por carrera
    Route::middleware('role:admin')->group(function () {
        Route::post('/cupos/asignar',   [CupoController::class, 'asignar']);
        Route::get('/cupos/ranking',    [CupoController::class, 'ranking']);
        Route::get('/cupos/resumen',    [CupoController::class, 'resumen']);
    });
});
