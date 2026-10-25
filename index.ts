
import decapCMSLoginScript from './decap-cms-login-script';

interface Env {
  CLIENT_ID: string;
  CLIENT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname, searchParams } = new URL(request.url);

    switch (pathname) {
      case '/auth':
        return redirectToAuthFlow(env);

      case '/callback':
        return await fetchAccessToken(searchParams, env);

      default:
        return new Response('Not found', { status: 404 });
    }
  },
};

async function fetchAccessToken(
  params: URLSearchParams,
  env: Env
): Promise<Response> {
  try {
    const code = params.get('code');

    if (!code) {
      return new Response('Missing OAuth code', { status: 400 });
    }

    const response = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'decap-cms-github-oauth-api-cloudflare',
          accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: env.CLIENT_ID,
          client_secret: env.CLIENT_SECRET,
          code,
        }),
      }
    );

    const data = await response.json() as {
      access_token?: string;
      error?: string;
    };

    if (!data.access_token) {
      console.error('GitHub OAuth error:', data.error ?? 'No access token');
      return new Response('GitHub OAuth authentication failed', {
        status: 401,
      });
    }

    return new Response(decapCMSLoginScript(data.access_token), {
      status: 201,
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
      },
    });
  } catch (err) {
    console.error(err);
    return new Response('OAuth server error', { status: 500 });
  }
}

function redirectToAuthFlow(env: Env): Response {
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', env.CLIENT_ID);
  url.searchParams.set('scope', 'repo,user');

  return Response.redirect(url.toString(), 302);
}
