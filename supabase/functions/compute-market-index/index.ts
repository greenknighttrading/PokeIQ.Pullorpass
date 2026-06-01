import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('authorization') || '';
    if (!supabaseKey || !authHeader.includes(supabaseKey)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const twelveKey = Deno.env.get('TWELVE_DATA_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];
    console.log(`[market-index] Computing for ${today}`);

    const { data: latestRow } = await supabase
      .from('market_snapshots')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    const snapshotDate = latestRow?.snapshot_date || today;

    const { data: aggData, error: aggError } = await supabase.rpc('get_market_totals', {});

    let totalValue = 0;
    let totalCards = 0;

    if (aggError) {
      console.log('[market-index] rpc not available, using manual aggregation');
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data: batch } = await supabase
          .from('market_snapshots')
          .select('price')
          .eq('snapshot_date', snapshotDate)
          .not('price', 'is', null)
          .gt('price', 0)
          .range(offset, offset + batchSize - 1);

        if (!batch || batch.length === 0) {
          hasMore = false;
        } else {
          for (const row of batch) {
            totalValue += Number(row.price) || 0;
            totalCards++;
          }
          offset += batchSize;
          if (batch.length < batchSize) hasMore = false;
        }
      }
    } else {
      totalValue = aggData?.total_value || 0;
      totalCards = aggData?.total_cards || 0;
    }

    console.log(`[market-index] Total value: $${totalValue.toFixed(2)}, Cards: ${totalCards}`);

    let sp500Close: number | null = null;
    if (twelveKey) {
      try {
        const spRes = await fetch(
          `https://api.twelvedata.com/time_series?symbol=SPY&interval=1day&outputsize=1&apikey=${twelveKey}`
        );
        const spData = await spRes.json();
        if (spData?.values?.length > 0) {
          sp500Close = parseFloat(spData.values[0].close);
          console.log(`[market-index] S&P 500 (SPY): $${sp500Close}`);
        } else {
          console.warn('[market-index] No S&P data returned:', spData);
        }
      } catch (e) {
        console.error('[market-index] S&P fetch error:', e);
      }
    } else {
      console.warn('[market-index] TWELVE_DATA_API_KEY not set, skipping S&P');
    }

    const { error: upsertError } = await supabase
      .from('market_index')
      .upsert(
        {
          date: snapshotDate,
          total_market_value: totalValue,
          total_cards: totalCards,
          sp500_close: sp500Close,
        },
        { onConflict: 'date' }
      );

    if (upsertError) {
      throw new Error(`Upsert failed: ${upsertError.message}`);
    }

    console.log(`[market-index] Done for ${snapshotDate}`);

    return new Response(
      JSON.stringify({ success: true, date: snapshotDate, total_market_value: totalValue, total_cards: totalCards, sp500_close: sp500Close }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[market-index] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
