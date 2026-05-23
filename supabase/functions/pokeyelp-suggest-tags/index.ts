import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const TAG_VOCAB = {
  'Emotional Tone': ['Nostalgic','Cozy','Peaceful','Exciting','Powerful','Dark','Chaotic','Joyful','Lonely','Adventurous','Mysterious','Relaxing','Hopeful','Intimidating'],
  'Aesthetic Style': ['Cute','Beautiful','Colorful','Minimalist','Detailed','Clean','Cinematic','Playful','Epic','Dreamlike','Vintage','Modern','Soft','Aggressive'],
  'Collector Appeal': ['Grail','Display piece','Binder card','Investment','Chase card','Sleeper','Underrated','Overrated','Personal favorite','Trade bait'],
  'Vibe / Cultural Energy': ['Main character energy','Childhood vibes','Rich collector energy','Anime opening vibes','Rainy day vibes','Sunday morning vibes','Cozy collector vibes','Casino energy'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { name, set_name, rarity, price } = await req.json();
    if (!name) {
      return new Response(JSON.stringify({ error: 'name required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const vocabList = Object.entries(TAG_VOCAB)
      .map(([cat, tags]) => `${cat}: ${tags.join(', ')}`)
      .join('\n');

    const systemPrompt = `You are a Pokémon card taste expert. Given a card, suggest 6-8 tags that best describe its vibe, art, and collector appeal.

Pick mostly from this vocabulary (preferred):
${vocabList}

You may also invent up to 2 short, creative custom tags (max 3 words each) when they really fit.
Return ONLY via the suggest_tags function.`;

    const userPrompt = `Card: ${name}
Set: ${set_name ?? 'Unknown'}
Rarity: ${rarity ?? 'Unknown'}
Price: $${price ?? '?'}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'suggest_tags',
            description: 'Suggest 6-8 evocative tags for this Pokémon card.',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  minItems: 6,
                  maxItems: 8,
                  items: {
                    type: 'object',
                    properties: {
                      tag: { type: 'string', description: 'Short tag, 1-3 words' },
                      category: { type: 'string', enum: ['Emotional Tone','Aesthetic Style','Collector Appeal','Vibe / Cultural Energy','Custom'] },
                      reason: { type: 'string', description: 'One short phrase (max 8 words) why it fits' },
                    },
                    required: ['tag','category','reason'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['suggestions'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'suggest_tags' } },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit, try again shortly' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await res.text();
      console.error('AI error', res.status, t);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : { suggestions: [] };

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});