CREATE OR REPLACE FUNCTION public.get_set_stats()
 RETURNS TABLE(set_name text, cards_count bigint, total_value numeric, median_7d numeric, median_30d numeric, median_90d numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    ms.set_name,
    COUNT(*) AS cards_count,
    SUM(ms.price) AS total_value,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ms.price_change_7d)
      FILTER (WHERE ms.price_change_7d IS NOT NULL) AS median_7d,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ms.price_change_30d)
      FILTER (WHERE ms.price_change_30d IS NOT NULL) AS median_30d,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ms.price_change_90d)
      FILTER (WHERE ms.price_change_90d IS NOT NULL) AS median_90d
  FROM market_snapshots ms
  WHERE ms.set_name IS NOT NULL 
    AND ms.price > 0
    AND ms.game = 'Pokemon'
    AND ms.set_name !~* '^misc|miscellaneous'
  GROUP BY ms.set_name
  ORDER BY total_value DESC;
$function$;