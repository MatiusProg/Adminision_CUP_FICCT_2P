# PROJECT CUP - University Admission System for FICCT

## 1. Overview
Web application to manage the pre-university course (CUP "Curso Universitario Prefacultativo) 
admission process for FICCT ("Facultad de Ingenieria en Ciencias e la Computacion y Telecomunicaciones").

**IMPORTANT: The system UI, database tables, comments, field labels, and all user-facing
content MUST be in SPANISH. Only the code and this context file (and all our conversations)
are in English.**

*Note: We are geograficly ubicated in Bolivia, Santa Cruz, Santa Cruz de la Sierra, UAGRM (university).*

Core features:
- Applicant registration with requirements validation (high school diploma)
- Payment via Stripe or PayPal (MANDATORY for Cycle 1)
- Automatic group assignment per subject (max 70 students per group, configurable)
- 3 exams per subject (4 subjects: Computing, Math, English, Physics)
  with configurable weight percentages
- Automatic grade calculation and status (APPROVED/REJECTED)
- Career quota assignment (1st and 2nd choice)
- Teacher hiring and assignment to groups (max 4 groups per teacher, configurable)
- Report generation (PDF, Excel)
- Admin dashboard with KPIs

## 2. Tech Stack (MANDATORY - NON-NEGOTIABLE)
- **Backend:** PHP 8.2.12 + Laravel 10.x (installed via Laravel Installer 5.28.1)
- **Local Environment:** XAMPP (Apache + PostgreSQL)
- **Frontend:** React + Vite + TypeScript + shadcn/ui + Tailwind CSS
- **Database:** PostgreSQL 16 (local via XAMPP, synced with Supabase for team collaboration)
- **Deployment:** Railway or Google Cloud
- **Version Control:** GitHub
- **Optional extras:** Voice commands with AI, custom payment gateway

## 3. Team
- **Mateo Hurtado:** (Me)
- **Karen Ortega:** 

## 4. Deadlines
- **Presentation 1 (50%):** Saturday, May 30, 2026 at 23:59
- **Presentation 2 (100%):** Saturday, June 13, 2026 at 23:59
- **Defense:** Monday, June 15, 2026 at 7:00 AM
- **Total development time:** 2 weeks (May 27 - June 13)

## 5. System Modules

### Module 1: Authentication
- Secure login (roles: admin, coordinador_academico, docente, autoridad)
- Logout
- Password recovery (optional)
- Session control via Laravel middleware
- Initial user creation by Admin (manual registration)
- Role-based permissions:
  - **Admin:** Full system access
  - **Coordinador Academico:** Grade registration, exam management
  - **Docente:** View assigned groups, workload, register attendance
  - **Autoridad:** Read-only reports and dashboard

### Module 2: Applicant Registration (Postulantes)
- Full CRUD for applicants
- Fields: CI (national ID, UNIQUE), Nombres, Apellidos, Fecha_nacimiento,
  Sexo, Direccion, Telefono, Email, Colegio, Ciudad, Carrera_1ra_opcion,
  Carrera_2da_opcion, Titulo_bachiller (checkbox, extra data, no logic)
- Validations: unique CI, valid email, required fields
- Search and filter applicants
- Requirements check before payment
- **Payment gateway MANDATORY (Stripe or PayPal)**
- Payment confirmation before registration completion

### Module 3: Exams (Exámenes)
- 4 subjects: Computacion, Matematicas, Ingles, Fisica
- 3 exams per subject = 12 grades per student total
- Grades: 0 to 100
- Weight percentages configurable by Admin (e.g., Exam1=30%, Exam2=30%, Exam3=40%)
- Weighted average per subject = (Grade1 × Weight1 + Grade2 × Weight2 + Grade3 × Weight3)
- APPROVED if ALL subjects have average >= 60
- REJECTED if ANY subject has average < 60
- Coordinador Academico or Admin registers grades
- Display final average and status per subject

### Module 4: Group and Quota Assignment
- Groups are PER SUBJECT (each student has 4 groups, one per subject)
- Max students per group configurable by Admin (default: 70)
- Automatic group count calculation: CEIL(TotalEnrolled / MaxStudentsPerGroup)
- Groups are calculated BEFORE courses start
- Teacher assignment to groups (max 4 groups per teacher, configurable)
- Validation: no schedule overlap for a single teacher
- If not enough teachers, Admin can register (hire) more
- **Career quota assignment:**
  - Admin defines max quota per career (variable per academic period)
  - 4 FICCT careers: Ingenieria de Sistemas, Ingenieria Informatica,
    Ingenieria en Telecomunicaciones, Ingenieria en Robotica
  - After all exams are graded, approved students are sorted by average (highest first)
  - Assign to 1st choice until quota is full
  - If 1st choice is full → assign to 2nd choice
  - If both full → NOT ADMITTED

### Module 5: Reports (Reportes)
- General applicant list
- Approved / Rejected applicants
- Grade averages per subject
- Group count per subject
- Statistics per subject
- Teachers per group
- Groups with highest approval rates
- Export PDF (mandatory)
- Export Excel (mandatory)
- Voice commands for reports (optional, only if time allows)

### Module 6: Admin Panel
- Sidebar navigation grouped by module
- Main dashboard with KPIs:
  - Total enrolled
  - Total approved
  - Total rejected
  - Total groups enabled (per subject)
  - Available quotas per career
- Responsive and professional design

## 6. Key Business Rules

### Applicants
1. CI must be unique (no duplicates)
2. Chooses 2 careers: 1st and 2nd choice
3. High school diploma checkbox (extra data, no logic attached)
4. Must complete payment before registration is confirmed

### Exams
5. 4 subjects: Computacion, Matematicas, Ingles, Fisica
6. 3 exams per subject = 12 total grades per student
7. Grades between 0 and 100
8. Weights configurable by Admin (e.g., 30%, 30%, 40%)
9. APPROVED if ALL subjects have weighted average >= 60
10. REJECTED if ANY subject has weighted average < 60

### Groups
11. Groups are PER SUBJECT (each student belongs to 4 groups)
12. Max students per group configurable by Admin (default: 70)
13. Auto-calculation: CEIL(TotalEnrolled / MaxPerGroup)
14. Each group has: schedule, classroom, assigned teacher

### Teachers
15. Registered in the system with their own access
16. Max groups per teacher configurable by Admin (default: 4)
17. No schedule overlap allowed for a single teacher
18. Requirements: professional in the field + master's degree + teaching diploma
19. Can only: view their groups, view workload, register attendance
20. CANNOT register grades (done by Coordinador Academico or Admin)

### Career Quotas
21. Configurable by Admin (variable per academic period)
22. 4 FICCT careers: Sistemas, Informatica, Telecomunicaciones, Robotica
23. Assignment after all exams are graded, sorted by average (highest first)
24. If 1st choice full → 2nd choice. If both full → NOT ADMITTED

### Payments
25. Payment gateway MANDATORY for Cycle 1 (Stripe or PayPal)
26. Payment is required before applicant registration is confirmed

## 7. Academic Document Structure
1. PERFIL (1.1 Introduccion, 1.2 Objetivos, 1.3 Problema, 1.4 Alcance)
2. MARCO TEORICO
3. MODELO DE NEGOCIO (AS-IS Activity Diagrams)
4. FT CAPTURA DE REQUISITOS (Actors, Use Cases, Prototypes)
5. FT. ANALISIS (Sequence Diagrams)
6. FT. DISEÑO (6.1 Architecture, 6.2 Sequence Diagrams, 6.3 Data Design)
7. FT. IMPLEMENTACION (7.1 Tools, 7.2 Architecture, 7.3 Subsystems)
8. CONCLUSION, RECOMENDACION, BIBLIOGRAFIA
9. ANEXOS

## 8. Code Conventions
- **Laravel:** Standard MVC structure
- **Controllers:** PascalCase singular (PostulanteController, ExamenController)
- **Models:** PascalCase singular (Postulante, Examen, Grupo)
- **Migrations:** snake_case descriptive (create_postulantes_table)
- **API Routes:** api/postulantes, api/examenes, api/grupos
- **React:** Same patterns as previous SI1 semester project
  - Services: camelCase (postulanteService.ts)
  - Pages: PascalCase (PostulanteList.tsx, PostulanteForm.tsx)
  - Components: PascalCase (AppHeader.tsx, Sidebar.tsx)
- **File headers:** Module, Date, Author, Description

## 9. What We DON'T Know Well (will rely on Claude)
- Advanced PHP/Laravel (middleware, FormRequests, Eloquent ORM, Migrations)
- PostgreSQL connection from Laravel via XAMPP (.env, config/database.php)
- Stripe/PayPal integration in Laravel
- PDF generation (laravel-dompdf or similar)
- Excel generation (laravel-excel or similar)
- Voice commands with AI (optional)
- XAMPP configuration for Laravel + PostgreSQL

## 10. Frontend Style Guide (inherited from previous project)
- Component library: shadcn/ui (Button, Input, Table, Select, Sheet, Dialog,
  ScrollArea, VisuallyHidden)
- Icons: lucide-react
- Styling: Tailwind CSS with custom tokens (primary, secondary, muted, card,
  success, destructive)
- Layout pattern: AppHeader (top) + optional Sidebar (left drawer) + main content
- Data fetching: custom services in /services folder, using fetch() with Bearer token
- State management: React Context for auth, local state for page-specific data
- Routing: react-router-dom v6 with ProtectedRoute wrapper for role-based access
- Notifications: sonner (toast)
- Tables: responsive with overflow-x-auto on mobile
- Forms: card container (rounded-3xl shadow-card p-8), grid layout for field groups
- Design: professional, clean, responsive (mobile-first)

Claude: You are free to propose improvements over these patterns if you see
a better approach for this specific project. These are guidelines, not strict rules.