# =============================================================================
#  Dockerfile — CUP-FICCT Backend (Laravel 12 + Octane + FrankenPHP)
#  Imagen base oficial de FrankenPHP: ya incluye PHP, FrankenPHP y pcntl.
# =============================================================================

FROM dunglas/frankenphp:1-php8.2

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# ---- Dependencias del sistema y extensiones de PHP ----
# install-php-extensions viene incluido en la imagen de FrankenPHP.
# Instalamos las extensiones que Laravel + PostgreSQL + Octane necesitan.
RUN install-php-extensions \
    pcntl \
    pdo_pgsql \
    pgsql \
    intl \
    zip \
    opcache \
    gd

# ---- Composer (lo copiamos desde la imagen oficial de composer) ----
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# ---- Copiar archivos de dependencias primero (mejor cacheo de capas) ----
COPY composer.json composer.lock ./

# Instalar dependencias PHP de producción (sin dev, optimizado)
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-interaction \
    --no-scripts \
    --prefer-dist

# ---- Copiar el resto del código de la aplicación ----
COPY . .

# Ejecutar los scripts de composer que omitimos antes (discovery de paquetes)
RUN composer dump-autoload --optimize --no-dev

# ---- Permisos de las carpetas que Laravel necesita escribir ----
RUN chown -R www-data:www-data /app/storage /app/bootstrap/cache \
    && chmod -R 775 /app/storage /app/bootstrap/cache

# ---- Copiar el script de arranque ----
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Railway inyecta el puerto en la variable $PORT; FrankenPHP la usará.
# Exponemos un puerto por convención (Railway lo mapea solo).
EXPOSE 8080

# El entrypoint corre migraciones + caches y luego arranca Octane.
ENTRYPOINT ["docker-entrypoint.sh"]
