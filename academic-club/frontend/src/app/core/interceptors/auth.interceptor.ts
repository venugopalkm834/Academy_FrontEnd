import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { API } from '../config/api.config';
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const withTok = (t: string | null) => (t && req.url.startsWith(API) ? req.clone({ setHeaders: { Authorization: `Bearer ${t}` }, withCredentials: true }) : req);
  return next(withTok(auth.token())).pipe(catchError((e) => {
    // expired access token: refresh once, then retry (auth endpoints excluded to avoid loops)
    if (e.status === 401 && auth.user() && !req.url.includes('/auth/'))
      return from(auth.refresh()).pipe(switchMap((ok) => (ok ? next(withTok(auth.token())) : throwError(() => e))));
    return throwError(() => e);
  }));
};
