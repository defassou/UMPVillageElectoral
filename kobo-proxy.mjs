export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { token, server, formId } = body;

  if (!token || !server || !formId) {
    return Response.json({ error: 'Paramètres manquants: token, server, formId requis' }, { status: 400 });
  }

  // Validate server is a known KoboToolbox host to prevent SSRF
  const allowedHosts = [
    'https://kf.kobotoolbox.org',
    'https://kobo.humanitarianresponse.info',
  ];
  const isAllowed = allowedHosts.some(h => server === h) || /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(server);
  if (!isAllowed) {
    return Response.json({ error: 'Serveur non autorisé' }, { status: 400 });
  }

  const url = `${server}/api/v2/assets/${formId}/data/?format=json&limit=10000`;

  let apiResponse;
  try {
    apiResponse = await fetch(url, {
      headers: { 'Authorization': `Token ${token}` },
    });
  } catch (err) {
    return Response.json({ error: `Impossible de contacter le serveur KoboToolbox: ${err.message}` }, { status: 502 });
  }

  if (!apiResponse.ok) {
    return Response.json(
      { error: `Erreur API KoboToolbox: ${apiResponse.status}` },
      { status: apiResponse.status }
    );
  }

  const data = await apiResponse.json();
  return Response.json(data);
};
