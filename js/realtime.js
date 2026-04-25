/**
 * realtime.js
 * Supabase Realtime subscription for live match updates.
 * Subscribes to the `matches` table and updates cards without page reload.
 */

const RealtimeService = (() => {
  let channel = null;

  function subscribe() {
    const client = window.SupabaseClient;
    if (!client) {
      console.info('[Realtime] No Supabase client — skipping subscription.');
      return;
    }

    channel = client
      .channel('public:matches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        payload => handleChange(payload)
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          console.info('[Realtime] ✅ Subscribed to matches table');
          ToastService.show('🔴 Realtime conectado — atualizações ao vivo ativadas!', 'success');
        }
        if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] Channel error — trying to reconnect…');
        }
      });
  }

  function handleChange(payload) {
    const { eventType, new: newRow } = payload;
    if (!newRow) return;

    console.info(`[Realtime] ${eventType} → match ${newRow.id} | status: ${newRow.status} | ${newRow.score_home}:${newRow.score_away} m${newRow.minute}`);

    switch (eventType) {
      case 'UPDATE':
        // Update existing card in DOM
        CardsService.updateCardLive(
          String(newRow.id),
          newRow.score_home,
          newRow.score_away,
          newRow.minute,
          newRow.status,
        );

        // Refresh live count in badge
        App.refreshLiveCount();
        break;

      case 'INSERT':
        // If a brand-new match is inserted for today, reload today's tab
        App.reloadTodayIfNeeded(newRow);
        break;

      default:
        break;
    }
  }

  function unsubscribe() {
    if (channel) {
      channel.unsubscribe();
      channel = null;
      console.info('[Realtime] Unsubscribed.');
    }
  }

  return { subscribe, unsubscribe };
})();

window.RealtimeService = RealtimeService;
