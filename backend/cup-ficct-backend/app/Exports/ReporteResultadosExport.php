<?php
// ============================================================
// ARCHIVO 1: app/Exports/ReporteResultadosExport.php
// ============================================================

namespace App\Exports;

use App\Models\Gestion;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class ReporteResultadosExport implements FromArray, WithHeadings, WithStyles, WithColumnWidths, WithTitle
{
    public function __construct(
        private array $data,
        private Gestion $gestion
    ) {}

    public function array(): array { return $this->data; }

    public function headings(): array
    {
        return ['#', 'CI', 'Apellidos', 'Nombres', 'Promedio General', 'Carrera Asignada', 'Opción'];
    }

    public function title(): string { return "Resultados {$this->gestion->codigo}"; }

    public function columnWidths(): array
    {
        return ['A' => 6, 'B' => 14, 'C' => 22, 'D' => 22, 'E' => 16, 'F' => 30, 'G' => 14];
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->getStyle('A1:G1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '0f3460']],
        ]);
        return [];
    }
}