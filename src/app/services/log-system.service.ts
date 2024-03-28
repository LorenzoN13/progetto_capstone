import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { IutenteAuth } from '../Modules/iutente-auth';
import { Iutente } from '../Modules/iutente';
import { Iregister } from '../Modules/iregister';
import { Ilogin } from '../Modules/ilogin';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root'
})
export class LogSystemService {

  authorized:BehaviorSubject<IutenteAuth|null>=new BehaviorSubject<IutenteAuth|null>(null);
  utente$=this.authorized.asObservable();
  booleanUtente$=this.utente$.pipe(map(utente=>!!utente))
  jwt:JwtHelperService=new JwtHelperService();

  APIUser:string=`${environment.API}/utenti`
  APIRegister:string=`${environment.API}/auth/register`;
  APILogin:string=`${environment.API}/auth/login`;


  constructor(
    private http:HttpClient,
    private router: Router
  ){
    this.logged();
  }

  register(utente:Iregister):Observable<IutenteAuth>{
    return this.http.post<IutenteAuth>(this.APIRegister,utente)
  }

  updateUser(utente:IutenteAuth):Observable<Iutente>{
    this.authorized.next(utente);
    return this.http.put<Iutente>(`${this.APIUser}/${utente.obj.id}`, utente.obj)
  }

  login(utente:Ilogin):Observable<IutenteAuth>{
    return this.http.post<IutenteAuth>(this.APILogin,utente)
    .pipe(tap(data=>{
      this.authorized.next(data);
      this.autoLogOut(data.accessToken)
      localStorage.setItem('utente', JSON.stringify(data))
    }))
  }

  logged(){
    let localLogin:string|null=localStorage.getItem('utente');
    if (!localLogin) return;

    let oldAuth:IutenteAuth=JSON.parse(localLogin);
    if(this.jwt.isTokenExpired(oldAuth.accessToken)) return

    this.autoLogOut(oldAuth.accessToken);
    this.authorized.next(oldAuth);
  }

  logOut(){
    localStorage.removeItem('utente');
    localStorage.removeItem('ruolo');
    this.authorized.next(null);
    this.router.navigate(['/home']);
  }

  deleteAccount(id:number):Observable<Iutente>{
    return this.http.delete<Iutente>(`${this.APIUser}/${id}`);
  }

  autoLogOut(token: string): void {
    const expiringDate = this.jwt.getTokenExpirationDate(token) as Date;

    if (expiringDate) { // Verifica che expiringDate non sia null o undefined
      const remainingTimeMs = expiringDate.getTime() - new Date().getTime();

      if (remainingTimeMs > 0) {
        setTimeout(() => {
          this.logOut();
        }, remainingTimeMs);

      } else {
        // Il token è già scaduto, esegui il logout immediatamente
        this.logOut();
      }
    } 
  }
}
