<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Gestion;
use App\Models\Materia;
use App\Models\Carrera;

/**
 * Carga masiva de datos históricos del CUP-FICCT.
 *
 * Por cada gestión histórica (finalizada) crea en orden:
 *   1. Docentes (pool compartido de 20, solo en la primera pasada)
 *   2. Grupos (CEIL(postulantes / 60) por materia)
 *   3. Postulantes + Users (bulk insert)
 *   4. Inscripciones (cada postulante en 4 grupos, uno por materia)
 *   5. Notas (12 por postulante, valores aleatorios realistas)
 *   6. Estados (aprobado/reprobado según promedio >= 60 en todas las materias)
 *   7. Cupos asignados (ranking -> 1ra opcion -> 2da -> no_admitido)
 *   8. Actualizacion de postulantes.estado (admitido/no_admitido)
 *
 * Para la gestion activa (2026-2): solo crea postulantes + users confirmados.
 *
 * 4 postulantes demo con emails/contrasenas conocidos:
 *   postulante1@cup-test.local / CI: 10000001 -> todas las gestiones
 *   postulante2@cup-test.local / CI: 10000002 -> 2025-2, 2026-1, 2026-2
 *   postulante3@cup-test.local / CI: 10000003 -> 2026-1, 2026-2
 *   postulante4@cup-test.local / CI: 10000004 -> solo 2026-2
 */
class CargaMasivaSeeder extends Seeder
{
    private const CAPACIDAD_GRUPO = 60;

    private array $volumen = [
        '2025-1' => 800,
        '2025-2' => 650,
        '2026-1' => 800,
        '2026-2' => 650,
    ];

    private array $demos = [
        ['ci' => '10000001', 'email' => 'postulante1@cup-test.local', 'gestiones' => ['2025-1','2025-2','2026-1','2026-2']],
        ['ci' => '10000002', 'email' => 'postulante2@cup-test.local', 'gestiones' => ['2025-2','2026-1','2026-2']],
        ['ci' => '10000003', 'email' => 'postulante3@cup-test.local', 'gestiones' => ['2026-1','2026-2']],
        ['ci' => '10000004', 'email' => 'postulante4@cup-test.local', 'gestiones' => ['2026-2']],
    ];

    private array $nombres   = ['Juan','Maria','Carlos','Ana','Luis','Rosa','Pedro','Carmen','Jorge','Patricia','Miguel','Lucia','Roberto','Elena','Fernando','Gabriela','Diego','Veronica','Pablo','Claudia','Alvaro','Sandra','Raul','Teresa','Sergio','Natalia','Ricardo','Daniela','Alejandro','Sofia'];
    private array $apellidos = ['Flores','Mamani','Quispe','Vargas','Gutierrez','Morales','Rojas','Lopez','Garcia','Martinez','Perez','Rodriguez','Sanchez','Torrez','Vasquez','Chavez','Cruz','Herrera','Medina','Ramos','Salazar','Mendoza','Aguilar','Castro','Romero','Jimenez','Alvarado','Reyes','Ortega','Silva'];

    public function run(): void
    {
        $gestiones = Gestion::orderBy('anio')->orderBy('periodo')->get();
        $materias  = Materia::orderBy('id')->get();
        $carreras  = Carrera::all();

        if ($materias->count() < 4) {
            $this->command->error('Faltan materias. Corre MateriasSeeder primero.');
            return;
        }

        $this->sembrarDocentes();

        foreach ($gestiones as $gestion) {
            $esActiva = $gestion->es_actual;
            $volumen  = $this->volumen[$gestion->codigo] ?? 650;

            $this->command->info("Procesando gestion {$gestion->codigo} ({$volumen} postulantes)...");

            if (!$esActiva) {
                $grupoIds = $this->sembrarGrupos($gestion, $materias, $volumen);
                $postIds  = $this->sembrarPostulantes($gestion, $carreras, $volumen);
                $this->sembrarInscripciones($gestion, $postIds, $materias, $grupoIds);
                $this->sembrarNotas($gestion, $postIds, $materias);
                $this->calcularEstados($gestion, $postIds, $materias);
                $this->asignarCupos($gestion, $postIds, $carreras);
            } else {
                $this->sembrarPostulantes($gestion, $carreras, $volumen);
            }

            $this->command->info("Gestion {$gestion->codigo} completada.");
        }

        $this->command->info('Carga masiva completada exitosamente.');
    }

