import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API } from '../config/api.config';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  get<T = any>(path: string, params: Record<string, any> = {}) {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params)) if (v !== '' && v != null) p = p.set(k, String(v));
    return firstValueFrom(this.http.get<T>(API + path, { params: p }));
  }
  post<T = any>(path: string, body: any = {}) { return firstValueFrom(this.http.post<T>(API + path, body)); }
  put<T = any>(path: string, body: any = {}) { return firstValueFrom(this.http.put<T>(API + path, body)); }
  delete<T = any>(path: string) { return firstValueFrom(this.http.delete<T>(API + path)); }
  async upload(file: File, kind: 'image' | 'document' | 'proof' = 'image') {
    const max = kind === 'image' ? 2 : 5; // MB, same limits as the server
    if (file.size > max * 1024 * 1024) throw { error: { message: `File is too large. Maximum ${max} MB.` } };
    if (!(await this.auth.refresh())) throw { error: { message: 'Your session expired. Please log in again.' } }; // fresh token before sending a big body
    const fd = new FormData(); fd.append('file', file);
    return firstValueFrom(this.http.post<any>(`${API}/upload/${kind}`, fd));
  }
  // Registration happens before login, so the selfie upload has no session / refresh step
  selfie(file: Blob) { const fd = new FormData(); fd.append('file', file, 'selfie.jpg'); return firstValueFrom(this.http.post<any>(`${API}/upload/selfie`, fd)); }
  async download(path: string, filename: string) {
    const url = URL.createObjectURL(await this.blob(path)); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  blob(path: string) { return firstValueFrom(this.http.get(API + path, { responseType: 'blob' })); }
}
