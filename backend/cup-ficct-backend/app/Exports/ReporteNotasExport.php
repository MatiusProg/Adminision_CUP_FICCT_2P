<?php

namespace App\Exports;

use App\Models\Gestion;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;

/**
 * Exporta el reporte de notas con columnas por materia y examen.
 */
class ReporteNotasExport implements FromArray, WithHeadings, WithStyles, WithColumnWidths, WithTitle
{
    public function __construct(
        private array $data,
        private Gestion $gestion
    ) {}

    public function array(): array { return $this->data; }

    public function title(): string { return "Notas {$this->gestion->codigo}"; }

    public function headings(): array
    {
        return [
            'CI', 'Apellidos', 'Nombres', 'Estado',
            'COMP Ex1', 'COMP Ex2', 'COMP Ex3', 'COMP Prom',
            'MAT Ex1',  'MAT Ex2',  'MAT Ex3',  'MAT Prom',
            'ING Ex1',  'ING Ex2',  'ING Ex3',  'ING Prom',
            'FIS Ex1',  'FIS Ex2',  'FIS Ex3',  'FIS Prom',
            'Promedio General',
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 12, 'B' => 20, 'C' => 20, 'D' => 12,
            'E' => 10, 'F' => 10, 'G' => 10, 'H' => 10,
            'I' => 10, 'J' => 10, 'K' => 10, 'L' => 10,
            'M' => 10, 'N' => 10, 'O' => 10, 'P' => 10,
            'Q' => 10, 'R' => 10, 'S' => 10, 'T' => 10,
            'U' => 14,
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        // Encabezado azul oscuro FICCT.
        $sheet->getStyle('A1:U1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '0f3460']],
        ]);

        // Grupos de materias con colores de fondo sutiles para diferenciación visual.
        $sheet->getStyle('E1:H1')->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '0e7490']],
        ]);
        $sheet->getStyle('I1:L1')->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'b45309']],
        ]);
        $sheet->getStyle('M1:P1')->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '065f46']],
        ]);
        $sheet->getStyle('Q1:T1')->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '6b21a8']],
        ]);

        return [];
    }
}