    private function sembrarDocentes(): void
    {
        $existentes = DB::table('docentes')->count();
        if ($existentes >= 20) {
            $this->command->info('Docentes ya existen, omitiendo.');
            return;
        }

        $ahora    = now()->toDateTimeString();
        $docentes = [];
        $grados   = ['Licenciatura','Maestria','Doctorado'];
        $titulos  = ['Ing. en Sistemas','Ing. Informatico','Lic. en Matematicas','Lic. en Ingles','Ing. en Telecomunicaciones'];

        for ($i = 1; $i <= 20; $i++) {
            $nombre   = $this->nombres[array_rand($this->nombres)];
            $apellido = $this->apellidos[array_rand($this->apellidos)];
            $docentes[] = [
                'ci'                 => '20' . str_pad($i, 6, '0', STR_PAD_LEFT),
                'nombres'            => $nombre,
                'apellidos'          => $apellido . ' ' . $this->apellidos[array_rand($this->apellidos)],
                'email'              => strtolower($nombre) . '.docente' . $i . '@ficct.uagrm.edu.bo',
                'telefono'           => '7' . rand(1000000, 9999999),
                'titulo'             => $titulos[array_rand($titulos)],
                'grado_academico'    => $grados[array_rand($grados)],
                'diplomado_docencia' => rand(0, 1),
                'user_id'            => null,
                'activo'             => true,
                'created_at'         => $ahora,
                'updated_at'         => $ahora,
            ];
        }

        DB::table('docentes')->insert($docentes);
        $this->command->info('20 docentes creados.');
    }

    private function sembrarGrupos(object $gestion, $materias, int $volumen): array
    {
        $ahora      = now()->toDateTimeString();
        $numGrupos  = (int) ceil($volumen / self::CAPACIDAD_GRUPO);
        $docenteIds = DB::table('docentes')->pluck('id')->toArray();
        $aulas      = ['A-101','A-102','A-103','A-104','B-201','B-202','B-203','B-204','C-301','C-302','C-303','C-304','D-401','D-402'];
        $horarios   = ['Lunes y Miercoles 07:00-09:00','Lunes y Miercoles 09:00-11:00','Martes y Jueves 07:00-09:00','Martes y Jueves 09:00-11:00','Lunes y Miercoles 14:00-16:00','Martes y Jueves 14:00-16:00','Viernes 07:00-11:00','Viernes 14:00-18:00'];

        $gruposInsert        = [];
        $grupoIds            = [];
        $docenteAsignaciones = array_fill_keys($docenteIds, 0);

        foreach ($materias as $materia) {
            $grupoIds[$materia->id] = [];
            for ($g = 1; $g <= $numGrupos; $g++) {
                $docente = null;
                foreach ($docenteIds as $did) {
                    if ($docenteAsignaciones[$did] < 4) {
                        $docente = $did;
                        $docenteAsignaciones[$did]++;
                        break;
                    }
                }
                $gruposInsert[] = [
                    'gestion_id' => $gestion->id,
                    'materia_id' => $materia->id,
                    'docente_id' => $docente,
                    'nombre'     => 'G' . $g . '-' . $materia->codigo,
                    'aula'       => $aulas[($g - 1) % count($aulas)],
                    'horario'    => $horarios[($g - 1) % count($horarios)],
                    'capacidad'  => self::CAPACIDAD_GRUPO,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ];
            }
        }

        DB::table('grupos')->insert($gruposInsert);

        foreach ($materias as $materia) {
            $grupoIds[$materia->id] = DB::table('grupos')
                ->where('gestion_id', $gestion->id)
                ->where('materia_id', $materia->id)
                ->pluck('id')
                ->toArray();
        }

        $this->command->info("   {$numGrupos} grupos por materia creados.");
        return $grupoIds;
    }

