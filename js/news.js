/**
 * news.js
 * Fetches and renders football news from GE RSS.
 */

const NewsService = (() => {
  const RSS_URL = 'https://ge.globo.com/rss/ge/';
  const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;

  async function fetchNews() {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data.status === 'ok') {
        return data.items.slice(0, 6); // Top 6 news
      }
      return [];
    } catch (e) {
      console.error('[NewsService] Error fetching news:', e);
      return [];
    }
  }

  function buildNewsCard(item) {
    const date = new Date(item.pubDate).toLocaleDateString('pt-BR');
    // Extract a cleaner image if available (some RSS items have specific enclosures)
    const thumbnail = item.thumbnail || item.enclosure?.link || 'assets/logo.png';

    const title = item.title || 'Novidade no Futebol';
    const desc = (item.description || '').replace(/<[^>]*>?/gm, '').slice(0, 100);

    return `
      <a href="${item.link}" target="_blank" class="news-card" rel="noopener">
        <div class="news-thumb">
          <img src="${thumbnail}" alt="${title}" loading="lazy" />
        </div>
        <div class="news-content">
          <span class="news-date">${date}</span>
          <h3 class="news-title">${title}</h3>
          <p class="news-desc">${desc}${desc.length >= 100 ? '...' : ''}</p>
        </div>
      </a>
    `;
  }

  async function renderNews(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const news = await fetchNews();
    if (news.length > 0) {
      container.innerHTML = news.map(item => buildNewsCard(item)).join('');
    } else {
      container.innerHTML = '<p class="empty-news">Não foi possível carregar as notícias agora.</p>';
    }
  }

  return { renderNews };
})();

window.NewsService = NewsService;
