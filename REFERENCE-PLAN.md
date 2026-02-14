# 🏛️ ATLAS v2 — SALA DE SITUACIÓN GLOBAL (100% DATOS EN VIVO)
## Plan Ultra Detallado — Zero Hardcoded Data

---

## 🎯 PERFIL DEL USUARIO Y TEMAS DE INTERÉS

Persona interesada en geopolítica, pro-Trump, de derecha. Los temas que le importan:

### Tier 1 — Lo mira SIEMPRE
- Posts de Trump en Truth Social (el feed #1 de la pantalla)
- Mercados: petróleo, oro, Bitcoin, S&P500, DXY
- Conflictos activos mundiales (especialmente Medio Oriente, China)
- Frontera sur de EEUU: encounters, deportaciones, fentanyl seizures
- Amenaza china: militar, comercial, Taiwan
- Irán: programa nuclear, proxies
- Israel: situación en Gaza, amenazas regionales

### Tier 2 — Lo mira a diario
- BRICS vs Occidente: desdolarización, alianzas
- NATO: burden sharing, gasto militar aliados
- Rusia-Ucrania: negociaciones de paz, situación militar
- Deuda nacional de EEUU / DOGE savings
- Tariffs y guerra comercial
- Latinoamérica: gobiernos de izquierda, Venezuela, narcotráfico
- Precios de commodities (trigo, soja, gas) — impacto geopolítico

### Tier 3 — Relevante contextualmente
- Elecciones mundiales próximas
- Terrorismo global
- Pandemias / bioamenazas
- Ciberataques estatales
- Desastres naturales activos
- Shipping lanes (Suez, Hormuz, Malacca)

---

## 📺 LAYOUT PARA TV 65"+ (1920x1080 mínimo, ideal 4K)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 🔴 ATLAS GLOBAL SITUATION ROOM    LIVE●  UTC 14:32:07  BsAs 11:32  DEFCON[3] 🔔│
│  Conflicts: 23 active  │ Critical: 3 │ Border: 258/day │ BTC $97.2K │ Oil $72  │
├────────────────┬─────────────────────────────────────┬───────────────────────────┤
│                │                                     │                           │
│   TRUMP FEED   │          WORLD MAP                  │    MARKETS & ECONOMIC     │
│   + LEADER     │                                     │    DASHBOARD              │
│   STATEMENTS   │   Conflicts + connections +          │                           │
│                │   news heatmap + military            │    Oil, Gold, BTC, VIX    │
│   Truth Social │                                     │    DXY, Yields, S&P       │
│   + X feeds    │                                     │    Commodities            │
│   + Official   │                                     │    Forex                  │
│     RSS        │                                     │    US Debt Clock          │
│                │                                     │    Border Stats           │
│                │                                     │                           │
├────────────────┼──────────────────┬──────────────────┼───────────────────────────┤
│                │                  │                  │                           │
│  CONFLICT      │   BREAKING NEWS  │  DIPLOMATIC &    │   AI INTELLIGENCE         │
│  DETAIL /      │   WIRE           │  GEOPOLITICAL    │   BRIEF                   │
│  SELECTED      │                  │  CALENDAR        │                           │
│  ENTITY        │   Reuters, AP,   │                  │   Auto-generated          │
│                │   GDELT, Fox,    │  G7, NATO, UN,   │   threat assessment       │
│  (click from   │   conservative   │  BRICS, OPEC,    │   + watchlist             │
│   map or list) │   media feeds    │  Elections       │   + recommendations       │
│                │                  │                  │                           │
├────────────────┴──────────────────┴──────────────────┴───────────────────────────┤
│  ▶ SCROLLING TICKER — Breaking headlines + Trump latest + market movers          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📡 CADA MÓDULO CON SU API EXACTA

---

### MÓDULO 1: TOP STATUS BAR

| Elemento | API / Fuente | Endpoint | Refresh |
|----------|-------------|----------|---------|
| UTC Clock | `new Date()` JS nativo | - | 1s |
| Buenos Aires Clock | JS `Intl.DateTimeFormat` | - | 1s |
| Active Conflicts count | ACLED API | `https://api.acleddata.com/acled/read?limit=0&event_date=>={30_days_ago}` | 1h |
| Critical count | ACLED filtered | severity filter | 1h |
| Border encounters/day | CBP Data Portal | `https://www.cbp.gov/newsroom/stats/nationwide-encounters` (scrape JSON) | 24h |
| BTC price | CoinGecko | `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true` | 2min |
| Oil WTI | OilPriceAPI | `https://api.oilpriceapi.com/v1/prices/latest?by_code=WTI_USD` | 5min |
| Threat Level | Calculado: conflicts critical + GDELT tone + nuclear events | Composite score | 15min |

---

### MÓDULO 2: TRUMP FEED + LEADER STATEMENTS (Panel izquierdo superior)

**EL panel más importante. Primer lugar donde mira el ojo.**

#### Sub-panel A: TRUMP TRUTH SOCIAL FEED

| Fuente | API | Costo | Detalles |
|--------|-----|-------|----------|
| TrumpssTruth.org RSS | `https://www.trumpstruth.org/feed` | GRATIS | Archivo completo, RSS feed, filtrable por fecha |
| ScrapeCreators API | `https://api.scrapecreators.com/v1/truthsocial/user/posts?user_id=107780257626128497` | $0.01/call, 100 free | JSON estructurado, real-time |
| FollowTrumpsTruth | `https://www.followtrumpstruth.com/` | Freemium | Webhooks, categorización AI, push notifications |
| Apify Truth Social Scraper | Apify marketplace | Pay per use | WebSocket real-time stream |

**Recomendación**: Usar `trumpstruth.org/feed` (gratis, RSS) como principal + ScrapeCreators API como backup para latencia más baja.

**Visual**: Card grande con foto de perfil, texto del post, timestamp, engagement metrics.

#### Sub-panel B: LEADER STATEMENTS FEED

**Feeds RSS oficiales (100% gratis, alta confiabilidad):**

| Líder/Entidad | RSS URL | 
|---------------|---------|
| White House | `https://www.whitehouse.gov/feed/` |
| State Department | `https://www.state.gov/rss-feeds/` → press releases |
| DoD / Pentagon | `https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945` |
| CIA (public) | `https://www.cia.gov/rss` |
| FBI | `https://www.fbi.gov/feeds/` |
| Treasury | `https://home.treasury.gov/system/files/RSS/press-releases.xml` |
| CBP (border) | `https://www.cbp.gov/rss/feeds` |
| Kremlin (EN) | `http://en.kremlin.ru/rss` |
| MID Russia (EN) | RSS via TASS English |
| Xinhua (EN) | `http://www.xinhuanet.com/english/rss/worldrss.xml` |
| 10 Downing St | `https://www.gov.uk/government/organisations/prime-ministers-office-10-downing-street.atom` |
| Elysée (FR) | `https://www.elysee.fr/flux-rss` |
| EU Council | `https://www.consilium.europa.eu/en/rss/` |
| European Commission | `https://ec.europa.eu/commission/presscorner/home/en/rss` |
| NATO | `https://www.nato.int/cps/en/natohq/news.rss` |
| UN News | `https://news.un.org/feed/subscribe/en/news/all/rss.xml` |
| UN Security Council | `https://www.un.org/securitycouncil/content/rss-feeds` |
| IAEA | `https://www.iaea.org/feeds/topnews` |
| WHO | `https://www.who.int/rss-feeds/news-english.xml` |
| IMF | `https://www.imf.org/en/News/RSS` |
| Israel PMO | `https://www.gov.il/en/api/PublicationApi/Index` |
| IDF Spokesperson | X feed via RSSHub o Nitter |
| Zelensky | Telegram channel `@V_Zelenskiy_official` via Telegram Bot API |
| Erdogan/Anadolu | `https://www.aa.com.tr/en/rss/default?cat=world` |
| KCNA (N.Korea) | `https://kcnawatch.org/rss/` |
| Al Arabiya (EN) | `https://english.alarabiya.net/tools/rss` |

**X/Twitter feeds para líderes (via RSSHub self-hosted o proxies):**

| Cuenta | Handle | Relevancia |
|--------|--------|------------|
| Donald Trump | @realDonaldTrump | POTUS - priority #1 |
| JD Vance | @JDVance | VP |
| Elon Musk | @elonmusk | DOGE, X, SpaceX, geopolitics |
| Marco Rubio | @marcorubio | Sec State |
| Mike Waltz | @MikeWaltzFL | NSA |
| Elise Stefanik | @EliseStefanik | UN Ambassador |
| Netanyahu | @netanyahu | Israel PM |
| Zelensky | @ZelenskyyUa | Ukraine |
| Macron | @EmmanuelMacron | France |
| Kaja Kallas | @kaaborz | EU Foreign Affairs |
| Ursula von der Leyen | @vaborz | EU Commission |
| Mark Rutte | @MinPres | NATO SecGen |
| Tucker Carlson | @TuckerCarlson | Conservative media |
| Ben Shapiro | @baborz | Conservative commentary |
| Vivek Ramaswamy | @VivekGRamaswamy | DOGE |
| IDF | @IDF | Israel military |
| CENTCOM | @ABORZ | US Central Command |

**Método para obtener X feeds:**
1. **RSSHub** (open source, self-hosteable): `https://rsshub.app/twitter/user/realDonaldTrump` 
2. **Nitter instances** (público, gratis, inestable)
3. **X API v2** (paid: $100/mo Basic, $5000/mo Pro) — para máxima confiabilidad
4. **SocialData.tools API** — scraping service, pay per call
5. **GDELT DOC API** — buscar menciones de la persona en noticias globales (gratis)

**Formato visual del feed:**
```
┌──────────────────────────────────┐
│ 🇺🇸 TRUTH SOCIAL         3m ago │
│ @realDonaldTrump                 │
│ ─────────────────────────────── │
│ "Record Stock Market, and        │
│ National Security, driven by     │
│ our Great TARIFFS. I am          │
│ predicting 100,000 on the DOW    │
│ by the end of my Term."          │
│                                  │
│ 🏷️ Economy | Markets             │
│ ♥ 89.2K  🔄 23.1K               │
├──────────────────────────────────┤
│ 🇮🇱 @netanyahu          18m ago │
│ X/Twitter                        │
│ ─────────────────────────────── │
│ "Israel will continue to act     │
│ with full force against all      │
│ threats on every front."         │
├──────────────────────────────────┤
│ 🇺🇸 Pentagon Press      45m ago │
│ DoD RSS                          │
│ ─────────────────────────────── │
│ "CENTCOM confirms strike on      │
│ Houthi missile facilities..."    │
├──────────────────────────────────┤
│ 🔔 @elonmusk            1h ago  │
│ X/Twitter                        │
│ ─────────────────────────────── │
│ "DOGE has now saved $172B in     │
│ taxpayer money. Ahead of         │
│ schedule."                       │
└──────────────────────────────────┘
```

**Filtros:**
- Category: All | POTUS Only | Military | Israel | Europe | Asia
- Source: All | Truth Social | X | Official RSS
- Priority: All | Critical Only

---

### MÓDULO 3: MAPA MUNDIAL (Panel central)

**Todo con APIs reales, nada hardcoded:**

#### CAPAS DEL MAPA (todas toggleables con leyenda)

| # | Capa | Fuente API | Endpoint | Refresh | Gratis |
|---|------|-----------|----------|---------|--------|
| 0 | Base map tiles | CartoDB Dark Matter | `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` | Static | ✅ |
| 1 | **🔴 REAL-TIME NEWS (la capa principal)** | **GDELT GEO 2.0 API** | Ver detalle abajo | **15 min** | **✅** |
| 2 | Conflict zones (persistent) | ACLED API | `https://api.acleddata.com/acled/read?event_date=>={date}&limit=5000` | 1h | ✅ (registro) |
| 3 | Connection lines (AI-generated) | Anthropic Claude API | Generadas dinámicamente | 4h | 💰 |
| 4 | Earthquakes | USGS | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson` | 5min | ✅ |
| 5 | Shipping lanes (chokepoints) | MarineTraffic API | Paid | 1h | 💰 |
| 6 | Military bases | OpenStreetMap Overpass | `amenity=military` | Static | ✅ |
| 7 | Nuclear facilities | IAEA PRIS | CSV/static | Rare | ✅ |

---

#### 🔴 CAPA 1: NOTICIAS EN TIEMPO REAL EN EL MAPA (GDELT GEO 2.0)

**Esta es LA feature killer. Cada noticia es un punto clickeable en el mapa.**

**Cómo funciona GDELT GEO 2.0 API:**
- GDELT monitorea noticias de TODO el mundo en 65 idiomas
- Cada artículo se geolocaliza automáticamente (extrae locaciones mencionadas)
- Devuelve GeoJSON con coordenadas + metadata del artículo
- Se actualiza cada 15 minutos
- 100% GRATIS, sin API key, sin registro

**Endpoints para múltiples feeds de noticias en el mapa:**

```
// Feed 1: TODAS las noticias geolocalizadas (últimos 15-60 min)
// GeoJSON descargable, rolling window última hora
https://gdeltproject.org/data/lookups/gkg_geojson.json
→ Actualiza cada 15 min, contiene TODOS los artículos geolocalizados de la última hora

// Feed 2: Noticias sobre CONFLICTOS geolocalizadas
https://api.gdeltproject.org/api/v2/geo/geo?query=conflict%20OR%20war%20OR%20military%20OR%20attack%20OR%20strike&format=GeoJSON&timespan=60m&maxpoints=500

// Feed 3: Noticias sobre TERRORISMO
https://api.gdeltproject.org/api/v2/geo/geo?query=terrorism%20OR%20terrorist%20OR%20attack%20OR%20bombing&format=GeoJSON&timespan=60m&maxpoints=200

// Feed 4: Noticias sobre TRUMP / US POLITICS
https://api.gdeltproject.org/api/v2/geo/geo?query=trump%20OR%20tariff%20OR%20border%20OR%20immigration&format=GeoJSON&timespan=60m&maxpoints=200

// Feed 5: Noticias sobre IRAN NUCLEAR
https://api.gdeltproject.org/api/v2/geo/geo?query=iran%20nuclear%20OR%20enrichment%20OR%20IAEA&format=GeoJSON&timespan=24h&maxpoints=100

// Feed 6: Noticias sobre CHINA / TAIWAN
https://api.gdeltproject.org/api/v2/geo/geo?query=china%20taiwan%20OR%20south%20china%20sea%20OR%20PLA&format=GeoJSON&timespan=24h&maxpoints=100

// Feed 7: Noticias sobre RUSSIA / UKRAINE
https://api.gdeltproject.org/api/v2/geo/geo?query=ukraine%20russia%20OR%20kharkiv%20OR%20kursk%20OR%20zelensky&format=GeoJSON&timespan=60m&maxpoints=200

// Feed 8: Noticias sobre ISRAEL / MIDDLE EAST
https://api.gdeltproject.org/api/v2/geo/geo?query=israel%20gaza%20OR%20hamas%20OR%20hezbollah%20OR%20houthi&format=GeoJSON&timespan=60m&maxpoints=200

// Feed 9: Noticias NEGATIVAS (tone < -5 = crisis/conflicto)
// GDELT GEO API soporta filtro por tono
https://api.gdeltproject.org/api/v2/geo/geo?query=*&format=GeoJSON&timespan=60m&maxpoints=300&TONE=<-5
```

**Cada punto GeoJSON incluye:**
- `lat`, `lng` — coordenadas exactas
- `name` — nombre de la locación
- `url` — URL del artículo original
- `domain` — dominio del medio (reuters.com, foxnews.com, etc.)
- `language` — idioma original
- `socialimage` — imagen thumbnail del artículo
- `tone` — tono del artículo (-100 a +100, negativo = malo)
- `mentionednames` — personas/organizaciones mencionadas
- `urltone` — tono específico del artículo

**Visual en el mapa:**

```
Cada noticia es un punto:
  🔴 Tone < -5  → Noticia negativa/crisis (rojo, pulse animation)
  🟠 Tone -5 a -2 → Noticia negativa (naranja)
  🟡 Tone -2 a +2 → Neutral (amarillo, más pequeño)
  🟢 Tone > +2  → Positiva (verde, small, sin pulse)

Tamaño del punto: basado en cantidad de artículos sobre esa locación

Al HOVER sobre un punto:
┌──────────────────────────────────────┐
│ 📍 Kharkiv, Ukraine                  │
│ 🔴 Tone: -8.3 (very negative)       │
│ 📰 12 articles in last hour          │
│ Latest: "Russia launches massive     │
│ missile attack on Kharkiv..."        │
│ Source: Reuters                      │
│ 🕐 14 minutes ago                    │
│ Click for details →                  │
└──────────────────────────────────────┘

Al CLICK en un punto:
→ Abre panel lateral con TODOS los artículos de esa locación
→ Cada artículo con: título, fuente, thumbnail, tone, timestamp
→ Link a artículo original
→ Muestra personas/organizaciones mencionadas
→ Si hay conflicto ACLED asociado, lo linkea
```

**Clustering de noticias:**
- Cuando hay muchas noticias en una zona, usar marker clustering (Leaflet.markercluster)
- El cluster muestra el count y el color del tone promedio
- Al hacer zoom, los clusters se desagregan en puntos individuales
- Hotspots (>50 artículos en un área) generan un halo rojo pulsante

**Auto-categorización con queries temáticas:**
El backend hace 9 queries paralelas a GDELT cada 15 minutos, cada una para una temática distinta. Cada resultado se tagea con un ícono y se le asigna una capa:

| Query GDELT | Ícono en mapa | Capa |
|-------------|---------------|------|
| conflict, war, military, attack | ⚔️ | Conflict |
| terrorism, bombing, extremism | 💣 | Terrorism |
| trump, tariff, border, immigration | 🇺🇸 | US Politics |
| iran, nuclear, IAEA, enrichment | ☢️ | Nuclear |
| china, taiwan, PLA, south china sea | 🇨🇳 | China Threat |
| russia, ukraine, kharkiv, kursk | 🇺🇦 | Russia-Ukraine |
| israel, gaza, hamas, hezbollah | 🇮🇱 | Middle East |
| oil, energy, OPEC, gas, pipeline | 🛢️ | Energy |
| * (tone < -5) | 🔴 | Crisis General |

**Cada capa se puede togglear on/off con checkboxes en la leyenda del mapa.**

---

#### CAPA 2: CONFLICTOS PERSISTENTES (ACLED)

Los conflictos de ACLED son más estables (se actualizan semanalmente). Estos son markers más grandes, persistentes, que representan zonas de conflicto activo. Se muestran DEBAJO de la capa de noticias GDELT.

**ACLED API endpoint:**
```
https://api.acleddata.com/acled/read?
  event_date=>={30_days_ago}&
  event_date_where=BETWEEN&
  limit=5000&
  fields=event_id_cnty|event_date|event_type|sub_event_type|actor1|actor2|country|latitude|longitude|fatalities|notes
```

**Agrupación:** Los eventos ACLED se agrupan por país/región en "zonas de conflicto" que se muestran como áreas difusas (heatmap circles) detrás de los markers GDELT.

---

#### CAPA 3: CONNECTION LINES (AI-Generated, Dinámicas)

En lugar de hardcodear las relaciones entre conflictos, usar **Claude API** para que analice los conflictos actuales de ACLED y genere las relaciones automáticamente:

```
System: You are a geopolitical intelligence analyst. Given the following list of active conflicts 
from ACLED data, identify relationships between them. For each pair of related conflicts, specify:
- relationship_type: proxy_war | arms_flow | alliance | spillover | cyber | financial | intelligence
- strength: 0.0 to 1.0
- direction: bidirectional | A->B | B->A
- brief description (1 sentence)
Return as JSON array.
```

**Esto se regenera cada 4-6 horas via Anthropic API** → las connection lines son SIEMPRE actuales y basadas en datos reales.

---

#### INTERACCIÓN MAPA-NOTICIAS (flujo completo):

```
1. Usuario ve el mapa con cientos de puntos de noticias
2. Zona de Medio Oriente tiene un cluster rojo brillante (muchas noticias negativas)
3. Hace zoom → se desagregan 47 puntos individuales en Israel/Gaza/Líbano/Yemen
4. Hover en punto de Gaza → tooltip con headline de Reuters: "IDF reports ground operation in Rafah"
5. Click → panel derecho se llena con 12 artículos de esa locación
6. Los artículos incluyen thumbnail, título, fuente, tone bar, timestamp
7. Las connection lines muestran link Gaza ↔ Iran (proxy war) y Gaza ↔ Yemen (Houthi)
8. Si hace click en la connection line → tooltip: "Iran-Hamas proxy relationship, arms flow via Sinai"
9. En la esquina del mapa: "Last update: 2 min ago | 847 live news markers | Sources: 142 countries"
```

---

### MÓDULO 4: MARKETS & ECONOMIC DASHBOARD (Panel derecho superior)

**100% APIs reales, actualización continua:**

#### Sección 1: Energía + Metales
| Indicador | API | Endpoint Exacto | Free? | Refresh |
|-----------|-----|-----------------|-------|---------|
| WTI Oil | OilPriceAPI | `GET /v1/prices/latest?by_code=WTI_USD` | Freemium | 5min |
| Brent Oil | OilPriceAPI | `GET /v1/prices/latest?by_code=BRENT_USD` | Freemium | 5min |
| Natural Gas | CommodityPriceAPI | `GET /api/latest?symbols=NG` | Free tier | 10min |
| Gold (XAU) | Metals-API | `GET /latest?base=USD&symbols=XAU` | Free tier | 10min |
| Silver (XAG) | Metals-API | `GET /latest?base=USD&symbols=XAG` | Free tier | 10min |
| Uranium | CommodityPriceAPI | `symbols=UX` | Free | Daily |

#### Sección 2: Crypto + Indices
| Indicador | API | Endpoint | Free? |
|-----------|-----|----------|-------|
| Bitcoin | CoinGecko | `GET /api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true` | ✅ |
| Ethereum | CoinGecko | Same, `ids=ethereum` | ✅ |
| S&P 500 | Twelve Data | `GET /time_series?symbol=SPX&interval=5min` | Free tier |
| Dow Jones | Twelve Data | `symbol=DJI` | Free tier |
| VIX (Fear) | Twelve Data | `symbol=VIX` | Free tier |
| 10Y Treasury | Twelve Data | `symbol=TNX` | Free tier |
| DXY (Dollar) | Twelve Data | `symbol=DXY` | Free tier |

#### Sección 3: Commodities geopolíticos
| Indicador | Relevancia geopolítica | API |
|-----------|----------------------|-----|
| Wheat | RUS/UKR son 30% exportación global | CommodityPriceAPI |
| Corn | Etanol, alimentación global | CommodityPriceAPI |
| Soybeans | Argentina-Brasil-China triangle | CommodityPriceAPI |
| Coffee | Latam geopolitics | CommodityPriceAPI |
| Lithium | China dominance, EVs | CommodityPriceAPI |
| Rare Earths | China monopoly, defense supply chain | Manual/news |

#### Sección 4: Indicadores macro US (interés para pro-Trump)
| Indicador | Fuente | Frecuencia |
|-----------|--------|------------|
| US National Debt | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny` | Daily ✅ FREE |
| DOGE Savings (claimed) | DOGE.gov RSS / X feed de @DOGE | As posted |
| US Trade Balance | BEA API `https://apps.bea.gov/api/data` | Monthly ✅ |
| CPI / Inflation | BLS API `https://api.bls.gov/publicAPI/v2/timeseries/data/` | Monthly ✅ |
| Unemployment | BLS API | Monthly ✅ |
| US GDP | BEA API | Quarterly ✅ |
| Fed Funds Rate | FRED API `https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS` | Daily ✅ |

#### Sección 5: Border Security Stats
| Dato | Fuente | URL |
|------|--------|-----|
| SW Border encounters (monthly) | CBP | `https://www.cbp.gov/newsroom/stats/southwest-land-border-encounters` → scrape |
| Drug seizures (fentanyl) | CBP | `https://www.cbp.gov/newsroom/stats/drug-seizure-statistics` |
| Got-aways estimate | DHS press releases | RSS scrape |
| ICE arrests/removals | ICE ERO | `https://www.ice.gov/news/releases` RSS |
| Terrorist watchlist encounters | CBP enforcement stats | Monthly report |

**Visual para cada indicador:**
```
┌─────────────────────────────┐
│ 💰 MARKETS                  │
│                             │
│ OIL WTI    $72.34  ▲+1.2%  │
│ ▁▂▃▅▇█▇▅▃▂▁▂▃▅  7d        │
│                             │
│ GOLD       $2,847  ▲+0.3%  │
│ ▃▃▄▅▅▆▆▇▇██▇▆▅  7d        │
│                             │
│ BTC       $97,234  ▼-2.1%  │
│ █▇▆▅▄▃▂▁▁▂▃▄▅  7d         │
│                             │
│ S&P 500    6,127   ▲+0.4%  │
│ VIX          14.2  ▼-3.1%  │
│ DXY         108.3  ▲+0.2%  │
│ 10Y         4.52%  ▬ 0.0%  │
│                             │
├─────────────────────────────┤
│ 🇺🇸 US MACRO                │
│ National Debt: $36.4T       │
│ DOGE Savings: $172B claimed │
│ Fed Rate: 4.25-4.50%       │
│ CPI (YoY): 2.9%            │
│ Unemployment: 4.0%          │
│                             │
├─────────────────────────────┤
│ 🛃 BORDER (FY26 to date)   │
│ SW Encounters: 30,561/mo    │
│ ▼ -95% vs Biden avg         │
│ USBP Releases: ZERO (6 mo) │
│ Fentanyl seized: 12,400 lbs │
│ ICE arrests: 48,290         │
└─────────────────────────────┘
```

---

### MÓDULO 5: BREAKING NEWS WIRE (Panel centro-inferior)

**Multi-source aggregated news feed:**

| Fuente | API | Sesgo/Valor | Costo |
|--------|-----|-------------|-------|
| GDELT DOC API | `api.gdeltproject.org/api/v2/doc/doc?query=*&mode=artlist&maxrecords=75&format=json&sort=datedesc` | Neutral, global, 65 idiomas | ✅ FREE |
| NewsAPI.org | `newsapi.org/v2/top-headlines?country=us&category=general` | Major outlets | Free: 100 req/day |
| Reuters Wire | `feeds.reuters.com/reuters/topNews` (RSS) | Gold standard wire | ✅ FREE |
| AP Wire | AP News RSS | Wire service | ✅ FREE |
| Fox News | `https://moxie.foxnews.com/google-publisher/latest.xml` | Conservative US | ✅ FREE |
| Daily Wire | RSS feed | Conservative | ✅ FREE |
| Breitbart | RSS feed | Right-wing | ✅ FREE |
| The Epoch Times | RSS feed | Conservative, anti-CCP | ✅ FREE |
| Al Jazeera EN | `aljazeera.com/xml/rss/all.xml` | Middle East perspective | ✅ FREE |
| TASS English | RSS | Russian state perspective | ✅ FREE |
| Xinhua EN | RSS | Chinese state perspective | ✅ FREE |
| Times of Israel | RSS | Israel perspective | ✅ FREE |
| Jerusalem Post | RSS | Israel perspective | ✅ FREE |
| SCMP | RSS | Hong Kong/China perspective | ✅ FREE |
| BBC World | RSS | UK/global perspective | ✅ FREE |
| WSJ (headlines) | RSS | Business/markets | ✅ FREE |

**Funcionalidades:**
- Feed scrolleable con infinite scroll
- Color coding: 🔴 Security 🟡 Diplomacy 🔵 Economic 🟢 Humanitarian 🟣 Tech/Cyber
- Deduplicación por similitud (string matching)
- Filter por fuente, categoría, región
- Keyword highlight
- Click → abre fuente original
- AI-powered categorization via Claude (batch cada 5 min)

---

### MÓDULO 6: DIPLOMATIC & GEOPOLITICAL CALENDAR

**Fuentes para calendario dinámico (no hardcoded):**

| Fuente | API/Método | Datos |
|--------|-----------|-------|
| UN Meetings | `https://journal.un.org/en/` → scrape | UNSC, UNGA sessions |
| EU Council | `https://www.consilium.europa.eu/en/meetings/calendar/` → scrape | EU summits, council meetings |
| NATO Events | `https://www.nato.int/cps/en/natohq/events.htm` → scrape RSS | Ministerials, summits |
| OPEC Calendar | `https://www.opec.org/opec_web/en/press_room/` | Production meetings |
| G7/G20 | Host country website RSS | Summits, sherpa meetings |
| IMF/WB Calendar | `https://www.imf.org/en/News/Seminars` | Spring/annual meetings |
| US Elections | `https://api.civicinfo.googleapis.com/` Google Civic API | Upcoming elections ✅ FREE |
| Global Elections | IFES Election Guide `https://www.electionguide.org/` → scrape | All country elections |
| IAEA Board | IAEA press RSS | Meetings on Iran/NK nuclear |
| Federal Reserve | `https://www.federalreserve.gov/feeds/` RSS | FOMC meetings |

**Enriquecimiento con Claude AI:**
Cada 12 horas, pasar la lista de eventos al AI para generar:
- Relevancia geopolítica (1-10)
- Potencial impacto en mercados
- Conexión con conflictos activos
- Predicted outcome / lo que hay que vigilar

---

### MÓDULO 7: AI INTELLIGENCE BRIEF

**El cerebro del sistema. Generado por Claude API.**

**Arquitectura:**
```
INPUTS (cada 4 horas) →
  - ACLED conflict data (últimos 7 días)
  - GDELT top news (últimas 24h, tone < -3 = crisis)
  - Trump latest 10 posts
  - Market moves > 2% en 24h
  - Leader statements (últimas 24h)
  - Diplomatic calendar (próximos 7 días)
  
→ CLAUDE SONNET API →

→ OUTPUT: Structured intelligence brief
```

**System prompt para el AI Brief:**
```
You are ATLAS, a senior geopolitical intelligence analyst providing briefings for a 
decision-maker interested in global security, US national interests, Middle East stability, 
China threat assessment, border security, and market impacts of geopolitical events.

Your briefings should be:
- Direct, no-nonsense, factual
- Structured with clear sections
- Focused on actionable intelligence and what to watch
- Always connect geopolitical events to market implications
- Flag anything relevant to US national security interests
- Highlight wins for current US administration policy where data supports it
- Note threats from Iran, China, Russia, non-state actors
- Include border security developments when relevant

FORMAT:
■ SITUATION OVERVIEW (2-3 sentences, big picture)
■ CRITICAL DEVELOPMENTS (last 24h, bullet points)
■ THREAT MATRIX
  - CRITICAL: [items]
  - ELEVATED: [items]  
  - WATCH: [items]
■ MARKET IMPLICATIONS (how geopolitics affects markets today)
■ 72-HOUR OUTLOOK (what to expect next)
■ RECOMMENDED MONITORING (specific things to track)
```

**API Call:**
```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    system: ATLAS_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Generate intelligence brief based on this data:\n\n
        CONFLICTS: ${JSON.stringify(acledData)}\n
        NEWS: ${JSON.stringify(gdeltTopNews)}\n
        MARKETS: ${JSON.stringify(marketData)}\n
        TRUMP_POSTS: ${JSON.stringify(trumpPosts)}\n
        LEADER_STATEMENTS: ${JSON.stringify(leaderFeed)}\n
        CALENDAR: ${JSON.stringify(upcomingEvents)}\n
        BORDER: ${JSON.stringify(borderStats)}\n
        Current UTC: ${new Date().toISOString()}`
    }]
  })
});
```

**Refresh:** Cada 4 horas automático + botón manual "Regenerate"

---

### MÓDULO 8: SCROLLING TICKER (Bottom bar)

**Combina todas las fuentes en un ticker horizontal continuo:**

Formato: `🔴 SOURCE: Headline text │ 🔵 SOURCE: Headline │ >>>`

Prioridad de display:
1. 🟣 TRUMP (nuevo post en Truth Social — siempre primero)
2. 🔴 BREAKING (GDELT tone < -5 o keyword "breaking")
3. 🟠 CONFLICT (ACLED new events)
4. 🔵 MARKETS (moves > 2%)
5. 🟡 DIPLOMATIC (upcoming event < 24h)
6. ⚪ GENERAL (other news)

---

## 💰 PRESUPUESTO DE APIS

| API | Plan | Costo Mensual | Necesario para |
|-----|------|--------------|----------------|
| ACLED | Free (myACLED registro) | $0 | Conflictos |
| GDELT | Free | $0 | News, geo, sentiment |
| CoinGecko | Free | $0 | Crypto |
| CommodityPriceAPI | Free tier | $0 | Commodities |
| OilPriceAPI | Starter | $0-$15/mo | Oil prices |
| Twelve Data | Free tier (800 calls/day) | $0 | Stock indices |
| Metals-API | Free tier (100 calls/mo) | $0 | Gold, silver |
| NewsAPI.org | Free (100/day) | $0 | Headlines |
| FRED (St. Louis Fed) | Free | $0 | US macro data |
| Treasury FiscalData | Free | $0 | National debt |
| BLS | Free | $0 | Inflation, unemployment |
| USGS | Free | $0 | Earthquakes |
| Google Civic Info | Free | $0 | Elections |
| TrumpsTruth.org RSS | Free | $0 | Trump posts |
| All RSS feeds | Free | $0 | Leader statements, news |
| **Anthropic Claude API** | **Pay per use** | **~$20-50/mo** | **AI briefs, conflict analysis, categorization** |
| ScrapeCreators (Truth Social) | Pay per call | ~$5-10/mo | Real-time Trump posts |
| X API (optional, for reliability) | Basic | $100/mo | Leader X feeds |
| **RSSHub self-hosted** | Free (VPS cost) | $5/mo VPS | X feeds as RSS |

**TOTAL ESTIMADO: $30-180/mes** dependiendo de si usás X API oficial o RSSHub.

---

## 🏗️ TECH STACK DEFINITIVO

```
├── Frontend (lo que se ve en la TV)
│   ├── React 18 + TypeScript + Vite
│   ├── TailwindCSS (dark theme)
│   ├── Leaflet + react-leaflet (mapa)
│   ├── Recharts (sparklines, charts)
│   ├── Framer Motion (animaciones)
│   ├── Lucide React (icons)
│   └── Socket.io client (real-time updates)
│
├── Backend (Node.js API aggregator + cache)
│   ├── Fastify (o Express)
│   ├── node-cron (scheduled fetching)
│   ├── rss-parser (RSS feeds)
│   ├── axios (API calls)
│   ├── Redis (cache para evitar rate limits)
│   ├── Socket.io server (push to frontend)
│   ├── Anthropic SDK (AI briefs)
│   └── Cheerio (light scraping para CBP, calendars)
│
├── Database
│   ├── PostgreSQL (persistent storage)
│   │   ├── conflicts (ACLED data cache)
│   │   ├── news_items (deduped news)
│   │   ├── market_snapshots (time series)
│   │   ├── leader_posts (all feeds aggregated)
│   │   ├── ai_briefs (generated reports)
│   │   └── events_calendar (diplomatic events)
│   └── Redis (hot cache, rate limit tracking)
│
└── Deployment
    ├── Docker Compose (backend + DB + Redis)
    ├── Frontend: Vercel or self-hosted Nginx
    └── TV: Raspberry Pi 5 + Chromium kiosk mode
        o cualquier PC con browser fullscreen