    private function sembrarPostulantes(object $gestion, $carreras, int $volumen): array
    {
        $ahora      = now()->toDateTimeString();
        $carreraIds = $carreras->pluck('id')->toArray();
        $sexos      = ['M','M','M','F','F'];
        $ciudades   = ['Santa Cruz','Cochabamba','La Paz','Sucre','Oruro','Trinidad','Tarija'];
        $colegios   = ['Colegio Nacional Florida','Colegio San Luis','Unidad Educativa Bolivia','Colegio La Salle','Colegio Aleman','Unidad Educativa Cosmos','Colegio Sagrado Corazon'];

        $demosEnEstaGestion = array_values(array_filter($this->demos, fn($d) => in_array($gestion->codigo, $d['gestiones'])));

        foreach ($demosEnEstaGestion as $demo) {
            $userExistente = DB::table('users')->where('email', $demo['email'])->first();
            if (!$userExistente) {
                $userId = DB::table('users')->insertGetId([
                    'name'       => 'Demo Postulante ' . substr($demo['ci'], -1),
                    'email'      => $demo['email'],
                    'password'   => Hash::make($demo['ci']),
                    'rol'        => 'postulante',
                    'activo'     => true,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ]);
            } else {
                $userId = $userExistente->id;
            }

            $existe = DB::table('postulantes')->where('ci', $demo['ci'])->where('gestion_id', $gestion->id)->exists();
            if (!$existe) {
                $c1 = $carreraIds[0];
                $c2 = $carreraIds[1];
                DB::table('postulantes')->insert([
                    'gestion_id'            => $gestion->id,
                    'user_id'               => $userId,
                    'carrera_1ra_opcion_id' => $c1,
                    'carrera_2da_opcion_id' => $c2,
                    'ci'                    => $demo['ci'],
                    'nombres'               => 'Demo',
                    'apellidos'             => 'Postulante ' . substr($demo['ci'], -1),
                    'fecha_nacimiento'      => '2000-01-01',
                    'sexo'                  => 'M',
                    'email'                 => $demo['email'],
                    'ciudad'                => 'Santa Cruz',
                    'colegio'               => 'Colegio Demo',
                    'titulo_bachiller'      => true,
                    'estado'                => 'confirmado',
                    'created_at'            => $ahora,
                    'updated_at'            => $ahora,
                ]);
            }
        }

        $loteUsers = [];
        $lotePost  = [];
        $ciBase    = 10000100 + ($gestion->id * 10000);

        for ($i = 0; $i < $volumen - count($demosEnEstaGestion); $i++) {
            $ci       = (string)($ciBase + $i);
            $nombre   = $this->nombres[$i % count($this->nombres)];
            $apellido = $this->apellidos[$i % count($this->apellidos)];
            $apellido2= $this->apellidos[($i + 5) % count($this->apellidos)];
            $email    = strtolower($nombre) . '.' . strtolower($apellido) . '.' . $ci . '@cup-test.local';
            $c1       = $carreraIds[$i % count($carreraIds)];
            $c2       = $carreraIds[($i + 1) % count($carreraIds)];
            if ($c2 === $c1) $c2 = $carreraIds[($i + 2) % count($carreraIds)];

            $loteUsers[] = [
                'name'       => $nombre . ' ' . $apellido,
                'email'      => $email,
                'password'   => Hash::make($ci),
                'rol'        => 'postulante',
                'activo'     => true,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ];
            $lotePost[] = [
                'ci'       => $ci,
                'nombres'  => $nombre,
                'apellidos'=> $apellido . ' ' . $apellido2,
                'c1'       => $c1,
                'c2'       => $c2,
                'sexo'     => $sexos[$i % count($sexos)],
                'ciudad'   => $ciudades[$i % count($ciudades)],
                'colegio'  => $colegios[$i % count($colegios)],
                'email'    => $email,
            ];

            if (count($loteUsers) === 200 || $i === $volumen - count($demosEnEstaGestion) - 1) {
                DB::table('users')->insert($loteUsers);
                $emails      = array_column($loteUsers, 'email');
                $nuevosUsers = DB::table('users')->whereIn('email', $emails)->get(['id','email'])->keyBy('email');
                $insertPost  = [];
                foreach ($lotePost as $pd) {
                    $uid = $nuevosUsers[$pd['email']]->id ?? null;
                    if (!$uid) continue;
                    $anio = '200' . rand(0,5);
                    $mes  = str_pad(rand(1,12),2,'0',STR_PAD_LEFT);
                    $dia  = str_pad(rand(1,28),2,'0',STR_PAD_LEFT);
                    $insertPost[] = [
                        'gestion_id'            => $gestion->id,
                        'user_id'               => $uid,
                        'carrera_1ra_opcion_id' => $pd['c1'],
                        'carrera_2da_opcion_id' => $pd['c2'],
                        'ci'                    => $pd['ci'],
                        'nombres'               => $pd['nombres'],
                        'apellidos'             => $pd['apellidos'],
                        'fecha_nacimiento'      => "{$anio}-{$mes}-{$dia}",
                        'sexo'                  => $pd['sexo'],
                        'email'                 => $pd['email'],
                        'ciudad'                => $pd['ciudad'],
                        'colegio'               => $pd['colegio'],
                        'titulo_bachiller'      => (bool)rand(0,1),
                        'estado'                => 'confirmado',
                        'created_at'            => $ahora,
                        'updated_at'            => $ahora,
                    ];
                }
                DB::table('postulantes')->insert($insertPost);
                $loteUsers = [];
                $lotePost  = [];
            }
        }

        return DB::table('postulantes')->where('gestion_id', $gestion->id)->pluck('id')->toArray();
    }

