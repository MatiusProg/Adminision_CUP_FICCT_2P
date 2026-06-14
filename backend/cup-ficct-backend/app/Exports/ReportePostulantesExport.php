<?php
// ============================================================
// ARCHIVO 1: app/Exports/ReportePostulantesExport.php
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

class ReportePostulantesExport implements FromArray, WithHeadings, WithStyles, WithColumnWidths, WithTitle
{
    public function __construct(
        private array $data,
        private Gestion $gestion
    ) {}

    public function array(): array { return $this->data; }

    public function headings(): array
    {
        return ['CI', 'Apellidos', 'Nombres', 'Estado', '1ra Opción', '2da Opción', 'Ciudad', 'Colegio'];
    }

    public function title(): string { return "Postulantes {$this->gestion->codigo}"; }

    public function columnWidths(): array
    {
        return ['A' => 14, 'B' => 22, 'C' => 22, 'D' => 14, 'E' => 28, 'F' => 28, 'G' => 18, 'H' => 28];
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->getStyle('A1:H1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '0f3460']],
        ]);
        return [];
    }
}
