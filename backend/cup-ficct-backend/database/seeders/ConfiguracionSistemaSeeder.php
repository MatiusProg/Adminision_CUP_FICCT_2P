<?php

namespace Database\Seeders;

use App\Models\ConfiguracionSistema;
use Illuminate\Database\Seeder;

/**
 * Seeder de parámetros del sistema. Valores por defecto del esquema estándar del
 * CUP: grupos de hasta 40 alumnos, docentes con hasta 4 grupos, y pesos de examen
 * 30/30/40. Todos editables por el Administrador desde la UI.
 */
class ConfiguracionSistemaSeeder extends Seeder
{
    public function run(): void
    {
        $parametros = [
            ['clave' => 'max_alumnos_por_grupo', 'valor' => '40', 'descripcion' => 'Cantidad máxima de alumnos por grupo'],
            ['clave' => 'max_grupos_por_docente', 'valor' => '4', 'descripcion' => 'Cantidad máxima de grupos asignables a un docente'],
            ['clave' => 'peso_examen_1', 'valor' => '30', 'descripcion' => 'Peso porcentual del primer examen'],
            ['clave' => 'peso_examen_2', 'valor' => '30', 'descripcion' => 'Peso porcentual del segundo examen'],
            ['clave' => 'peso_examen_3', 'valor' => '40', 'descripcion' => 'Peso porcentual del tercer examen'],
            ['clave' => 'nota_minima_aprobacion', 'valor' => '60', 'descripcion' => 'Promedio mínimo para aprobar una materia'],
			['clave' => 'monto_inscripcion', 'valor' => '700', 'descripcion' => 'Monto de inscripción al CUP (BOB)'],
        ];

        foreach ($parametros as $parametro) {
            ConfiguracionSistema::updateOrCreate(['clave' => $parametro['clave']], $parametro);
        }
    }
}
