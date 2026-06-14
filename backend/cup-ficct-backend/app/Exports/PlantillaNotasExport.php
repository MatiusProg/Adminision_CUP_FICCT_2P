<?php

namespace App\Exports;

use App\Models\Gestion;
use App\Models\Materia;
use App\Models\Postulante;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

/**
 * Exporta una plantilla Excel con los CIs de los postulantes de la gestión activa
 * para que el coordinador pueda rellenar las notas y luego importarlas.
 *
 * Formato:
 *   Columna A: ci (identificador único del postulante)
 *   Columna B: nombres (solo lectura — referencia visual)
 *   Columna C: apellidos (solo lectura — referencia visual)
 *   Columna D: examen_1 (a rellenar)
 *   Columna E: examen_2 (a rellenar)
 *   Columna F: examen_3 (a rellenar)
 */
class PlantillaNotasExport implements FromCollection, WithHeadings, WithStyles, WithColumnWidths, WithTitle
{
    private int $materiaId;
    private string $materiaNombre;
    private Gestion $gestion;

    public function __construct(int $materiaId, Gestion $gestion)
    {
        $this->materiaId     = $materiaId;
        $this->gestion       = $gestion;
        $this->materiaNombre = Materia::find($materiaId)?->nombre ?? 'Materia';
    }

    /**
     * Datos de los postulantes confirmados de la gestión activa.
     * Las columnas de notas van vacías para que el coordinador las rellene.
     */
    public function collection()
    {
        return Postulante::where('gestion_id', $this->gestion->id)
            ->whereIn('estado', ['confirmado', 'aprobado', 'reprobado'])
            ->orderBy('apellidos')
            ->get(['ci', 'nombres', 'apellidos'])
            ->map(fn($p) => [
                'ci'        => $p->ci,
                'nombres'   => $p->nombres,
                'apellidos' => $p->apellidos,
                'examen_1'  => '',
                'examen_2'  => '',
                'examen_3'  => '',
            ]);
    }

    public function headings(): array
    {
        return ['ci', 'nombres', 'apellidos', 'examen_1', 'examen_2', 'examen_3'];
    }

    public function title(): string
    {
        return "Notas {$this->materiaNombre}";
    }

    public function columnWidths(): array
    {
        return [
            'A' => 15,  // ci
            'B' => 25,  // nombres
            'C' => 25,  // apellidos
            'D' => 12,  // examen_1
            'E' => 12,  // examen_2
            'F' => 12,  // examen_3
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        // Estilo del encabezado: fondo azul oscuro, texto blanco, negrita.
        $sheet->getStyle('A1:F1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType'   => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1e3a5f'],
            ],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        // Columnas de referencia (nombres y apellidos) en gris claro — no editar.
        $sheet->getStyle('B2:C1000')->applyFromArray([
            'fill' => [
                'fillType'   => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'F3F4F6'],
            ],
        ]);

        // Columnas de notas en amarillo claro — a rellenar.
        $sheet->getStyle('D2:F1000')->applyFromArray([
            'fill' => [
                'fillType'   => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'FEFCE8'],
            ],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        return [];
    }
}
