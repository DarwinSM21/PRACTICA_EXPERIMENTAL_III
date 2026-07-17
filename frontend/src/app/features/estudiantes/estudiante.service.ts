import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface EstudianteRequest {
  nombre: string;
  apellido: string;
  categoria: string;
}

export interface EstudianteResponse {
  idEstudiante: number;
  nombre: string;
  apellido: string;
  categoria: string;
  activo: boolean;
  creadoEn: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EstudianteService {

  private readonly apiUrl = '/api/estudiantes';

  constructor(private http: HttpClient) {}

  listar(page = 0, size = 10): Observable<PageResponse<EstudianteResponse>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .append('sort', 'idEstudiante')
      .append('sort', 'asc');

    return this.http.get<PageResponse<EstudianteResponse>>(
      this.apiUrl,
      { params }
    );
  }

  buscarPorId(id: number): Observable<EstudianteResponse> {
    return this.http.get<EstudianteResponse>(`${this.apiUrl}/${id}`);
  }

  crear(request: EstudianteRequest): Observable<EstudianteResponse> {
    return this.http.post<EstudianteResponse>(this.apiUrl, request);
  }

  editar(
    id: number,
    request: EstudianteRequest
  ): Observable<EstudianteResponse> {
    return this.http.put<EstudianteResponse>(
      `${this.apiUrl}/${id}`,
      request
    );
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
