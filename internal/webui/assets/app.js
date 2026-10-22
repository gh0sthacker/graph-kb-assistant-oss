"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const MAX_GRAPH_ZOOM = 10;
const MIN_GRAPH_ZOOM = 0.35;
const OVERVIEW_HIDDEN_KINDS = ["observation", "request_variant", "response_variant"];
const state = {
  projects: [], projectCursor: null, projectKey: "", endpoints: [], endpointCursor: null, surfaceGaps: [],
  graph: null, selectedEndpoint: null, selectedNode: null, graphFocus: false, loadingSurface: false,
  loadingGraph: false, hiddenKinds: new Set(OVERVIEW_HIDDEN_KINDS), routeScope: true, edgeLabelsVisible: true,
  renderedEntities: [], renderedAssertions: [], zoom: 1, panX: 0, panY: 0, drag: null, toastTimer: null,
};

const elements = {
  project: $("#project-select"), endpointList: $("#endpoint-list"), endpointCount: $("#endpoint-count"),
  filter: $("#endpoint-filter"), loadMore: $("#load-more"), surfaceFoot: $("#surface-foot-text"),
  graphCanvas: $("#graph-canvas"), graphScene: $("#graph-scene"), canvasEmpty: $("#canvas-empty"),
  emptyTitle: $("#canvas-empty-title"), emptyCopy: $("#canvas-empty-copy"), graphState: $("#graph-state"),
  graphTitle: $("#graph-title"), graphSubtitle: $("#graph-subtitle"), graphProject: $("#graph-project-label"),
  graphCounts: $("#graph-counts"), inspector: $("#inspector-content"), inspectIndex: $("#inspect-index"),
  graphFilters: $("#graph-filters"), graphFilterSummary: $("#graph-filter-summary"),
  graphOverview: $("#graph-overview"), graphShowAll: $("#graph-show-all"), edgeLabels: $("#toggle-edge-labels"),
  status: $("#status-text"), coverage: $("#coverage-status"), updated: $("#last-updated"),
  zoom: $("#zoom-readout"), zoomIn: $("#zoom-in"), zoomOut: $("#zoom-out"),
  focusGraph: $("#focus-graph"), workspace: $(".workspace"),
  toast: $("#toast"), viewport: $("#graph-viewport"),
};

const nodeLabels = {
  observation: "HTTP-ЗАПРОС", endpoint: "МАРШРУТ", parameter: "ПОЛЕ",
  asset: "ХОСТ", actor: "АКТОР", object: "ОБЪЕКТ", session_context: "КОНТЕКСТ СЕССИИ",
  condition: "УСЛОВИЕ", flow: "ПОТОК", classifier_signal: "СИГНАЛ",
  hypothesis: "ГИПОТЕЗА", request_variant: "ФОРМА ЗАПРОСА", response_variant: "ФОРМА ОТВЕТА",
};
const filterLabels = {
  observation: "Запросы", endpoint: "Маршруты", parameter: "Поля", asset: "Хосты",
  actor: "Акторы", object: "Объекты", session_context: "Контексты",
  condition: "Условия", flow: "Потоки", classifier_signal: "Сигналы",
  hypothesis: "Гипотезы", request_variant: "Формы запроса", response_variant: "Формы ответа",
};
const relationLabels = {
  exposes: "обслуживает маршрут",
  invokes: "обращается к маршруту",
  has_parameter: "содержит поле",
  returns: "возвращает поле",
  uses_request_variant: "использует форму запроса",
  received_response: "получил форму ответа",
  supports: "поддерживает гипотезу",
  contradicts: "противоречит гипотезе",
  contains: "содержит",
  precedes: "предшествует",
};
const MASKED_PATH_HELP = "Динамические сегменты скрыты: они могут содержать идентификаторы или секреты. Сырые HTTP-значения остаются в Caido.";
const kindColors = { observation: "#83c8cf", endpoint: "#e0b56b", parameter: "#b8a3da", asset: "#b2d88a" };

function el(tag, className, text) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text !== undefined) result.textContent = String(text);
  return result;
}

function svgEl(tag, attrs = {}) {
  const result = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [name, value] of Object.entries(attrs)) result.setAttribute(name, String(value));
  return result;
}

