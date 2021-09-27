import { Auth0ClientOptions } from '@auth0/auth0-spa-js';
import { HttpAuthenticatedConnectionImp } from '../http.auth.connection.imp';
import { HttpAuth0Token } from './http-auth0.token';

export class HttpAuth0Connection extends HttpAuthenticatedConnectionImp {
  constructor(host: string, auth0Config: Auth0ClientOptions) {
    super(host, new HttpAuth0Token(auth0Config), 'AUTH0_AUTH_TOKEN', 'AUTH0_USER_ID');
  }

  /** overide to check for auth0 callback and login from there */
  async isLogged() {
    if (!this.authentication) return false;

    const auth0TokenService = this.authentication as HttpAuth0Token;
    if (auth0TokenService.checkLoginCallback()) {
      const token = await auth0TokenService.parseLoginResult();

      if (token.jwt && token.userId) {
        this.tokenStore.authToken = 'Bearer ' + token.jwt;
        this.tokenStore.userId = token.userId;

        const isValid = await this.get('/user/isAuthorized');

        if (!isValid) {
          await this.logout();
          return false;
        }
        return true;
      } else {
        throw new Error('Token details not retrieved');
      }
    }

    return super.isLogged();
  }
}