    private function sembrarInscripciones(object $gestion, array $postIds, $materias, array $grupoIds): void
    {
        $ahora         = now()->toDateTimeString();
        $inscripciones = [];

        foreach ($postIds as $idx => $postId) {
            foreach ($materias as $materia) {
                $gruposMateria = $grupoIds[$materia->id];
                $grupoId       = $gruposMateria[$idx % count($gruposMateria)];
                $inscripciones[] = [
                    'gestion_id'        => $gestion->id,
                    'postulante_id'     => $postId,
                    'grupo_id'          => $grupoId,
                    'fecha_inscripcion' => $ahora,
                    'created_at'        => $ahora,
                    'updated_at'        => $ahora,
                ];
            }
            if (count($inscripciones) >= 500) {
                DB::table('inscripciones')->insert($inscripciones);
                $inscripciones = [];
            }
        }
        if (!empty($inscripciones)) DB::table('inscripciones')->insert($inscripciones);
        $this->command->info('   Inscripciones creadas.');
    }

    private function sembrarNotas(object $gestion, array $postIds, $materias): void
    {
        $ahora              = now()->toDateTimeString();
        $examenesPorMateria = DB::table('examenes')->where('gestion_id', $gestion->id)->get()->groupBy('materia_id');
        $notas              = [];

        foreach ($postIds as $postId) {
            foreach ($materias as $materia) {
                $examenes = $examenesPorMateria[$materia->id] ?? collect();
                foreach ($examenes as $examen) {
                    $nota = rand(1,10) <= 7 ? rand(60,100) + rand(0,99)/100 : rand(40,59) + rand(0,99)/100;
                    $notas[] = [
                        'gestion_id'    => $gestion->id,
                        'postulante_id' => $postId,
                        'examen_id'     => $examen->id,
                        'calificacion'  => round($nota, 2),
                        'created_at'    => $ahora,
                        'updated_at'    => $ahora,
                    ];
                }
            }
            if (count($notas) >= 500) {
                DB::table('notas')->insert($notas);
                $notas = [];
            }
        }
        if (!empty($notas)) DB::table('notas')->insert($notas);
        $this->command->info('   Notas creadas.');
    }

    private function calcularEstados(object $gestion, array $postIds, $materias): void
    {
        $ahora    = now()->toDateTimeString();
        $pesos    = [1 => 30, 2 => 30, 3 => 40];
        $examenes = DB::table('examenes')->where('gestion_id', $gestion->id)->get();

        $aprobados  = [];
        $reprobados = [];

        foreach (array_chunk($postIds, 200) as $lote) {
            $todasNotas = DB::table('notas')
                ->where('gestion_id', $gestion->id)
                ->whereIn('postulante_id', $lote)
                ->get()
                ->groupBy('postulante_id');

            foreach ($lote as $postId) {
                $notasPost     = $todasNotas[$postId] ?? collect();
                $aprobadoTotal = true;

                foreach ($materias as $materia) {
                    $examenesMateria = $examenes->where('materia_id', $materia->id)->values();
                    $promMateria     = 0;
                    foreach ($examenesMateria as $ex) {
                        $nota = $notasPost->firstWhere('examen_id', $ex->id);
                        if ($nota) $promMateria += $nota->calificacion * ($pesos[$ex->numero] / 100);
                    }
                    if ($promMateria < 60) { $aprobadoTotal = false; break; }
                }

                if ($aprobadoTotal) $aprobados[] = $postId;
                else $reprobados[] = $postId;
            }
        }

        foreach (array_chunk($aprobados, 200) as $lote) {
            DB::table('postulantes')->whereIn('id', $lote)->update(['estado' => 'aprobado', 'updated_at' => $ahora]);
        }
        foreach (array_chunk($reprobados, 200) as $lote) {
            DB::table('postulantes')->whereIn('id', $lote)->update(['estado' => 'reprobado', 'updated_at' => $ahora]);
        }

        $this->command->info('   Estados: ' . count($aprobados) . ' aprobados, ' . count($reprobados) . ' reprobados.');
    }

