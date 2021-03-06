import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {AuthenticationService} from '../../services/http/authentication.service';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {EMPTY, of} from 'rxjs';
import * as UserActions from './user.actions';
import {HttpErrorResponse} from '@angular/common/http';
import {TypedAction} from '@ngrx/store/src/models';
import {UserRegisterCmdDto} from '../../../shared/models/users/user-register-cmd.dto';
import {UserLoginCmdDto} from '../../../shared/models/users/user-login-cmd.dto';
import {Payload} from '../../../shared/redux/payload';
import {ConnectedUser} from '../../../shared/models/users/connected.user';
import {UserLogin} from '../../../shared/models/users/user-login';
import {UserService} from '../../services/http/user.service';

@Injectable()
export class UserEffects {

  logOut = createEffect(() => this.actions$.pipe(
    ofType(UserActions.ActionTypes.LOG_OUT),
    tap(action => {
      this.authenticationService.removeToken();
    })
  ), {dispatch: false});
  authenticateRememberedUser = createEffect(() => this.actions$.pipe(
    ofType(UserActions.ActionTypes.AUTHENTICATE_REMEMBERED_USER),
    switchMap((action: TypedAction<string>) => {
      if (this.authenticationService.token) {
        return this.authenticationService.connectByToken(this.authenticationService.token)
          .pipe(
            map(user => UserActions.successAuthenticateRegister(new Payload(new ConnectedUser({...user, rememberMe: true})))),
            catchError((err: HttpErrorResponse) => of(UserActions.errorAuthenticate(new Payload(err))))
          );
      }
      return EMPTY;
    }),
  ));
  authenticate$ = createEffect(() => this.actions$.pipe(
    ofType(UserActions.ActionTypes.AUTHENTICATE_USER),
    switchMap((action: Payload<UserLogin> & TypedAction<string>) => this.authenticationService
      .login(new UserLoginCmdDto(action.payload))
      .pipe(
        map(user =>  this.onConnectedUser(user, action.payload.rememberMe)),
        catchError((err: HttpErrorResponse) => of(UserActions.errorAuthenticate(new Payload(err))))
      ))
  ));
  register$ = createEffect(() => this.actions$.pipe(
    ofType(UserActions.ActionTypes.REGISTER_USER),
    switchMap((action: Payload<UserRegisterCmdDto> & TypedAction<string>) => this.authenticationService.register(action.payload).pipe(
      map(user =>  this.onConnectedUser(user, action.payload.rememberMe)),
      catchError((err: HttpErrorResponse) => of(UserActions.errorRegister(new Payload(err))))
    ))
  ));

  private onConnectedUser(user: ConnectedUser, rememberMe: boolean ): Payload<ConnectedUser> & TypedAction<UserActions.ActionTypes.SUCCESS_AUTHENTICATE_REGISTER_USER>{
    const connectedUser = new ConnectedUser({...user, rememberMe});
    if (connectedUser.rememberMe) {
      this.authenticationService.token = connectedUser.token;
    } else {
      this.authenticationService.removeToken();
    }
    return UserActions.successAuthenticateRegister(new Payload(connectedUser));
  }

  constructor(private authenticationService: AuthenticationService, private userService: UserService, private actions$: Actions) {
  }
}
