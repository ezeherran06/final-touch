(() => {
  const url = window.FINAL_TOUCH_SUPABASE_URL;
  const key = window.FINAL_TOUCH_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("PEGAR_") || key.includes("PEGAR_") || !window.supabase) return;

  const db = window.supabase.createClient(url, key);
  db.from("final_touch_settings").select("data").eq("id", "main").maybeSingle()
    .then(({ data, error }) => {
      if (error) {
        console.error("No se pudieron cargar los ajustes públicos de Final Touch:", error.message);
        return;
      }
      if (!data || !data.data) return;
      Object.assign(S, data.data);
      Object.keys(P).forEach(name => {
        if (S.pr && S.pr[name]) P[name].p = S.pr[name];
      });
      (S.ex || []).forEach((price, index) => {
        if (Number.isFinite(Number(price)) && Number(price) >= 0 && X[index]) X[index][1] = Number(price);
      });
      R();
    });
})();
