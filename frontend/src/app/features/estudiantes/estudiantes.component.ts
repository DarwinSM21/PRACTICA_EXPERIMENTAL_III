import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  EstudianteRequest,
  EstudianteResponse,
  EstudianteService
} from './estudiante.service';

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="contenedor">
      <div class="encabezado">
        <div>
          <h1>Gestión de estudiantes</h1>
          <p>Administración de estudiantes registrados en el sistema.</p>
        </div>

        <button class="btn btn-primario" (click)="abrirFormulario()">
          Nuevo estudiante
        </button>
      </div>

      <section class="mensaje error" *ngIf="mensajeError">
        {{ mensajeError }}
      </section>

      <section class="mensaje exito" *ngIf="mensajeExito">
        {{ mensajeExito }}
      </section>

      <section class="formulario" *ngIf="mostrarFormulario">
        <h2>{{ idEnEdicion ? 'Editar estudiante' : 'Nuevo estudiante' }}</h2>

        <form (ngSubmit)="guardar()">
          <div class="campos">
            <div class="campo">
              <label for="nombre">Nombre</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                minlength="2"
                maxlength="100"
                required
                [(ngModel)]="formulario.nombre"
              />
            </div>

            <div class="campo">
              <label for="apellido">Apellido</label>
              <input
                id="apellido"
                name="apellido"
                type="text"
                minlength="2"
                maxlength="100"
                required
                [(ngModel)]="formulario.apellido"
              />
            </div>

            <div class="campo">
              <label for="categoria">Categoría</label>
              <select
                id="categoria"
                name="categoria"
                required
                [(ngModel)]="formulario.categoria"
              >
                <option value="">Seleccione una categoría</option>
                <option value="SUB-12">SUB-12</option>
                <option value="SUB-14">SUB-14</option>
                <option value="SUB-16">SUB-16</option>
                <option value="SUB-18">SUB-18</option>
              </select>
            </div>
          </div>

          <div class="acciones-formulario">
            <button class="btn btn-primario" type="submit">
              {{ idEnEdicion ? 'Actualizar' : 'Guardar' }}
            </button>

            <button class="btn btn-secundario" type="button" (click)="cancelar()">
              Cancelar
            </button>
          </div>
        </form>
      </section>

      <section class="tabla-contenedor">
        <div class="cargando" *ngIf="cargando">
          Cargando estudiantes...
        </div>

        <table *ngIf="!cargando">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th>Fecha de registro</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            <tr *ngFor="let estudiante of estudiantes">
              <td>{{ estudiante.idEstudiante }}</td>
              <td>{{ estudiante.nombre }}</td>
              <td>{{ estudiante.apellido }}</td>
              <td>{{ estudiante.categoria }}</td>
              <td>
                <span
                  class="estado"
                  [class.activo]="estudiante.activo"
                  [class.inactivo]="!estudiante.activo"
                >
                  {{ estudiante.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>{{ estudiante.creadoEn | date:'dd/MM/yyyy HH:mm' }}</td>
              <td class="acciones-tabla">
                <button
                  class="btn btn-editar"
                  type="button"
                  (click)="editar(estudiante)"
                >
                  Editar
                </button>

                <button
                  class="btn btn-eliminar"
                  type="button"
                  (click)="eliminar(estudiante)"
                >
                  Eliminar
                </button>
              </td>
            </tr>

            <tr *ngIf="estudiantes.length === 0">
              <td colspan="7" class="sin-datos">
                No existen estudiantes registrados.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <div class="paginacion">
        <button
          class="btn btn-secundario"
          type="button"
          [disabled]="paginaActual === 0"
          (click)="paginaAnterior()"
        >
          Anterior
        </button>

        <span>
          Página {{ paginaActual + 1 }} de {{ totalPaginas || 1 }}
        </span>

        <button
          class="btn btn-secundario"
          type="button"
          [disabled]="paginaActual + 1 >= totalPaginas"
          (click)="paginaSiguiente()"
        >
          Siguiente
        </button>
      </div>
    </main>
  `,
  styles: [`
    .contenedor {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px;
      font-family: Arial, sans-serif;
    }

    .encabezado {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
    }

    h1 {
      margin: 0 0 8px;
      color: #1f2937;
    }

    h2 {
      margin-top: 0;
      color: #1f2937;
    }

    p {
      margin: 0;
      color: #6b7280;
    }

    .formulario {
      margin-bottom: 24px;
      padding: 24px;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 10px;
    }

    .campos {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .campo {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    label {
      font-weight: 600;
      color: #374151;
    }

    input,
    select {
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 14px;
    }

    input:focus,
    select:focus {
      outline: 2px solid #93c5fd;
      border-color: #2563eb;
    }

    .acciones-formulario {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    .tabla-contenedor {
      overflow-x: auto;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 14px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    th {
      background: #f3f4f6;
      color: #374151;
    }

    tr:hover td {
      background: #f9fafb;
    }

    .btn {
      padding: 9px 14px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primario {
      background: #2563eb;
      color: #ffffff;
    }

    .btn-secundario {
      background: #e5e7eb;
      color: #1f2937;
    }

    .btn-editar {
      background: #f59e0b;
      color: #ffffff;
    }

    .btn-eliminar {
      background: #dc2626;
      color: #ffffff;
    }

    .acciones-tabla {
      display: flex;
      gap: 8px;
    }

    .estado {
      display: inline-block;
      padding: 4px 9px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: bold;
    }

    .estado.activo {
      background: #dcfce7;
      color: #166534;
    }

    .estado.inactivo {
      background: #fee2e2;
      color: #991b1b;
    }

    .mensaje {
      margin-bottom: 18px;
      padding: 12px 16px;
      border-radius: 6px;
    }

    .mensaje.exito {
      background: #dcfce7;
      color: #166534;
    }

    .mensaje.error {
      background: #fee2e2;
      color: #991b1b;
    }

    .paginacion {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-top: 20px;
    }

    .sin-datos,
    .cargando {
      padding: 30px;
      text-align: center;
      color: #6b7280;
    }

    @media (max-width: 768px) {
      .contenedor {
        padding: 16px;
      }

      .encabezado {
        align-items: flex-start;
        flex-direction: column;
      }

      .campos {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class EstudiantesComponent implements OnInit {

  estudiantes: EstudianteResponse[] = [];
  paginaActual = 0;
  tamanioPagina = 10;
  totalPaginas = 0;

  cargando = false;
  mostrarFormulario = false;
  idEnEdicion: number | null = null;

  mensajeExito = '';
  mensajeError = '';

  formulario: EstudianteRequest = {
    nombre: '',
    apellido: '',
    categoria: ''
  };

  constructor(private estudianteService: EstudianteService) {}

  ngOnInit(): void {
    this.cargarEstudiantes();
  }

  cargarEstudiantes(): void {
    this.cargando = true;
    this.mensajeError = '';

    this.estudianteService
      .listar(this.paginaActual, this.tamanioPagina)
      .subscribe({
        next: respuesta => {
          this.estudiantes = respuesta.content;
          this.totalPaginas = respuesta.totalPages;
          this.cargando = false;
        },
        error: error => {
          console.error(error);
          this.mensajeError = 'No se pudieron cargar los estudiantes.';
          this.cargando = false;
        }
      });
  }

  abrirFormulario(): void {
    this.idEnEdicion = null;
    this.formulario = {
      nombre: '',
      apellido: '',
      categoria: ''
    };
    this.mostrarFormulario = true;
    this.limpiarMensajes();
  }

  editar(estudiante: EstudianteResponse): void {
    this.idEnEdicion = estudiante.idEstudiante;
    this.formulario = {
      nombre: estudiante.nombre,
      apellido: estudiante.apellido,
      categoria: estudiante.categoria
    };
    this.mostrarFormulario = true;
    this.limpiarMensajes();
  }

  guardar(): void {
    this.limpiarMensajes();

    const request: EstudianteRequest = {
      nombre: this.formulario.nombre.trim(),
      apellido: this.formulario.apellido.trim(),
      categoria: this.formulario.categoria
    };

    if (!request.nombre || !request.apellido || !request.categoria) {
      this.mensajeError = 'Todos los campos son obligatorios.';
      return;
    }

    if (this.idEnEdicion !== null) {
      this.estudianteService
        .editar(this.idEnEdicion, request)
        .subscribe({
          next: () => {
            this.mensajeExito = 'Estudiante actualizado correctamente.';
            this.cancelar(false);
            this.cargarEstudiantes();
          },
          error: error => {
            console.error(error);
            this.mensajeError = 'No se pudo actualizar el estudiante.';
          }
        });

      return;
    }

    this.estudianteService.crear(request).subscribe({
      next: () => {
        this.mensajeExito = 'Estudiante creado correctamente.';
        this.cancelar(false);
        this.paginaActual = 0;
        this.cargarEstudiantes();
      },
      error: error => {
        console.error(error);
        this.mensajeError = 'No se pudo crear el estudiante.';
      }
    });
  }

  eliminar(estudiante: EstudianteResponse): void {
    const confirmado = confirm(
      `¿Deseas eliminar a ${estudiante.nombre} ${estudiante.apellido}?`
    );

    if (!confirmado) {
      return;
    }

    this.limpiarMensajes();

    this.estudianteService
      .eliminar(estudiante.idEstudiante)
      .subscribe({
        next: () => {
          this.mensajeExito = 'Estudiante eliminado correctamente.';

          if (this.estudiantes.length === 1 && this.paginaActual > 0) {
            this.paginaActual--;
          }

          this.cargarEstudiantes();
        },
        error: error => {
          console.error(error);
          this.mensajeError = 'No se pudo eliminar el estudiante.';
        }
      });
  }

  cancelar(limpiarMensajes = true): void {
    this.mostrarFormulario = false;
    this.idEnEdicion = null;
    this.formulario = {
      nombre: '',
      apellido: '',
      categoria: ''
    };

    if (limpiarMensajes) {
      this.limpiarMensajes();
    }
  }

  paginaAnterior(): void {
    if (this.paginaActual > 0) {
      this.paginaActual--;
      this.cargarEstudiantes();
    }
  }

  paginaSiguiente(): void {
    if (this.paginaActual + 1 < this.totalPaginas) {
      this.paginaActual++;
      this.cargarEstudiantes();
    }
  }

  private limpiarMensajes(): void {
    this.mensajeExito = '';
    this.mensajeError = '';
  }
}
