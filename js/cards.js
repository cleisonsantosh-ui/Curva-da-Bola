/**
 * cards.js
 * Game card HTML factory.
 * Supports states: LIVE | SCHEDULED | FINISHED
 */

const CardsService = (() => {

  // Format kickoff time to local HH:MM
  function formatTime(isoStr) {
    if (!isoStr) return '--:--';
    try {
      return new Date(isoStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch { return '--:--'; }
  }

  // League display info
  function getLeagueInfo(leagueId) {
    const names  = window.FUT_CONFIG.LEAGUE_NAMES || {};
    const colors = window.FUT_CONFIG.LEAGUE_COLORS || {};
    return {
      name:  names[leagueId]  || 'Liga Brasil',
      color: colors[leagueId] || '#009c3b', // Default green
    };
  }

  // Clean team name
  function cleanName(name) {
    if (!name) return 'Time';
    // Preserve sub-team info (U20, U17) and format as "Sub-XX"
    return name.replace(/\s+U(\d+)\b/gi, ' Sub-$1')
               .replace(/\(.*\)/g, '')
               .trim();
  }

  // Get local mapping if exists
  function getLocalCrestUrl(name) {
    if (!window.CREST_MAP) return null;
    const clean = name.replace(/\s+/g, '_').replace(/[^\w]/g, '').toLowerCase();
    
    // Tenta match direto pelo slug (flamengo_u20 -> flamengo)
    const baseSlug = clean.replace(/_u\d+$/, '').replace(/_sub\d+$/, '');
    const filename = window.CREST_MAP[baseSlug] || window.CREST_MAP[clean];
    
    if (filename) return `assets/escudos/${filename}`;
    return null;
  }

  // Team crest HTML
  function crestHtml(team, side) {
    const cName = cleanName(team?.name);
    const initial = cName.charAt(0).toUpperCase();

    // Prioridade 1: Escudo Local de Alta Qualidade
    const localUrl = getLocalCrestUrl(team?.name || '');
    
    // Prioridade 2: Logo da API (se não for o placeholder feio de câmera)
    const apiLogo = team?.logo && team.logo.includes('http') ? team.logo : null;

    const finalLogo = localUrl || apiLogo;

    if (finalLogo) {
      return `
        <div class="team-crest" id="crest-${side}-${team.id || 'x'}">
          <img src="${finalLogo}" alt="Escudo ${team.name}"
               loading="lazy"
               onerror="this.parentElement.innerHTML='<div class=\\'crest-fallback-circle\\'>${initial}</div>'"
          />
        </div>`;
    }
    return `<div class="team-crest"><div class="crest-fallback-circle">${initial}</div></div>`;
  }

  // Status badge HTML
  function statusBadgeHtml(match) {
    switch (match.status) {
      case 'LIVE':
        return `<span class="card-status status-live">
                  <span class="status-icon">🔴</span> AO VIVO
                </span>`;
      case 'FINISHED':
        return `<span class="card-status status-finished">⏱ Encerrado</span>`;
      default:
        return `<span class="card-status status-scheduled">📅 Agendado</span>`;
    }
  }

  // Center area: score (live/finished) or VS (scheduled)
  function centerHtml(match) {
    if (match.status === 'LIVE' || match.status === 'FINISHED') {
      const home = match.score_home ?? 0;
      const away = match.score_away ?? 0;
      const minuteHtml = match.status === 'LIVE' && match.minute !== null
        ? `<span class="match-time live-time">
             <span class="minute-badge">⏱ ${match.minute}'</span>
           </span>`
        : `<span class="match-time">Encerrado</span>`;

      return `
        <div class="match-center">
          <div class="score-display" id="score-${match.id}">
            <span class="score-digit" id="score-home-${match.id}">${home}</span>
            <span class="score-sep">:</span>
            <span class="score-digit" id="score-away-${match.id}">${away}</span>
          </div>
          ${minuteHtml}
        </div>`;
    }

    return `
      <div class="match-center">
        <div class="vs-display">VS</div>
        <span class="match-time">${formatTime(match.kickoff)}</span>
      </div>`;
  }

  // Build full card HTML
  function buildCardHtml(match, index = 0) {
    const stateClass = {
      LIVE: 'card-live',
      SCHEDULED: 'card-scheduled',
      FINISHED: 'card-finished',
    }[match.status] || 'card-scheduled';

    const league = getLeagueInfo(match.league_id);
    const kickoffFormatted = formatTime(match.kickoff);
    const realtimeBadge = window.SupabaseService?.isConnected()
      ? `<span class="realtime-badge"><span class="realtime-dot"></span> Realtime</span>`
      : '';

    return `
      <article class="game-card ${stateClass}"
               id="card-${match.id}"
               data-match-id="${match.id}"
               data-status="${match.status}"
               style="--stagger: ${index * 60}ms"
               role="listitem">

        <!-- Accent bar -->
        <div class="card-accent-bar"></div>

        <!-- Header -->
        <header class="card-header">
          <span class="card-league">
            <span class="league-dot" style="background:${league.color}"></span>
            ${league.name}
          </span>
          ${statusBadgeHtml(match)}
        </header>

        <!-- Match body: home – center – away -->
        <div class="match-body">
          <!-- Home Team -->
          <div class="team-block team-home">
            ${crestHtml(match.home_team, 'home')}
            <span class="team-name">${cleanName(match.home_team?.name)}</span>
          </div>

          <!-- Center -->
          ${centerHtml(match)}

          <!-- Away Team -->
          <div class="team-block team-away">
            ${crestHtml(match.away_team, 'away')}
            <span class="team-name">${cleanName(match.away_team?.name)}</span>
          </div>
        </div>

        <!-- Footer -->
        <footer class="card-footer">
          <span class="card-venue">
            <span>📍</span>
            <span class="venue-text" title="${match.venue || 'Estádio'}">${match.venue || 'Estádio não informado'}</span>
          </span>
          <span class="card-kickoff">🕐 ${kickoffFormatted} ${realtimeBadge}</span>
        </footer>
      </article>`;
  }

  // Update an existing card's live data (score + minute) without full re-render
  function updateCardLive(matchId, scoreHome, scoreAway, minute, status) {
    const card = document.getElementById(`card-${matchId}`);
    if (!card) return;

    // Remove old state classes, add new
    card.classList.remove('card-live', 'card-scheduled', 'card-finished');
    const newClass = { LIVE: 'card-live', SCHEDULED: 'card-scheduled', FINISHED: 'card-finished' }[status] || 'card-scheduled';
    card.classList.add(newClass);
    card.setAttribute('data-status', status);

    // Score digits
    const homeEl  = document.getElementById(`score-home-${matchId}`);
    const awayEl  = document.getElementById(`score-away-${matchId}`);
    const scoreEl = document.getElementById(`score-${matchId}`);

    if (homeEl && awayEl) {
      const prevHome = homeEl.textContent;
      const prevAway = awayEl.textContent;
      homeEl.textContent = scoreHome ?? 0;
      awayEl.textContent = scoreAway ?? 0;
      if (prevHome !== String(scoreHome) || prevAway !== String(scoreAway)) {
        scoreEl?.classList.add('score-updated');
        setTimeout(() => scoreEl?.classList.remove('score-updated'), 900);
      }
    }

    // Minute
    const minuteWrapper = card.querySelector('.minute-badge');
    if (minuteWrapper && minute !== null) {
      minuteWrapper.textContent = `⏱ ${minute}'`;
    }
  }

  // Render a list of matches into a container efficiently
  function renderMatches(containerId, matches) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove skeletons only if there are matches to show
    if (matches && matches.length > 0) {
      container.querySelectorAll('.skeleton').forEach(el => el.remove());
      const htmlString = matches.map((m, i) => buildCardHtml(m, i)).join('');
      container.innerHTML = htmlString;
    } else {
      // If no matches, clear but don't remove if there's an empty state handled elsewhere
      container.innerHTML = '';
    }
  }

  return { buildCardHtml, renderMatches, updateCardLive, formatTime };
})();

window.CardsService = CardsService;