    private function asignarCupos(object $gestion, array $postIds, $carreras): void
    {
        $ahora    = now()->toDateTimeString();
        $pesos    = [1 => 30, 2 => 30, 3 => 40];
        $cupos    = $carreras->mapWithKeys(fn($c) => [$c->id => $c->cupo_maximo])->toArray();
        $ocupados = array_fill_keys(array_keys($cupos), 0);

        $aprobados = DB::table('postulantes')
            ->where('gestion_id', $gestion->id)
            ->where('estado', 'aprobado')
            ->get(['id','carrera_1ra_opcion_id','carrera_2da_opcion_id']);

        if ($aprobados->isEmpty()) {
            $this->command->info('   No hay aprobados para asignar cupos.');
            return;
        }

        $examenes    = DB::table('examenes')->where('gestion_id', $gestion->id)->get();
        $materiasIds = $examenes->pluck('materia_id')->unique();
        $promedios   = [];

        foreach ($aprobados as $post) {
            $notasPost = DB::table('notas')
                ->where('gestion_id', $gestion->id)
                ->where('postulante_id', $post->id)
                ->get();

            $suma = 0;
            $cnt  = 0;
            foreach ($materiasIds as $matId) {
                $exMat = $examenes->where('materia_id', $matId)->values();
                $prom  = 0;
                foreach ($exMat as $ex) {
                    $nota = $notasPost->firstWhere('examen_id', $ex->id);
                    if ($nota) $prom += $nota->calificacion * ($pesos[$ex->numero] / 100);
                }
                $suma += $prom;
                $cnt++;
            }

            $promedios[$post->id] = ['post' => $post, 'promedio' => $cnt > 0 ? round($suma / $cnt, 2) : 0];
        }

        uasort($promedios, fn($a, $b) => $b['promedio'] <=> $a['promedio']);

        $cuposInsert   = [];
        $admitidos     = [];
        $noAdmitidos   = [];
        $ranking       = 1;

        foreach ($promedios as $postId => $data) {
            $post    = $data['post'];
            $carrera = null;
            $opcion  = 'no_admitido';

            if ($ocupados[$post->carrera_1ra_opcion_id] < $cupos[$post->carrera_1ra_opcion_id]) {
                $carrera = $post->carrera_1ra_opcion_id;
                $opcion  = 'primera';
                $ocupados[$carrera]++;
            } elseif ($ocupados[$post->carrera_2da_opcion_id] < $cupos[$post->carrera_2da_opcion_id]) {
                $carrera = $post->carrera_2da_opcion_id;
                $opcion  = 'segunda';
                $ocupados[$carrera]++;
            }

            $cuposInsert[] = [
                'gestion_id'       => $gestion->id,
                'postulante_id'    => $postId,
                'carrera_id'       => $carrera,
                'promedio_general' => $data['promedio'],
                'posicion_ranking' => $ranking++,
                'opcion_asignada'  => $opcion,
                'created_at'       => $ahora,
                'updated_at'       => $ahora,
            ];

            if ($opcion !== 'no_admitido') $admitidos[] = $postId;
            else $noAdmitidos[] = $postId;
        }

        foreach (array_chunk($cuposInsert, 200) as $lote) DB::table('cupos_asignados')->insert($lote);

        foreach (array_chunk($admitidos, 200) as $lote) {
            DB::table('postulantes')->whereIn('id', $lote)->update(['estado' => 'admitido', 'updated_at' => $ahora]);
        }
        foreach (array_chunk($noAdmitidos, 200) as $lote) {
            DB::table('postulantes')->whereIn('id', $lote)->update(['estado' => 'no_admitido', 'updated_at' => $ahora]);
        }

        $this->command->info('   Cupos: ' . count($admitidos) . ' admitidos, ' . count($noAdmitidos) . ' no admitidos.');
    }
}