<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeder de usuarios del sistema. Crea un usuario por cada rol administrativo para
 * poder probar el control de acceso. Los usuarios de postulantes NO se crean aquí:
 * se generan junto con el postulante tras el pago.
 *
 * Credenciales de prueba (cambiar en producción): contraseña "password" para todos.
 */
class UsersSeeder extends Seeder
{
    public function run(): void
    {
        $usuarios = [
            ['name' => 'Administrador',          'email' => 'admin@ficct.uagrm.edu.bo',       'rol' => 'admin'],
            ['name' => 'Coordinador Académico',  'email' => 'coordinador@ficct.uagrm.edu.bo', 'rol' => 'coordinador_academico'],
            ['name' => 'Autoridad FICCT',        'email' => 'autoridad@ficct.uagrm.edu.bo',   'rol' => 'autoridad'],
        ];

        foreach ($usuarios as $usuario) {
            User::updateOrCreate(
                ['email' => $usuario['email']],
                [
                    'name' => $usuario['name'],
                    'rol' => $usuario['rol'],
                    'password' => Hash::make('password'),
                ]
            );
        }
    }
}
