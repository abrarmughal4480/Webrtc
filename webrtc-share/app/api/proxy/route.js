export async function GET(request) {
  const searchParams = new URLSearchParams(request.url?.split('?')[1]);  
  const url = searchParams.get('url');
  if (!url) return new Response(JSON.stringify({ error: 'Missing URL' }), { status: 400 });

  const response = await fetch(url);
  const contentType = response.headers.get('content-type') || 'image/png';
  const buffer = await response.arrayBuffer();

  return new Response(Buffer.from(buffer), {
    status: 200,
    headers: { 'Content-Type': contentType }
  });
}