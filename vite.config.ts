import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { Agent as HttpAgent, request as httpRequest } from 'node:http';
import { Agent as HttpsAgent, request as httpsRequest } from 'node:https';
import { imageEditEndpoint } from './src/paint/api-config.js';

/** Local streaming relay avoids requiring CORS support from image providers. */
function imageEditRelay(): Plugin {
  return {
    name: 'image-edit-relay',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, 'PAINT_');
      const proxy = process.env.PAINT_HTTP_PROXY ?? env.PAINT_HTTP_PROXY;
      const proxyEnv = proxy ? { HTTP_PROXY: proxy, HTTPS_PROXY: proxy, NO_PROXY: 'localhost,127.0.0.1,::1' } : undefined;
      const httpAgent = new HttpAgent({ proxyEnv });
      const httpsAgent = new HttpsAgent({ proxyEnv });
      server.httpServer?.once('close', () => { httpAgent.destroy(); httpsAgent.destroy(); });
      server.middlewares.use('/api/image-edit-relay', (req, res) => {
        if (req.method !== 'POST' || req.headers.origin !== 'http://' + req.headers.host) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }
        let target: URL;
        try {
          target = new URL(imageEditEndpoint(String(req.headers['x-image-endpoint'] ?? '')));
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: { message: '接口地址无效。' } }));
          return;
        }
        const upstream = (target.protocol === 'https:' ? httpsRequest : httpRequest)(target, {
          method: 'POST',
          agent: target.protocol === 'https:' ? httpsAgent : httpAgent,
          headers: {
            authorization: req.headers.authorization ?? '',
            'content-type': req.headers['content-type'] ?? 'application/octet-stream',
            ...(req.headers['content-length'] ? { 'content-length': req.headers['content-length'] } : {}),
          },
        }, (reply) => {
          res.statusCode = reply.statusCode ?? 502;
          res.setHeader('Content-Type', reply.headers['content-type'] ?? 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          reply.on('error', () => res.destroy());
          reply.pipe(res);
        });
        upstream.setTimeout(300_000, () => upstream.destroy(new Error('timeout')));
        upstream.on('error', (error: NodeJS.ErrnoException) => {
          if (res.headersSent) { res.destroy(); return; }
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          const code = error.code ?? (error.message === 'timeout' ? 'TIMEOUT' : 'NETWORK_ERROR');
          const route = proxy ? '本机代理' : '直连';
          res.end(JSON.stringify({ error: { message: `连接图片接口失败（${route}，${code}），请检查网络或代理服务。` } }));
        });
        req.on('aborted', () => upstream.destroy());
        res.on('close', () => { if (!res.writableFinished) upstream.destroy(); });
        req.pipe(upstream);
      });
    },
  };
}

/** Local adapter for the optional upstream sign-in flow. */
function localSignInPlugin(): Plugin {
  return {
    name: 'ai-paint-local-sign-in',
    apply: 'serve',
    configureServer(server) {
      // Run the Vercel function locally so "Sign in with OpenAI" works under `vite`.
      server.middlewares.use('/api/codex-images', (req, res) => {
        void server.ssrLoadModule('/api/codex-images.ts').then((m) => (m.default as (q: typeof req, r: typeof res) => Promise<void>)(req, res)).catch((e) => {
          res.statusCode = 500;
          res.end(String(e));
        });
      });
    },
  };
}

/** Inline the landing stylesheet into index.html so the first paint needs no extra request. */
function inlineLandingCss(): Plugin {
  return {
    name: 'ai-paint-inline-landing-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_o, bundle) {
      const html = bundle['index.html'];
      if (!html || html.type !== 'asset' || typeof html.source !== 'string') return;
      const m = html.source.match(/<link rel="stylesheet"[^>]*href="(\/assets\/landing-[^"]+\.css)"[^>]*>/);
      if (!m) return;
      const key = m[1].slice(1);
      const css = bundle[key];
      if (!css || css.type !== 'asset') return;
      html.source = html.source.replace(m[0], `<style>${css.source as string}</style>`);
      delete bundle[key];
    },
  };
}

export default defineConfig({
  plugins: [react(), localSignInPlugin(), imageEditRelay(), inlineLandingCss()],
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        landing: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app/index.html'),
      },
    },
  },
});
