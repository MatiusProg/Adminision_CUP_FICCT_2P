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
//CU22 - MATEP
use App\Http\Controllers\Api\PasswordResetController;

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
});
