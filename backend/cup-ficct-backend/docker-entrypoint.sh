#!/bin/sh
# =============================================================================
#  docker-entrypoint.sh — Arranque del backend CUP-FICCT en producción
#  Corre migraciones, cachea config/rutas/eventos y levanta Octane+FrankenPHP.
# =============================================================================
set -e

# Puerto: Railway inyecta $PORT. Si no existe (build local), usar 8080.
PORT="${PORT:-8080}"

echo "==> Limpiando caches previos"
php artisan config:clear
php artisan route:clear

echo "==> Ejecutando migraciones"
php artisan migrate --force

echo "==> Cacheando configuracion, rutas y eventos"
php artisan config:cache
php artisan route:cache
php artisan event:cache

echo "==> Iniciando Laravel Octane con FrankenPHP en el puerto ${PORT}"
exec php artisan octane:start \
    --server=frankenphp \
    --host=0.0.0.0 \
    --port="${PORT}"
