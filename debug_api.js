/**
 * debug_api.js
 * Teste manual da chave de API
 */
const key = '999d134e9c533f8befbfa34d20d204a1';
const lid = 71; // Série A
const season = 2024; // Testar 2024 que é garantido ter dados

console.log(`Testando API-Football para liga ${lid}, temporada ${season}...`);

fetch(`https://v3.football.api-sports.io/fixtures?league=${lid}&season=${season}`, {
  headers: { 'x-apisports-key': key }
})
.then(r => r.json())
.then(j => {
  console.log('Resposta completa:', JSON.stringify(j, null, 2));
  if (j.errors && Object.keys(j.errors).length > 0) {
    console.error('ERROS DA API:', j.errors);
  } else {
    console.log(`Sucesso: ${j.results} jogos encontrados.`);
  }
})
.catch(e => console.error('Falha na rede:', e));
