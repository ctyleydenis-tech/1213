=== Fun Russia HUD — CEF Event System ===

Сервер (Pawn) -> Клиент (CEF Browser) -> HUD (JS)

=============================================================
1. ИНИЦИАЛИЗАЦИЯ БРАУЗЕРА
=============================================================

OnCefInitialize(playerid, success) — создаёт BROWSER_HUD при успешном
подключении клиента к CEF-серверу:
    cef_create_browser(playerid, BROWSER_HUD, "https://.../index.html", false, false);

OnCefBrowserCreated(playerid, browserid, status_code) — когда браузер
создан на клиенте, запускает таймер UpdateHud (каждую секунду).

=============================================================
2. ИВЕНТ: hud:main (8 параметров, каждый таймер)
=============================================================

Порядок параметров (строгий!):
  CEFINT(money)        — наличные деньги
  CEFINT(playerid)     — ID игрока
  CEFINT(online)       — количество игроков онлайн
  CEFFLOAT(health)     — здоровье (float)
  CEFFLOAT(armour)     — броня (float)
  CEFINT(hunger)       — сытость / голод
  CEFINT(ping)         — пинг в ms
  CEFINT(speed)        — скорость км/ч (0 если не в машине)

JS-обработчик:
  cef.on('hud:main', (money, playerid, online, hp, armor, hunger, ping, speed) => {
    hud-cash.textContent = money;
    hud-id.textContent = playerid;
    hud-online.textContent = online;
    hud-health.textContent = Math.round(hp);
    hud-armor.textContent = Math.round(armor);
    hud-food.textContent = hunger;
    hud-ping.textContent = ping + 'ms';
    speedo-kmh.textContent = speed;
  });

=============================================================
3. ИВЕНТ: hud:extra (10 параметров, каждый таймер)
=============================================================

Порядок параметров (строгий!):
  CEFINT(level)        — уровень игрока
  CEFINT(exp)          — текущий опыт
  CEFINT(expNeed)      — опыт до следующего уровня
  CEFINT(bank)         — деньги на карте (кредитка)
  CEFINT(donate)       — донатные бонусы
  CEFINT(districtId)   — ID района (0 = Los Santos)
  CEFINT(inVehicle)    — 1 если в машине, 0 если нет
  CEFINT(fuel)         — топливо в % (0-100)
  CEFINT(gear)         — передача (0-6)
  CEFINT(seatbelt)     — 1 если пристёгнут, 0 если нет

JS-обработчик:
  cef.on('hud:extra', (level, exp, expNeed, bank, donate, districtId,
                        inVehicle, fuel, gear, seatbelt) => {
    hud-lvl.textContent = level;
    hud-exp.textContent = exp + '/' + expNeed;
    (ширина полоски exp = exp/expNeed * 100%)
    hud-card.textContent = bank;
    hud-donate.textContent = donate;
  });

=============================================================
4. ИВЕНТЫ ПО ЗАПРОСУ (не по таймеру)
=============================================================

hud:notify — уведомление:
  cef_emit_event(playerid, "hud:notify", CEFSTR("текст уведомления"));
  JS: cef.on('hud:notify', pushNotify);

hud:menu — открытие меню настроек HUD:
  cef_emit_event(playerid, "hud:menu");
  JS: cef.on('hud:menu', () => menuOpen());

hud:menuclose — закрытие меню (из JS):
  JS: cef.emit('hud:menuclose');
  Pawn: OnHudMenuClose(playerid)

=============================================================
5. ОБЩАЯ СХЕМА РАБОТЫ
=============================================================

1. При коннекте игрока: cef_on_player_connect(playerid, ip)
2. Таймер вышел — CEF не загрузился → кик
3. OnCefInitialize → создать BROWSER_HUD по URL
4. OnCefBrowserCreated → запустить UpdateHud (1 сек)
5. Каждую секунду UpdateHud собирает данные и шлёт 2 ивента:
   - hud:main (быстрые данные — деньги, хп, пинг)
   - hud:extra (статистика — уровень, опыт, банк)
6. JS получает ивенты и обновляет DOM-элементы

=============================================================
6. ТИПЫ ПАРАМЕТРОВ (ВАЖНО!)
=============================================================

Макросы (все pass-through, плагин сам определяет тип по тегу Pawn):
  #define CEFINT(%0) %0      — целое число (int)
  #define CEFFLOAT(%0) %0    — число с плавающей точкой (Float:)
  #define CEFSTR(%0) %0      — строка (text[])

НИКОГДА не смешивать CEFSTR с CEFINT/CEFFLOAT в одном ивенте!
В hud:main и hud:extra строк нет — только числа.

Если нужно передать строку (например, название района) —
только через отдельный ивент (hud:notify).

=============================================================
7. HTML-ЭЛЕМЕНТЫ HUD
=============================================================

Верхняя панель слева:
  hud-lvl          — уровень
  hud-online       — онлайн
  hud-exp-fill     — полоска опыта (width в %)
  hud-exp          — текст "exp/expNeed"
  hud-id           — ID игрока

Верхняя панель справа:
  hud-district-name — название района
  hud-cash          — наличные деньги
  hud-card          — деньги на карте
  hud-donate        — донатные бонусы
  hud-ping          — пинг (ms)

Виталс (снизу слева):
  hud-health       — здоровье (0-100)
  hud-armor        — броня (0-100)
  hud-food         — сытость (0-100)

Спидометр (снизу справа):
  speedo            — контейнер (display: flex/none)
  speedo-kmh        — скорость км/ч
  speedo-gear       — передача (D, 1, 2, ...)
  speedo-fuel-fill  — высота полоски топлива (height в %)
  speedo-fuel-pct   — процент топлива
  speedo-belt       — индикатор ремня (class .off = отстёгнут)

Уведомления:
  notify-stack      — контейнер для уведомлений

Меню настроек (/hud):
  hud-menu          — контейнер меню (class menu-hidden)
  menu-overlay      — затемнение фона
  menu-body         — содержимое меню
  menu-title        — заголовок
  menu-back         — кнопка назад
  menu-close        — кнопка закрыть