```

---

## 🖥️ SETUP PARA TV

**Opción A: Raspberry Pi 5 (más limpio)**
- RPi 5 8GB + case + PSU: ~$80
- Chromium en kiosk mode: `chromium-browser --kiosk --noerrdialogs https://atlas.local`
- Auto-start on boot
- HDMI directo a la TV

**Opción B: Mini PC / NUC**
- Cualquier mini PC con browser
- Más potente para animaciones fluidas

**Opción C: Smart TV browser**
- Menos recomendable, browsers de TV son limitados

---

## ⏱️ TIMELINE DE CONSTRUCCIÓN CON CLAUDE CODE

| Fase | Duración | Entregable |
|------|----------|------------|
| 1. Core UI + Map + Static Data | 3-4h | Layout completo, mapa, conflict markers de ACLED |
| 2. API Integration Backend | 3-4h | Todas las APIs conectadas, caching, cron jobs |
| 3. Leader Feed + Trump | 2-3h | RSS aggregator, Truth Social feed, formatting |
| 4. Markets Dashboard | 2h | Todos los indicadores con sparklines |
| 5. AI Intelligence Layer | 2h | Claude API integration, auto-briefs |
| 6. Connection Lines + Polish | 2-3h | Animated lines, effects, kiosk mode |
| 7. Testing + Deploy | 2h | Docker, deploy, TV setup |
| **TOTAL** | **~16-20h** | **Sala de situación completa** |

---

## 📋 PRÓXIMO PASO

Una vez aprobado este plan, voy a generar los **prompts exactos para Claude Code** divididos en las 7 fases, cada uno ultra-detallado con las APIs, endpoints, y diseño visual preciso.

¿Ajustamos algo? ¿Agregamos algún tema? ¿Quitamos algo?
