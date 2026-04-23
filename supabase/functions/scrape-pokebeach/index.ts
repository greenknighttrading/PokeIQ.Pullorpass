const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Headline {
  title: string;
  url: string;
  excerpt: string;
  date: string;
  category: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Public news scraper — no auth required (returns only public PokeBeach headlines)

  try {
    console.log('[scrape-pokebeach] Fetching homepage...');
    const res = await fetch('https://www.pokebeach.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PokeIQ/1.0)',
        'Accept': 'text/html',
      },
    });

    if (!res.ok) {
      throw new Error(`PokeBeach returned ${res.status}`);
    }

    const html = await res.text();
    console.log(`[scrape-pokebeach] Got ${html.length} chars`);

    const headlines: Headline[] = [];

    const articlePattern = /<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
    let match;
    while ((match = articlePattern.exec(html)) !== null && headlines.length < 8) {
      const url = match[1];
      const title = match[2].trim().replace(/&#\d+;/g, (m) => { try { return String.fromCodePoint(parseInt(m.slice(2, -1))); } catch { return m; } }).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      if (title.length > 10) {
        let category = 'News';
        const titleLower = title.toLowerCase();
        if (titleLower.includes('deck') || titleLower.includes('tournament') || titleLower.includes('results')) category = 'Competitive';
        else if (titleLower.includes('reveal') || titleLower.includes('new card') || titleLower.includes('preview')) category = 'Reveals';
        else if (titleLower.includes('price') || titleLower.includes('market') || titleLower.includes('value')) category = 'Market';
        else if (titleLower.includes('product') || titleLower.includes('release') || titleLower.includes('set')) category = 'Products';

        headlines.push({ title, url, excerpt: '', date: new Date().toISOString().split('T')[0], category });
      }
    }

    if (headlines.length === 0) {
      const simplePattern = /<a[^>]*href="(https:\/\/www\.pokebeach\.com\/\d{4}\/\d{2}\/[^"]*)"[^>]*>([^<]{15,})<\/a>/gi;
      const seen = new Set<string>();
      while ((match = simplePattern.exec(html)) !== null && headlines.length < 8) {
        const url = match[1];
        const title = match[2].trim().replace(/&#8211;/g, '–').replace(/&#8217;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').replace(/&amp;/g, '&');
        if (!seen.has(url) && title.length > 15) {
          seen.add(url);
          headlines.push({ title, url, excerpt: '', date: new Date().toISOString().split('T')[0], category: 'News' });
        }
      }
    }

    console.log(`[scrape-pokebeach] Found ${headlines.length} headlines`);

    return new Response(JSON.stringify({ success: true, headlines }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[scrape-pokebeach] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error', headlines: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
