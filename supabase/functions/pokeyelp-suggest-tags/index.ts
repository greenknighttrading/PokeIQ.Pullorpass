import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const TAG_VOCAB = {
  'Emotional Tone': ['Nostalgic','Cozy','Peaceful','Exciting','Powerful','Dark','Chaotic','Joyful','Lonely','Adventurous','Mysterious','Relaxing','Hopeful','Intimidating','Happy','Angry'],
  'Aesthetic Style': ['Cute','Cool','Girly','Beautiful','Colorful','Minimalist','Detailed','Clean','Cinematic','Playful','Epic','Dreamlike','Modern','Soft','Aggressive'],
  'Action / Pose': ['Flying','Jumping','Sitting','Squatting','Running','Walking','Standing','Sleeping','Attacking','Floating','Swimming','Posing'],
  'Type / Species': ['Bug'],
  'Real-life Animal': ['Cat','Dog','Bird','Fish','Mouse','Rabbit','Bear','Fox','Lizard','Snake','Turtle','Frog','Horse','Dragon','Dinosaur','Insect','Bug','Crab','Octopus','Shark','Whale','Dolphin','Owl','Bat','Wolf','Lion','Tiger','Monkey','Elephant','Deer','Seal','Penguin','Ghost'],
  'Collector Appeal': ['Grail','Display piece','Binder card','Investment','Chase card','Sleeper','Underrated','Overrated','Personal favorite','Trade bait'],
  'Vibe / Cultural Energy': ['Main character energy','Childhood vibes','Rich collector energy','Anime opening vibes','Rainy day vibes','Sunday morning vibes','Cozy collector vibes','Casino energy'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ── Require authenticated user to prevent AI credit abuse ──
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const systemPrompt = `You are a Pokémon card taste expert. Suggest 7-9 BROAD, simple one-word tags that describe the vibe, art, and collector appeal.

IMPORTANT RULES:
- Use single common adjectives like: Cute, Cool, Girly, Beautiful, Colorful, Minimalist, Detailed, Clean, Cinematic, Playful, Epic, Dreamlike, Modern, Soft, Aggressive, Nostalgic, Cozy, Peaceful, Powerful, Dark, Chaotic, Joyful, Mysterious, Relaxing, Hopeful, Intimidating.
- Prefer broad, universally understood words over niche or compound phrases.
- Avoid overly specific phrases like "Main character energy" or "Anime opening vibes".
- Each tag should be 1 word (max 2). No descriptions, no card-specific wording.
- ALWAYS include exactly one Action / Pose tag describing what the Pokémon is doing in the art if visually identifiable (Flying, Jumping, Sitting, Squatting, Running, Walking, Standing, Sleeping, Attacking, Floating, Swimming, Posing). Skip only if truly not applicable (e.g. abstract art, item-only card).
- PRIORITIZE these tags when applicable:
  * Cute — if the Pokémon or art style is adorable, charming, or has a sweet/child-friendly feel.
  * Cool — if the Pokémon looks badass, sleek, stylish, or has a confident/intimidating aura.
  * Girly — if the card uses traditionally feminine colors (pink, pastel, purple, soft tones) or the Pokémon/art has a very cute, feminine, or lovely aesthetic.
  * Bug — if the Pokémon is a Bug-type or has strong insect/bug characteristics (e.g., Butterfree, Scyther, Caterpie).
  * Colorful — if the card art has many colors, a vivid palette, or is particularly bright and multicolored.
- ALWAYS include exactly one Real-life Animal tag naming the real-world animal the Pokémon most closely resembles (e.g. Pikachu → Mouse, Charizard → Dragon, Squirtle → Turtle, Vaporeon → Fish, Eevee → Fox, Meowth → Cat). Skip only if the Pokémon clearly resembles no real animal (e.g. abstract/object Pokémon like Voltorb, Magnemite).

Preferred vocabulary by category:
${vocabList}

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
            description: 'Suggest 7-9 evocative tags for this Pokémon card.',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  minItems: 7,
                  maxItems: 9,
                  items: {
                    type: 'object',
                    properties: {
                      tag: { type: 'string', description: 'Short tag, 1-3 words' },
                      category: { type: 'string', enum: ['Emotional Tone','Aesthetic Style','Action / Pose','Type / Species','Real-life Animal','Collector Appeal','Vibe / Cultural Energy','Custom'] },
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