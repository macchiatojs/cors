import { Request, Response, Next, Context } from '@macchiatojs/kernel'

/**
 * @type 
 */
export interface CorsOptions { 
  expressify?: boolean,
  origins?: string|string[],
  allowMethods?: string|string[],
  allowHeaders?: string|string[],
  exposeHeaders?: string|string[],
  credentials?: boolean,
  maxAge?: number
}

// default options.
const defaultOptions: CorsOptions = {
  expressify: true,
  credentials: false,
  allowMethods: 'GET,HEAD,PATCH,PUT,POST,DELETE',
  maxAge: 0
}

/**
 * CORS middleware
 *
 * @param {Object} [options]
 *  - {String} origin `Access-Control-Allow-Origin`, default is request Origin header
 *  - {String|Array} allowMethods `Access-Control-Allow-Methods`, default is 'GET,HEAD,PATCH,PUT,POST,DELETE'
 *  - {String|Array} exposeHeaders `Access-Control-Expose-Headers`
 *  - {String|Array} allowHeaders `Access-Control-Allow-Headers`
 *  - {Number} maxAge `Access-Control-Max-Age` in seconds
 *  - {Boolean} credentials `Access-Control-Allow-Credentials`
 * @return {Function} cors middleware
 * @api public
 */
function cors (options?: CorsOptions) {
  options = { ...defaultOptions, ...options }
  // eslint-disable-next-line prefer-const
  let { expressify, credentials, origins, allowMethods, maxAge, allowHeaders, exposeHeaders } = options
  
  if (Array.isArray(exposeHeaders)) exposeHeaders = exposeHeaders.join(',')
  if (Array.isArray(allowMethods)) allowMethods = allowMethods.join(',')
  if (Array.isArray(allowHeaders)) allowHeaders = allowHeaders.join(',')
  credentials = !!credentials

  async function main (request: Request, response: Response, next: Next) {
    const requestOrigin = request.get('Origin')
    
    // early out when we don't find origin
    if (!requestOrigin || requestOrigin.length === 0) return await next()
    const origin = origins ?? requestOrigin 

    // Always set vary header
    response.vary('Origin')
    
    response.set('Access-Control-Allow-Origin', origin)
    if (credentials) response.set('Access-Control-Allow-Credentials', 'true')

    // simple cross-origin request, current request, and redirects
    if (request.method !== 'OPTIONS' || !request.get('Access-Control-Request-Method')) {
      if (exposeHeaders) response.set('Access-Control-Expose-Headers', exposeHeaders)
      return next()
    }
    
    // Preflight Request
    if (allowMethods) response.set('Access-Control-Allow-Methods', allowMethods)
    if (!allowHeaders) allowHeaders = request.get('Access-Control-Request-Headers')    
    if (allowHeaders) response.set('Access-Control-Allow-Headers', allowHeaders)    
    if (maxAge && maxAge > 0)  response.set('Access-Control-Max-Age', String(maxAge))
    response.send(204, '')
  }

  return (
    expressify 
      ? (request: Request, response: Response, next: Next) => main (request, response, next)
      : (context: Context, next: Next) => main (context.request, context.response, next)  
  )

}

export default cors
