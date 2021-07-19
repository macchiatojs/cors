'use strict'

import assert from 'assert'
import Kernel, { Request, Response, Next } from '@macchiatojs/kernel'
import request from 'supertest'
import cors from '../src'

describe('cors.test.js', () => {
  describe('default options', () => {
    let app: Kernel
    
    beforeEach(() => {
      app = new Kernel()
      app.use(cors())
      app.use((request: Request, response: Response) => {
        response.body = { foo: 'bar' }
      })
    })

    // macchiato behave with headers
    it('should set `Access-Control-Allow-Origin` to empty string when request Origin header missing', async () => {
      request(app.start())
        .get('/')
        .expect('access-control-allow-origin', '')
        .expect(200, { foo: 'bar' })
    })

    it('should set `Access-Control-Allow-Origin` to request origin header', function(done) {
      request(app.start())
        .get('/')
        .set('Origin', 'http://koajs.com')
        .expect('Access-Control-Allow-Origin', 'http://koajs.com')
        .expect(200, { foo: 'bar' })
        .end(done)
    })

    it('should 204 on Preflight Request', async () => {
      await request(app.start())
        .options('/')
        .set('Origin', 'http://koajs.com')
        .set('Access-Control-Request-Method', 'PUT')
        .expect('Access-Control-Allow-Origin', 'http://koajs.com')
        .expect('Access-Control-Allow-Methods', 'GET,HEAD,PATCH,PUT,POST,DELETE')
        .expect(204)
    })

    it('should not Preflight Request if request missing Access-Control-Request-Method', function(done) {
      request(app.start())
        .options('/')
        .set('Origin', 'http://koajs.com')
        .expect(200, done)
    })

    it('should always set `Vary` to Origin', function(done) {
      request(app.start())
        .get('/')
        .set('Origin', 'http://koajs.com')
        .expect('Vary', 'Origin')
        .expect({ foo: 'bar' })
        .expect(200, done)
    })
  })

  describe('options.origin=*', () => {
    let app: Kernel
    
    beforeEach(() => {
      app = new Kernel()
      app.use(cors({ origins: '*' }))
      app.use((request: Request, response: Response) => {
        response.body = { foo: 'bar' }
      })
    })

    it('should always set `Access-Control-Allow-Origin` to *', async () => {
      await request(app.start())
        .get('/')
        .set('Origin', 'http://koajs.com')
        .expect('Access-Control-Allow-Origin', '*')
        .expect(200, { foo: 'bar' })
    })
  })

  describe('options.exposeHeaders', () => {
    let app: Kernel
    
    it('should Access-Control-Expose-Headers: `content-length`', function(done) {
      app = new Kernel()
      app.use(cors({ exposeHeaders: 'content-length' }))
      app.use((request: Request, response: Response) => {
        response.body = { foo: 'bar' }
      })

      request(app.start())
        .get('/')
        .set('Origin', 'http://koajs.com')
        .expect('Access-Control-Expose-Headers', 'content-length')
        .expect({ foo: 'bar' })
        .expect(200, done)
    })

    it('should work with array', function(done) {
      const app = new Kernel()
      app.use(cors({
        exposeHeaders: [ 'content-length', 'x-header' ],
      }))
      app.use((request: Request, response: Response) => {
        response.body = { foo: 'bar' }
      })

      request(app.start())
        .get('/')
        .set('Origin', 'http://koajs.com')
        .expect('Access-Control-Expose-Headers', 'content-length,x-header')
        .expect({ foo: 'bar' })
        .expect(200, done)
    })
  })

  describe('options.maxAge', () => {
    let app: Kernel
    
    beforeEach(() => {
      app = new Kernel()
      app.use(cors({ maxAge: 3600 }))
      app.use((request: Request, response: Response) => {
        response.body = { foo: 'bar' }
      })
    })

    it('should set maxAge with number', async () => {
      await request(app.start())
        .options('/')
        .set('Origin', 'http://koajs.com')
        .set('Access-Control-Request-Method', 'PUT')
        .expect('Access-Control-Max-Age', '3600')
        .expect(204)
    })

    it('should not set maxAge on simple request', async () => {
      const response = await request(app.start())
        .get('/')
        .set('Origin', 'http://koajs.com')
        .expect(200, { foo: 'bar' })

        assert(!response['Access-Control-Max-Age'])
    })
  })

  describe('options.credentials', () => {
    let app: Kernel
    
    beforeEach(() => {
      app = new Kernel()
      app.use(cors({ credentials: true}))
      app.use((request: Request, response: Response) => {
        response.body = { foo: 'bar' }
      })
    })

    it('should enable Access-Control-Allow-Credentials on Simple request', async () => {
      await request(app.start())
        .get('/')
        .set('Origin', 'http://koajs.com')
        .expect('Access-Control-Allow-Credentials', 'true')
        .expect({ foo: 'bar' })
        .expect(200)
    })

    it('should enable Access-Control-Allow-Credentials on Preflight request', () => {
      request(app.start())
        .options('/')
        .set('Origin', 'http://koajs.com')
        .set('Access-Control-Request-Method', 'DELETE')
        .expect('Access-Control-Allow-Credentials', 'true')
        .expect(204)
    })
  })

  describe('options.credentials unset', () => {
    let app: Kernel
    
    beforeEach(() => {
      app = new Kernel()
      app.use(cors())
      app.use((request: Request, response: Response) => {
        response.body = { foo: 'bar' }
      })
    })

    it('should disable Access-Control-Allow-Credentials on Simple request', async () => {
      const response = await request(app.start())
        .get('/')
        .set('Origin', 'http://koajs.com')
        .expect({ foo: 'bar' })
        .expect(200)

      const header = response.headers['access-control-allow-credentials']
      assert.strictEqual(header, undefined, 'Access-Control-Allow-Credentials must not be set.')
    })

    it('should disable Access-Control-Allow-Credentials on Preflight request', async () => {
      const response = await request(app.start())
        .options('/')
        .set('Origin', 'http://koajs.com')
        .set('Access-Control-Request-Method', 'DELETE')
        .expect(204)
      const header = response.headers['access-control-allow-credentials']
      assert.equal(header, undefined, 'Access-Control-Allow-Credentials must not be set.')
    })
  })

  describe('options.allowHeaders', () => {
    it('should work with allowHeaders is string', async () => {
      const app = new Kernel()
      app.use(cors({ allowHeaders: 'X-PINGOTHER' }))
      app.use((request: Request, response: Response) => {
        response.body = { foo: 'bar' }
      })

      await request(app.start())
        .options('/')
        .set('Origin', 'http://koajs.com')
        .set('Access-Control-Request-Method', 'PUT')
        .expect('Access-Control-Allow-Headers', 'X-PINGOTHER')
        .expect(204)
    })

    it('should work with allowHeaders is array', async () => {
      const app = new Kernel()
      app.use(cors({ allowHeaders: [ 'X-PINGOTHER' ] }))
      app.use((request: Request, response: Response) => {
        response.body = { foo: 'bar' }
      })

      await request(app.start())
        .options('/')
        .set('Origin', 'http://koajs.com')
        .set('Access-Control-Request-Method', 'PUT')
        .expect('Access-Control-Allow-Headers', 'X-PINGOTHER')
        .expect(204)
    })

    it('should set Access-Control-Allow-Headers to request access-control-request-headers header', async () => {
      const app = new Kernel()
      app.use(cors())
      app.use((request: Request, response: Response) => {
        response.body = { foo: 'bar' }
      })

      await request(app.start())
        .options('/')
        .set('Origin', 'http://koajs.com')
        .set('Access-Control-Request-Method', 'PUT')
        .set('access-control-request-headers', 'X-PINGOTHER')
        .expect('Access-Control-Allow-Headers', 'X-PINGOTHER')
        .expect(204)
    })
  })

  describe('options.allowMethods', () => {
    it('should work with allowMethods is array', async () => {
      const app = new Kernel()
      app.use(cors({
        allowMethods: [ 'GET', 'POST' ],
      }))
      app.use((request: Request, response: Response) => {
        response.body = { foo: 'bar' }
      })

      await request(app.start())
        .options('/')
        .set('Origin', 'http://koajs.com')
        .set('Access-Control-Request-Method', 'PUT')
        .expect('Access-Control-Allow-Methods', 'GET,POST')
        .expect(204)
    })

    it('should skip allowMethods', async () => {
      const app = new Kernel()
      app.use(cors({
        allowMethods: undefined,
      }))
      app.use((request: Request, response: Response) => {
        response.body = { foo: 'bar' }
      })

      await request(app.start())
        .options('/')
        .set('Origin', 'http://koajs.com')
        .set('Access-Control-Request-Method', 'PUT')
        .expect(204)
    })
  })

  describe('other middleware has been set `Vary` header to Accept-Encoding', () => {
    it('should append `Vary` header to Origin', async () => {
      const app = new Kernel()
  
      app.use((request: Request, response: Response, next: Next) => {
        response.set('Vary', 'Accept-Encoding')
        return next()
      })
  
      app.use(cors())
  
      app.use((request: Request, response: Response) => {
        response.body = { foo: 'bar' }
      })
  
      await request(app.start())
        .get('/')
        .set('Origin', 'http://koajs.com')
        .expect('Vary', 'Accept-Encoding, Origin')
        .expect({ foo: 'bar' })
        .expect(200)
    })
  })
})
