export const auth0Config = {
  domain: 'YOUR_AUTH0_DOMAIN',
  clientId: 'YOUR_AUTH0_CLIENT_ID',
  audience: 'YOUR_AUTH0_API_IDENTIFIER',
  redirectUri: window.location.origin,
  scope: 'openid profile email'
}; 