function setStatus(message, kind = "") {
  elements.status.textContent = message;
  elements.graphState.className = `graph-state ${kind}`.trim();
  const statusLabel = elements.graphState.querySelector("span:last-child");
  if (statusLabel) statusLabel.textContent = message;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

async function getJSON(path) {
  const response = await fetch(path, { headers: { Accept: "application/json" }, credentials: "same-origin", cache: "no-store" });
  let payload;
  try { payload = await response.json(); } catch { throw new Error("Сервер вернул некорректный ответ."); }
  if (!response.ok) throw new Error(payload.error || `Ошибка чтения (${response.status}).`);
  return payload;
}

async function loadProjects(append = false) {
  elements.project.disabled = true;
  if (!append) {
    setStatus("Загрузка локальных проектов", "loading");
    renderEmpty("Загружаю локальный каталог", "Проверяю зарегистрированные проекты на этом устройстве.");
    elements.endpointList.replaceChildren(emptyList("Загрузка…", "Читаю локальный реестр проектов."));
  }
  const selectedKey = state.projectKey;
  try {
    const query = new URLSearchParams({ limit: "200" });
    if (append && state.projectCursor) query.set("after_project_key", state.projectCursor);
    const data = await getJSON(`/api/projects?${query}`);
    const page = Array.isArray(data.projects) ? data.projects : [];
    state.projects = append ? [...state.projects, ...page] : page;
    state.projectCursor = data.next_after_project_key || null;
    elements.project.replaceChildren();
    if (!state.projects.length) {
      state.projectCursor = null;
      elements.project.append(new Option("Нет локальных проектов", ""));
      elements.project.disabled = true;
      clearProjectView();
      elements.endpointCount.textContent = "0";
      elements.surfaceFoot.textContent = "Локальный индекс пуст";
      elements.endpointList.replaceChildren(emptyList("Нет данных", "Локальный реестр проектов пуст."));
      elements.coverage.textContent = "Покрытие: нет проекта";
      setStatus("Нет зарегистрированных проектов");
      return;
    }
    for (const item of state.projects) {
      const name = item.display_name || `Caido · ${short(item.project_id || item.project_key, 18)}`;
      elements.project.append(new Option(name, item.project_key));
    }
    if (state.projectCursor) elements.project.append(new Option("Загрузить следующие проекты…", "__load_more__"));
    elements.project.disabled = false;
    if (append) {
      elements.project.value = selectedKey;
      return;
    }
    await selectProject(state.projects[0].project_key);
  } catch (error) {
    if (append) {
      elements.project.disabled = false;
      elements.project.value = selectedKey;
      showToast(`Не удалось загрузить следующие проекты: ${error.message}`);
      return;
    }
    elements.project.replaceChildren(new Option("Ошибка загрузки", ""));
    elements.project.disabled = true;
    clearProjectView();
    renderEmpty("Не удалось открыть локальный каталог", "Проверьте совместимость баз проекта и обновите страницу.");
    elements.endpointList.replaceChildren(emptyList("Ошибка чтения", error.message));
    elements.coverage.textContent = "Покрытие: недоступно";
    setStatus("Ошибка чтения проекта", "error");
  }
}

function clearProjectView() {
  state.projectKey = "";
  state.projectCursor = null;
  state.endpoints = [];
  state.endpointCursor = null;
  state.graph = null;
  state.selectedEndpoint = null;
  state.selectedNode = null;
  elements.graphProject.textContent = "ВЫБЕРИТЕ ПРОЕКТ";
  elements.graphTitle.textContent = "Связи наблюдаемого поведения";
  elements.graphSubtitle.textContent = "Выберите endpoint, чтобы открыть его окрестность в графе.";
  elements.graphCounts.replaceChildren(countText(0, "узлов"), el("b"), countText(0, "связей"));
  elements.endpointCount.textContent = "0";
  elements.loadMore.hidden = true;
  renderInspectorEmpty();
  renderEmpty("Нет зарегистрированных проектов", "Сначала добавьте локальный проект и импортируйте в него историю Caido.");
}

async function selectProject(projectKey) {
  state.projectKey = projectKey;
  state.endpoints = [];
  state.endpointCursor = null;
  state.surfaceGaps = [];
  state.graph = null;
  state.selectedEndpoint = null;
  state.selectedNode = null;
  elements.project.value = projectKey;
  const project = state.projects.find(item => item.project_key === projectKey);
  elements.graphProject.textContent = project ? (project.display_name || `CAIDO · ${short(project.project_id || projectKey, 18)}`).toUpperCase() : "ЛОКАЛЬНЫЙ ПРОЕКТ";
  elements.graphTitle.textContent = "Связи наблюдаемого поведения";
  elements.graphSubtitle.textContent = "Выберите endpoint, чтобы открыть его окрестность в графе.";
  elements.graphCounts.replaceChildren(countText(0, "узлов"), el("b"), countText(0, "связей"));
  elements.inspectIndex.textContent = "—";
  renderInspectorEmpty();
  renderEmpty("Загружаю поверхность проекта", "Читаю ограниченную страницу локального structural index.");
  renderEndpointList();
  setStatus("Загрузка локального индекса", "loading");
  await loadSurface(false);
}

function countText(value, label) {
  const span = el("span");
  span.append(document.createTextNode(String(value) + " "));
  span.append(el("small", "", label));
  return span;
}

async function loadSurface(append) {
  if (!state.projectKey || state.loadingSurface) return;
  state.loadingSurface = true;
  elements.loadMore.disabled = true;
  elements.loadMore.textContent = "Загрузка…";
  const query = new URLSearchParams({ project_key: state.projectKey, limit: "40" });
  if (append && state.endpointCursor) {
    query.set("after_history", String(state.endpointCursor.historical_row_id));
    query.set("after_live", String(state.endpointCursor.live_row_id));
  }
  try {
    const data = await getJSON(`/api/surface?${query}`);
    const rows = Array.isArray(data.endpoints) ? data.endpoints : [];
    const combined = append ? [...state.endpoints, ...rows] : rows;
    state.endpoints = mergeEndpoints(combined);
    state.endpointCursor = data.next_after || null;
    state.surfaceGaps = Array.isArray(data.coverage_gaps) ? data.coverage_gaps : [];
    state.coverageState = data.coverage_state || "partial";
    renderEndpointList();
    elements.endpointCount.textContent = state.endpoints.length;
    elements.surfaceFoot.textContent = data.truncated ? "Ограниченная страница · есть продолжение" : "Локальная выборка · покрытие частичное";
    elements.coverage.textContent = `Покрытие: ${String(state.coverageState).toUpperCase()}`;
    elements.updated.textContent = `Обновлено ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
    if (!state.endpoints.length) {
      renderEmpty("В локальном индексе нет endpoint’ов", "Импортируйте HTTP history выбранного проекта, затем обновите данные.");
      elements.endpointList.replaceChildren(emptyList("Индекс пуст", "Совместимый проект открыт, но локальных структурных записей пока нет."));
      setStatus("Нет индексированных запросов");
    } else if (!append || !state.selectedEndpoint) {
      renderEmpty("Выберите endpoint", "Выберите маршрут слева. Граф строится по связанным наблюдениям и доступным источникам.");
      if (!append && !state.selectedEndpoint) setStatus("Выберите endpoint");
    }
  } catch (error) {
    if (!append) {
      elements.endpointList.replaceChildren(emptyList("Не удалось прочитать индекс", error.message));
      renderEmpty("Данные проекта недоступны", "Проверьте версию схемы, целостность локальной базы и наличие BehaviorGraph.");
    }
    setStatus("Ошибка чтения локального индекса", "error");
  } finally {
    state.loadingSurface = false;
    elements.loadMore.disabled = false;
    elements.loadMore.replaceChildren(document.createTextNode("Загрузить ещё "), el("span", "", "↓"));
    elements.loadMore.hidden = !state.endpointCursor;
  }
}

function mergeEndpoints(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = [row.host, row.port, row.method, row.route].join("\u0000");
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...row, field_names: [...(row.field_names || [])], header_names: [...(row.header_names || [])], sampled_graph_seed_ids: [...(row.sampled_graph_seed_ids || [])] });
      continue;
    }
    existing.observation_count += Number(row.observation_count || 0);
    existing.complete_parse_count += Number(row.complete_parse_count || 0);
    existing.partial_parse_count += Number(row.partial_parse_count || 0);
    existing.unparsed_count += Number(row.unparsed_count || 0);
    existing.graph_mapped_observation_count += Number(row.graph_mapped_observation_count || 0);
    existing.field_names = unique([...existing.field_names, ...(row.field_names || [])]);
    existing.header_names = unique([...existing.header_names, ...(row.header_names || [])]);
    existing.sampled_graph_seed_ids = unique([...existing.sampled_graph_seed_ids, ...(row.sampled_graph_seed_ids || [])]).slice(0, 20);
  }
  return [...map.values()].sort((a, b) => `${a.host}${a.route}${a.method}`.localeCompare(`${b.host}${b.route}${b.method}`));
}

function unique(items) { return [...new Set(items)]; }

function renderEndpointList() {
  const filter = elements.filter.value.trim().toLowerCase();
  const rows = state.endpoints.filter(item => `${item.host} ${item.route} ${displayPath(item.route)} ${item.method}`.toLowerCase().includes(filter));
  elements.endpointList.replaceChildren();
  if (!rows.length) {
    elements.endpointList.append(emptyList(state.endpoints.length ? "Совпадений нет" : "Поверхность не загружена", state.endpoints.length ? "Измените фильтр." : "Здесь появятся найденные маршруты."));
  }
  for (const endpoint of rows) {
    const key = endpointKey(endpoint);
    const button = el("button", `endpoint-item${state.selectedEndpoint && endpointKey(state.selectedEndpoint) === key ? " active" : ""}`);
    button.type = "button";
    button.setAttribute("aria-pressed", state.selectedEndpoint && endpointKey(state.selectedEndpoint) === key ? "true" : "false");
    button.setAttribute("aria-label", `${endpoint.method} ${endpoint.host}${displayPath(endpoint.route)}, ${endpoint.observation_count} запросов по шаблону`);
    button.title = MASKED_PATH_HELP;
    const method = el("span", `method-chip method-${String(endpoint.method || "get").toLowerCase()}`, endpoint.method || "?");
    const copy = el("span", "endpoint-copy");
    copy.append(el("span", "endpoint-host", endpoint.host || "неизвестный хост"));
    copy.append(el("span", "endpoint-route", displayPath(endpoint.route || "/")));
    const meta = el("span", "endpoint-meta");
    meta.append(document.createTextNode(`${endpoint.observation_count || 0} наблюд.`));
    const dot = el("i"); meta.append(dot);
    meta.append(document.createTextNode(`${endpoint.graph_mapped_observation_count || 0} в графе`));
    copy.append(meta);
    button.append(method, copy);
    button.addEventListener("click", () => openEndpoint(endpoint));
    elements.endpointList.append(button);
  }
  elements.endpointCount.textContent = state.endpoints.length || "0";
  elements.loadMore.hidden = !state.endpointCursor;
}

function emptyList(title, copy) {
  const item = el("div", "empty-list");
  item.append(el("strong", "", title), document.createTextNode(copy));
  return item;
}

function endpointKey(endpoint) { return [endpoint.host, endpoint.port, endpoint.route, endpoint.method].join("\u0000"); }

async function openEndpoint(endpoint) {
  state.selectedEndpoint = endpoint;
  state.routeScope = true;
  state.hiddenKinds = new Set(OVERVIEW_HIDDEN_KINDS);
  state.selectedNode = null;
  state.graph = null;
  renderEndpointList();
  renderInspectorEmpty();
  const seeds = (endpoint.sampled_graph_seed_ids || []).slice(0, 20);
  elements.graphTitle.textContent = displayPath(endpoint.route || "/");
  elements.graphTitle.title = MASKED_PATH_HELP;
  elements.graphSubtitle.textContent = `${endpoint.method}  ·  ${endpoint.host}${endpoint.port ? `:${endpoint.port}` : ""}  ·  ${endpoint.observation_count || 0} запросов по этому шаблону`;
  elements.graphCounts.title = "Узлы и связи только в текущем срезе графа для выбранного маршрута; это не общее число запросов проекта.";
  if (!seeds.length) {
    elements.graphCounts.replaceChildren(countText(0, "узлов"), el("b"), countText(0, "связей"));
    renderEmpty("Для endpoint нет graph mapping", "Индекс содержит маршрут, но выбранные наблюдения пока не связаны с BehaviorGraph.");
    elements.inspector.replaceChildren(emptyList("Нет узла для просмотра", "Для этого endpoint графовых наблюдений пока не найдено."));
    setStatus("Наблюдения не связаны с графом");
    return;
  }
  await loadGraph(seeds);
}

async function loadGraph(seeds) {
  if (!state.projectKey || !Array.isArray(seeds) || !seeds.length) return;
  state.loadingGraph = true;
  renderEmpty("Загружаю связи графа", "Читаю ограниченную read-only окрестность выбранных узлов.");
  setStatus("Загрузка окрестности графа", "loading");
  const query = new URLSearchParams({ project_key: state.projectKey });
  for (const seed of seeds.slice(0, 20)) query.append("seed", seed);
  try {
    state.graph = await getJSON(`/api/graph?${query}`);
    state.selectedNode = null;
    renderGraph();
    const first = state.renderedEntities.find(isSelectedEndpointNode) || state.renderedEntities.find(item => seeds.includes(item.id)) || state.renderedEntities[0];
    if (first) selectNode(first.id);
    else renderInspectorEmpty();
    const partial = Boolean(state.graph.incomplete || state.graph.truncated);
    setStatus(partial ? "Граф загружен · покрытие частичное" : "Граф загружен", "ready");
    if (partial) elements.coverage.textContent = "Покрытие графа: частичное";
  } catch (error) {
    state.graph = null;
    renderEmpty("Не удалось построить граф", error.message || "Проверьте совместимость локальной BehaviorGraph базы.");
    elements.graphCounts.replaceChildren(countText(0, "узлов"), el("b"), countText(0, "связей"));
    elements.inspector.replaceChildren(emptyList("Граф недоступен", "Выберите другой endpoint или проверьте целостность графовой базы."));
    setStatus("Ошибка чтения графа", "error");
  } finally { state.loadingGraph = false; }
}

function renderEmpty(title, copy) {
  elements.canvasEmpty.hidden = false;
  elements.emptyTitle.textContent = title;
  elements.emptyCopy.textContent = copy;
  elements.graphScene.replaceChildren();
  state.renderedEntities = [];
  state.renderedAssertions = [];
}

function renderGraph(resetView = true) {
  const graph = state.graph || {};
  const allEntities = Array.isArray(graph.entities) ? graph.entities : [];
  const allAssertions = Array.isArray(graph.assertions) ? graph.assertions : [];
  const scoped = state.routeScope ? selectedEndpointNeighborhood(allEntities, allAssertions) : null;
  const entities = scoped?.entities || allEntities;
  const assertions = scoped?.assertions || allAssertions;
  renderGraphFilters(entities);
  if (!allEntities.length) {
    state.renderedEntities = [];
    state.renderedAssertions = [];
    renderEmpty("Окрестность графа пуста", "Для выбранных seed ID не найдено связанных сущностей.");
    elements.graphCounts.replaceChildren(countText(0, "узлов"), el("b"), countText(0, "связей"));
    return;
  }
  const visible = entities.filter(node => !state.hiddenKinds.has(node.kind));
  const visibleIds = new Set(visible.map(node => node.id));
  const visibleAssertions = assertions.filter(edge => visibleIds.has(edge.subject) && visibleIds.has(edge.object));
  const connectedIds = new Set();
  for (const edge of visibleAssertions) { connectedIds.add(edge.subject); connectedIds.add(edge.object); }
  const seedIds = new Set(state.graph?.seed_ids || []);
  const renderedEntities = visible.filter(node => connectedIds.has(node.id) || seedIds.has(node.id) || isSelectedEndpointNode(node));
  const renderedIds = new Set(renderedEntities.map(node => node.id));
  const renderedAssertions = visibleAssertions.filter(edge => renderedIds.has(edge.subject) && renderedIds.has(edge.object));
  state.renderedEntities = renderedEntities;
  state.renderedAssertions = renderedAssertions;
  renderGraphFilters(entities, renderedEntities);
  if (!renderedEntities.length) {
    state.selectedNode = null;
    elements.graphCanvas.setAttribute("viewBox", "0 0 960 560");
    elements.graphScene.replaceChildren();
    elements.canvasEmpty.hidden = false;
    elements.emptyTitle.textContent = "Узлы скрыты фильтрами";
    elements.emptyCopy.textContent = "Включите тип узла или выберите «Все узлы», чтобы увидеть связи.";
    elements.graphCounts.replaceChildren(countText(0, "показано"), el("b"), countText(entities.length, "в обзоре"));
    elements.graphCounts.title = `В выбранном представлении ${entities.length} узлов и ${assertions.length} связей; полный обход содержит ${allEntities.length} узлов и ${allAssertions.length} связей.`;
    renderInspectorEmpty();
    return;
  }
  elements.canvasEmpty.hidden = true;
  elements.graphCounts.replaceChildren(countText(renderedEntities.length, "показано"), el("b"), countText(renderedAssertions.length, "связей"), el("b"), countText(entities.length, "в обзоре"));
  elements.graphCounts.title = state.routeScope
    ? `Обзор выбранного маршрута: ${renderedEntities.length} из ${entities.length} узлов. Полный обход содержит ${allEntities.length} узлов и ${allAssertions.length} связей.`
    : `Показаны ${renderedEntities.length} из ${entities.length} узлов и ${renderedAssertions.length} из ${assertions.length} связей полного среза.`;
  elements.graphScene.replaceChildren();
  const layout = layoutGraph(renderedEntities, renderedAssertions);
  const edgeLayer = svgEl("g", { class: "edge-layer" });
  for (const edge of renderedAssertions) {
    const from = layout.positions.get(edge.subject);
    const to = layout.positions.get(edge.object);
    if (!from || !to) continue;
    const dx = to.x - from.x, dy = to.y - from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const offset = Math.min(80, length * 0.17);
    const sx = from.x + dx / length * offset, sy = from.y + dy / length * offset;
    const ex = to.x - dx / length * offset, ey = to.y - dy / length * offset;
    const bend = Math.min(56, Math.abs(dy) * .18 + 10);
    const curve = svgEl("path", { d: `M${sx},${sy} Q${(sx + ex) / 2 - bend},${(sy + ey) / 2} ${ex},${ey}`, class: `edge-path${edge.evidence_state === "contested" ? " edge-contested" : ""}` });
    edgeLayer.append(curve);
    if (state.edgeLabelsVisible) {
      const label = svgEl("text", { x: (sx + ex) / 2, y: (sy + ey) / 2 - 7, class: "edge-label", "text-anchor": "middle" });
      label.textContent = relationLabels[edge.predicate] || String(edge.predicate || "связь").replaceAll("_", " ");
      edgeLayer.append(label);
    }
  }
  elements.graphScene.append(edgeLayer);
  for (const node of renderedEntities) {
    const point = layout.positions.get(node.id);
    if (point) elements.graphScene.append(renderNode(node, point));
  }
  elements.graphCanvas.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
  if (resetView) { state.zoom = 1; state.panX = 0; state.panY = 0; }
  applyTransform();
  if (!state.selectedNode || !renderedEntities.some(node => node.id === state.selectedNode.id)) {
    state.selectedNode = null;
    const replacement = renderedEntities.find(isSelectedEndpointNode) || renderedEntities.find(node => seedIds.has(node.id)) || renderedEntities[0];
    if (replacement) selectNode(replacement.id);
    else renderInspectorEmpty();
  }
}

function renderGraphFilters(entities, renderedEntities = state.renderedEntities) {
  if (!elements.graphFilters) return;
  const counts = new Map();
  for (const node of entities) counts.set(node.kind || "entity", (counts.get(node.kind || "entity") || 0) + 1);
  const renderedCounts = new Map();
  for (const node of renderedEntities || []) renderedCounts.set(node.kind || "entity", (renderedCounts.get(node.kind || "entity") || 0) + 1);
  const kinds = [...counts.keys()].sort((a, b) => (filterLabels[a] || a).localeCompare(filterLabels[b] || b, "ru"));
  elements.graphFilters.replaceChildren();
  const overview = elements.graphOverview;
  const showAll = elements.graphShowAll;
  if (overview) {
    overview.disabled = kinds.length === 0;
    overview.setAttribute("aria-pressed", String(kinds.length > 0 && isOverviewView(kinds)));
  }
  if (showAll) {
    showAll.disabled = kinds.length === 0;
    showAll.setAttribute("aria-pressed", String(kinds.length > 0 && kinds.every(kind => !state.hiddenKinds.has(kind))));
  }
  for (const kind of kinds) {
    const count = counts.get(kind) || 0;
    const visible = !state.hiddenKinds.has(kind);
    const chip = el("button", `graph-filter${visible ? " active" : ""}`);
    chip.type = "button";
    chip.setAttribute("aria-pressed", String(visible));
    const actuallyShown = renderedCounts.get(kind) || 0;
    chip.title = visible
      ? `${filterLabels[kind] || nodeLabels[kind] || kind}: ${count} в срезе, ${actuallyShown} показано`
      : `${filterLabels[kind] || nodeLabels[kind] || kind}: скрыто, ${count} в срезе`;
    chip.append(document.createTextNode(`${filterLabels[kind] || nodeLabels[kind] || kind} `), el("b", "", count));
    chip.addEventListener("click", () => {
      if (state.hiddenKinds.has(kind)) state.hiddenKinds.delete(kind);
      else state.hiddenKinds.add(kind);
      renderGraph(false);
    });
    elements.graphFilters.append(chip);
  }
  const hidden = kinds.filter(kind => state.hiddenKinds.has(kind));
  if (elements.graphFilterSummary) {
    elements.graphFilterSummary.textContent = hidden.length
      ? `Скрыто типов: ${hidden.map(kind => filterLabels[kind] || nodeLabels[kind] || kind).join(", ")}`
      : "Показаны все типы";
  }
}

function isOverviewView(kinds = []) {
  return OVERVIEW_HIDDEN_KINDS.every(kind => !kinds.includes(kind) || state.hiddenKinds.has(kind)) &&
    kinds.every(kind => OVERVIEW_HIDDEN_KINDS.includes(kind) || !state.hiddenKinds.has(kind));
}

function isSelectedEndpointNode(node) {
  if (node.kind !== "endpoint" || !state.selectedEndpoint) return false;
  const endpointIds = selectedEndpointIds();
  if (endpointIds.size) return endpointIds.has(node.id);
  const data = node.data || {};
  const routeMatches = normalizedRoute(data.path) === normalizedRoute(state.selectedEndpoint.route);
  const origin = String(data.origin || "").toLowerCase();
  const hostMatches = !origin || origin.includes(String(state.selectedEndpoint.host || "").toLowerCase());
  const portMatches = !origin || !state.selectedEndpoint.port || origin.endsWith(`:${state.selectedEndpoint.port}`);
  return routeMatches && hostMatches && portMatches && String(data.method || "").toUpperCase() === String(state.selectedEndpoint.method || "").toUpperCase();
}

function selectedEndpointIds() {
  const seedIds = new Set(state.selectedEndpoint?.sampled_graph_seed_ids || []);
  if (!seedIds.size) return new Set();
  return new Set((state.graph?.entities || [])
    .filter(node => node.kind === "observation" && seedIds.has(node.id))
    .map(node => node.data?.endpoint_id)
    .filter(Boolean));
}

function normalizedRoute(value) {
  return displayPath(value).replace(/\/{2,}/g, "/").toLowerCase();
}

function selectGraphView(view) {
  state.routeScope = view === "overview";
  state.hiddenKinds = new Set(view === "overview" ? OVERVIEW_HIDDEN_KINDS : []);
  renderGraph(true);
  const node = state.renderedEntities.find(isSelectedEndpointNode) || state.renderedEntities.find(item => (state.graph?.seed_ids || []).includes(item.id)) || state.renderedEntities[0];
  if (node) selectNode(node.id);
}

function selectedEndpointNeighborhood(entities, assertions) {
  const endpointIds = selectedEndpointIds();
  const endpoints = entities.filter(node => node.kind === "endpoint" && (endpointIds.size ? endpointIds.has(node.id) : isSelectedEndpointNode(node)));
  if (!endpoints.length) return null;
  const byId = new Map(entities.map(node => [node.id, node]));
  const included = new Set(endpoints.map(node => node.id));
  const addNonEndpointNeighbors = nodeId => {
    for (const edge of assertions) {
      const otherId = edge.subject === nodeId ? edge.object : edge.object === nodeId ? edge.subject : null;
      const other = otherId ? byId.get(otherId) : null;
      if (other && other.kind !== "endpoint") included.add(other.id);
    }
  };
  for (const endpoint of endpoints) addNonEndpointNeighbors(endpoint.id);
  for (const node of entities) {
    if (node.kind === "observation" && endpoints.some(endpoint => node.data?.endpoint_id === endpoint.id)) {
      included.add(node.id);
      addNonEndpointNeighbors(node.id);
    }
  }
  const scopedEntities = entities.filter(node => included.has(node.id));
  const scopedIds = new Set(scopedEntities.map(node => node.id));
  const scopedAssertions = assertions.filter(edge => scopedIds.has(edge.subject) && scopedIds.has(edge.object));
  return { entities: scopedEntities, assertions: scopedAssertions };
}

function layoutGraph(entities, assertions) {
  const ids = new Set(entities.map(node => node.id));
  const neighbors = new Map(entities.map(node => [node.id, []]));
  for (const edge of assertions) {
    if (ids.has(edge.subject) && ids.has(edge.object)) {
      neighbors.get(edge.subject).push(edge.object);
      neighbors.get(edge.object).push(edge.subject);
    }
  }
  const seedIds = (state.graph?.seed_ids || []).filter(id => ids.has(id));
  const selectedEndpoint = entities.find(isSelectedEndpointNode);
  const root = seedIds[0] || selectedEndpoint?.id || entities[0]?.id;
  const distances = new Map([[root, 0]]), queue = [root];
  for (let i = 0; i < queue.length; i++) {
    for (const neighbor of neighbors.get(queue[i]) || []) {
      if (distances.has(neighbor)) continue;
      distances.set(neighbor, distances.get(queue[i]) + 1); queue.push(neighbor);
    }
  }
  const byDepth = new Map();
  for (const item of entities) {
    const depth = distances.get(item.id) ?? 0;
    if (!byDepth.has(depth)) byDepth.set(depth, []);
    byDepth.get(depth).push(item);
  }
  for (const group of byDepth.values()) group.sort((a, b) => displayTitle(a).localeCompare(displayTitle(b)));
  const maxDepth = Math.max(...byDepth.keys(), 1);
  const maxRows = Math.max(...[...byDepth.values()].map(group => group.length), 1);
  const width = Math.max(960, 240 + maxDepth * 225);
  const height = Math.max(560, 140 + maxRows * 128);
  const positions = new Map();
  for (const [depth, group] of byDepth) {
    const span = group.length * 128;
    const startY = (height - span) / 2 + 64;
    group.forEach((item, index) => positions.set(item.id, { x: 120 + depth * ((width - 240) / Math.max(1, maxDepth)), y: startY + index * 128 }));
  }
  return { positions, width, height };
}

function renderNode(node, point) {
  const kind = String(node.kind || "entity");
  const group = svgEl("g", { class: `node-group type-${safeClass(kind)}${state.selectedNode?.id === node.id ? " selected" : ""}`, transform: `translate(${point.x - 88} ${point.y - 34})`, tabindex: "0", role: "button", "data-node-id": node.id, "aria-label": `${nodeLabels[kind] || kind}, ${displayTitle(node)}` });
  group.append(svgEl("rect", { class: "node-card", x: 0, y: 0, width: 176, height: 68, rx: 8 }));
  group.append(svgEl("rect", { class: "node-accent", x: 0, y: 12, width: 3, height: 44 }));
  const label = svgEl("text", { class: "node-kind", x: 13, y: 17 }); label.textContent = nodeLabels[kind] || kind.toUpperCase(); group.append(label);
  const title = svgEl("text", { class: "node-title", x: 13, y: 37 }); title.textContent = truncate(displayTitle(node), 22); group.append(title);
  const subtitle = svgEl("text", { class: "node-subtitle", x: 13, y: 54 }); subtitle.textContent = truncate(displaySubtitle(node), 25); group.append(subtitle);
  group.addEventListener("click", event => { event.stopPropagation(); selectNode(node.id); });
  group.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectNode(node.id); } });
  return group;
}

function displayTitle(node) {
  const data = node.data || {};
  if (node.kind === "endpoint") return `${data.method || "?"} ${displayPath(data.path || "/")}`;
  if (node.kind === "observation") return `${data.observation_kind === "live_capture" ? "Live-захват" : "Захват"}${data.http_status ? ` · HTTP ${data.http_status}` : ""}`;
  if (node.kind === "parameter") return displayPath(data.path || data.name || "Параметр");
  if (node.kind === "request_variant") return "Структура запроса";
  if (node.kind === "response_variant") return "Структура ответа";
  if (node.kind === "asset") return data.origin || "Хост";
  return data.label || data.name || node.kind || "Сущность";
}

function displaySubtitle(node) {
  const data = node.data || {};
  if (node.kind === "observation") return data.observed_at && data.observed_at !== "unknown" ? data.observed_at : "Время захвата не указано";
  if (node.kind === "endpoint") return (data.query_names || []).slice(0, 4).join(" · ") || "Шаблон маршрута · значения скрыты";
  if (node.kind === "parameter") return [data.type, data.location].filter(Boolean).join(" · ") || "Структурное поле";
  if (node.kind === "request_variant" || node.kind === "response_variant") {
    const headers = Array.isArray(data.header_metadata) ? data.header_metadata.length : 0;
    const fields = Array.isArray(data.fields) ? data.fields.length : 0;
    const parts = [node.kind === "request_variant" ? data.method : (data.status ? `HTTP ${data.status}` : "HTTP-ответ")];
    if (data.content_type) parts.push(data.content_type === "unknown" ? "тип не указан" : data.content_type);
    parts.push(`${headers} заголовков`, `${fields} полей`);
    if (data.body_bytes !== null && data.body_bytes !== undefined) parts.push(`тело ${formatBytes(data.body_bytes)}`);
    if (data.parse_state !== "complete") parts.push("разбор неполный");
    return parts.filter(Boolean).join(" · ");
  }
  if (node.kind === "asset") return data.program ? `Проект ${short(data.program, 12)}` : "Наблюдаемый хост";
  return node.id || "";
}

function selectNode(nodeId) {
  const node = (state.graph?.entities || []).find(item => item.id === nodeId);
  if (!node) return;
  state.selectedNode = node;
  for (const group of elements.graphScene.querySelectorAll(".node-group")) group.classList.toggle("selected", group.getAttribute("data-node-id") === nodeId);
  renderInspector(node);
}

function renderInspector(node) {
  elements.inspector.replaceChildren();
  elements.inspectIndex.textContent = String((state.graph?.entities || []).findIndex(item => item.id === node.id) + 1).padStart(2, "0");
  const kind = String(node.kind || "entity");
  const badge = el("span", "detail-kind");
  badge.classList.add(`kind-${safeClass(kind)}`);
  const dot = el("i");
  badge.append(dot, document.createTextNode(nodeLabels[kind] || kind.toUpperCase()));
  elements.inspector.append(badge, el("h3", "detail-title", displayTitle(node)), el("div", "detail-id", node.id || "ID недоступен"));
  const rows = safeDetails(node);
  if (node.kind === "observation") {
    const note = el("div", "detail-explainer");
    note.append(el("strong", "", "Что это значит"));
    note.append(el("span", "", "Запись об одном сохранённом запросе из Caido. HTTP 200 — только статус ответа; сам по себе он не означает ошибку или успешный разбор."));
    elements.inspector.append(note);
  }
  if (rows.length) {
    const section = el("section", "detail-section");
    section.append(el("div", "detail-section-title", "Наблюдаемые свойства"));
    const dl = el("dl");
    for (const [label, value] of rows) {
      const row = el("div", "detail-row"); row.append(el("dt", "", label), el("dd", "", value)); dl.append(row);
    }
    section.append(dl); elements.inspector.append(section);
  }
  if (node.kind === "endpoint" && Array.isArray(node.data?.query_names) && node.data.query_names.length) {
    const section = el("section", "detail-section");
    section.append(el("div", "detail-section-title", "Имена полей"));
    const tags = el("div", "tag-list");
    for (const name of node.data.query_names.slice(0, 40)) tags.append(el("span", "field-tag", name));
    section.append(tags); elements.inspector.append(section);
  }
  if (node.kind === "endpoint") {
    elements.inspector.append(el("p", "detail-help", "Это сгруппированный шаблон маршрута. Динамические значения не сохраняются в графе; точный запрос ищите в Caido по Request ID связанного захвата."));
  }
  if (node.kind === "observation") renderProvenance(node);
  const action = el("button", "detail-action", "Открыть связи от этого узла →");
  action.type = "button";
  action.disabled = !/^[a-z][a-z0-9_]*-[a-f0-9]{64}$/.test(node.id || "");
  action.addEventListener("click", () => { state.routeScope = false; void loadGraph([node.id]); });
  elements.inspector.append(action);
}

function safeDetails(node) {
  const data = node.data || {};
  const candidates = [
    ["Метод", data.method], ["Источник", data.origin], ["Путь", data.path ? displayPath(data.path) : undefined],
    ["Статус HTTP", data.http_status ?? data.status], ["Источник записи", data.observation_kind ? readableObservationKind(data.observation_kind) : undefined],
    ["Время", data.observed_at],
    ["Content-Type", data.content_type], ["Заголовки", data.header_metadata], ["Имена полей", data.fields],
    ["Размер тела", data.body_bytes === null || data.body_bytes === undefined ? undefined : formatBytes(data.body_bytes)],
    ["Состояние разбора", readableParseState(data.parse_state || data.analysis_state)],
    ["Тип поля", data.type], ["Расположение", data.location],
    ["Контекст", data.context?.scenario],
  ];
  return candidates.filter(([, value]) => value !== undefined && value !== null && value !== "").map(([label, value]) => [label, value === "unknown" ? (label === "Время" ? "не указано" : "неизвестно") : formatValue(value)]);
}

function readableParseState(value) {
  return ({ complete: "полный", incomplete: "неполный", partial_prefix: "обрезан", unknown_extent: "неизвестная длина", unknown: "неизвестно" })[value] || value;
}

function readableObservationKind(value) {
  return ({ historical_capture: "Исторический захват из Caido", live_capture: "Новый захват" })[value] || value;
}

function renderProvenance(node) {
  const items = (state.graph?.capture_provenance || []).filter(item => item.graph_observation_id === node.id);
  const section = el("section", "detail-section");
  section.append(el("div", "detail-section-title", `Связь с Caido · ${items.length}`));
  section.append(el("p", "detail-help", "ID запроса позволяет найти исходную запись в Caido. Содержимое HTTP в этом окне не показывается."));
  if (!items.length) {
    section.append(el("div", "provenance-item", "Локальная ссылка на исходный захват не привязана."));
  } else {
    for (const item of items.slice(0, 12)) {
      const line = el("div", "provenance-item");
      line.append(el("b", "", `ID запроса · ${item.request_id || "—"}`));
      line.append(el("span", "", `${readableRecordSource(item.record_source)} · ${formatBytes(item.request_size)}${item.first_seen_at ? ` · ${item.first_seen_at}` : ""}`));
      section.append(line);
    }
  }
  elements.inspector.append(section);
}

function readableRecordSource(value) {
  return ({ encrypted_local_capture: "локальный зашифрованный захват", caido_history: "история Caido", local: "локальная запись" })[value] || value || "локальная запись";
}

function formatValue(value) {
  if (value === "unknown") return "неизвестно";
  if (typeof value === "string") return truncate(value, 180);
  if (Array.isArray(value)) return value.map(item => item === "unknown" ? "неизвестно" : String(item)).slice(0, 12).join(", ");
  if (typeof value === "object") return "структурный контекст";
  return String(value);
}

function displayPath(value) {
  return String(value || "/")
    .replaceAll("{value}", "{параметр}")
    .replace(/(^|\/)segment_[a-f0-9]{16}(?=\/|$)/gi, "$1{параметр}");
}

function formatBytes(value) {
  const number = Number(value || 0);
  return number < 1024 ? `${number} B` : `${(number / 1024).toFixed(1)} KiB`;
}

function renderInspectorEmpty() {
  elements.inspector.replaceChildren();
  elements.inspectIndex.textContent = "—";
  const empty = el("div", "inspector-empty");
  empty.append(el("span", "inspect-target", "⌖"), el("strong", "", "Ничего не выбрано"), el("span", "", "Выберите узел на графе, чтобы посмотреть его свойства и источники."));
  elements.inspector.append(empty);
}

function applyTransform() {
  const scene = elements.graphScene;
  const view = elements.graphCanvas.viewBox.baseVal;
  scene.setAttribute("transform", `translate(${state.panX} ${state.panY}) translate(${view.width / 2} ${view.height / 2}) scale(${state.zoom}) translate(${-view.width / 2} ${-view.height / 2})`);
  elements.zoom.textContent = `${Math.round(state.zoom * 100)}%`;
  elements.zoomIn.disabled = state.zoom >= MAX_GRAPH_ZOOM;
  elements.zoomOut.disabled = state.zoom <= MIN_GRAPH_ZOOM;
}

function setZoom(nextZoom, clientX, clientY) {
  const previousZoom = state.zoom;
  const zoom = Math.max(MIN_GRAPH_ZOOM, Math.min(MAX_GRAPH_ZOOM, nextZoom));
  if (zoom === previousZoom) return;
  if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
    const svg = elements.graphCanvas;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const anchor = point.matrixTransform(ctm.inverse());
      const view = svg.viewBox.baseVal;
      state.panX += (previousZoom - zoom) * (anchor.x - view.width / 2);
      state.panY += (previousZoom - zoom) * (anchor.y - view.height / 2);
    }
  }
  state.zoom = zoom;
  applyTransform();
}

function stepZoom(direction) {
  const step = state.zoom < 2 ? 0.25 : state.zoom < 5 ? 0.5 : 1;
  setZoom(state.zoom + direction * step);
}

function setGraphFocus(enabled) {
  state.graphFocus = Boolean(enabled);
  elements.workspace.classList.toggle("graph-focus", state.graphFocus);
  elements.focusGraph.setAttribute("aria-pressed", String(state.graphFocus));
  elements.focusGraph.querySelector("span").textContent = state.graphFocus ? "Панели" : "Развернуть";
  elements.focusGraph.title = state.graphFocus ? "Показать каталог и инспектор" : "Развернуть граф на весь экран";
  requestAnimationFrame(applyTransform);
}

function short(value, max) { const text = String(value || ""); return text.length > max ? `${text.slice(0, max - 1)}…` : text; }
function truncate(value, max) { return short(value, max); }
function safeClass(value) { return String(value).replace(/[^a-z0-9_-]/gi, "-"); }

elements.project.addEventListener("change", () => {
  if (elements.project.value === "__load_more__") {
    void loadProjects(true);
    return;
  }
  void selectProject(elements.project.value);
});
elements.filter.addEventListener("input", renderEndpointList);
elements.loadMore.addEventListener("click", () => loadSurface(true));
$("#refresh-button").addEventListener("click", () => loadProjects());
elements.zoomIn.addEventListener("click", () => stepZoom(1));
elements.zoomOut.addEventListener("click", () => stepZoom(-1));
$("#fit-graph").addEventListener("click", () => { state.zoom = 1; state.panX = 0; state.panY = 0; applyTransform(); });
elements.focusGraph.addEventListener("click", () => setGraphFocus(!state.graphFocus));
elements.graphOverview?.addEventListener("click", () => selectGraphView("overview"));
elements.graphShowAll?.addEventListener("click", () => selectGraphView("all"));
elements.edgeLabels?.addEventListener("click", () => {
  state.edgeLabelsVisible = !state.edgeLabelsVisible;
  elements.edgeLabels.setAttribute("aria-pressed", String(state.edgeLabelsVisible));
  elements.edgeLabels.setAttribute("aria-label", state.edgeLabelsVisible ? "Скрыть подписи связей" : "Показать подписи связей");
  elements.edgeLabels.title = state.edgeLabelsVisible ? "Скрыть подписи связей" : "Показать подписи связей";
  renderGraph(false);
});
elements.graphCanvas.addEventListener("pointerdown", event => {
  if (event.target.closest?.(".node-group")) return;
  event.preventDefault();
  const view = elements.graphCanvas.viewBox.baseVal;
  const rect = elements.graphCanvas.getBoundingClientRect();
  state.drag = { x: event.clientX, y: event.clientY, scaleX: view.width / rect.width, scaleY: view.height / rect.height, panX: state.panX, panY: state.panY, pointer: event.pointerId };
  elements.graphCanvas.setPointerCapture(event.pointerId);
});
elements.graphCanvas.addEventListener("pointermove", event => {
  if (!state.drag || state.drag.pointer !== event.pointerId) return;
  state.panX = state.drag.panX + (event.clientX - state.drag.x) * state.drag.scaleX;
  state.panY = state.drag.panY + (event.clientY - state.drag.y) * state.drag.scaleY;
  applyTransform();
});
elements.graphCanvas.addEventListener("pointerup", event => {
  if (state.drag?.pointer === event.pointerId) state.drag = null;
});
elements.graphCanvas.addEventListener("wheel", event => {
  if (!state.graph) return;
  event.preventDefault();
  setZoom(state.zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15), event.clientX, event.clientY);
}, { passive: false });
document.addEventListener("keydown", event => {
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) { event.preventDefault(); elements.filter.focus(); }
  if (["+", "="].includes(event.key) && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) { stepZoom(1); }
  if (event.key === "-" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) { stepZoom(-1); }
  if (event.key === "0" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) { state.zoom = 1; state.panX = 0; state.panY = 0; applyTransform(); }
  if (event.key === "Escape" && state.graphFocus) setGraphFocus(false);
});

loadProjects();
