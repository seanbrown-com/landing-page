const STORAGE_KEY = "home-network-landing-page";
const DEFAULT_SECTION_TITLE = "Services";
const DEFAULT_PAGE_ICON = "assets/home-apps.svg";
const DEFAULT_STATE = {
  title: "Home Services",
  icon: "",
  banner: "",
  sections: []
};

const state = loadState();
let saveTimer = 0;

const elements = {
  hero: document.getElementById("hero"),
  pageIcon: document.getElementById("pageIcon"),
  pageTitle: document.getElementById("pageTitle"),
  editToggle: document.getElementById("editToggle"),
  titleInput: document.getElementById("titleInput"),
  iconInput: document.getElementById("iconInput"),
  bannerInput: document.getElementById("bannerInput"),
  removeIcon: document.getElementById("removeIcon"),
  removeBanner: document.getElementById("removeBanner"),
  sectionForm: document.getElementById("sectionForm"),
  sectionTitle: document.getElementById("sectionTitle"),
  tileForm: document.getElementById("tileForm"),
  tileTitle: document.getElementById("tileTitle"),
  tileUrl: document.getElementById("tileUrl"),
  tileImage: document.getElementById("tileImage"),
  tileSection: document.getElementById("tileSection"),
  formStatus: document.getElementById("formStatus"),
  sections: document.getElementById("sections"),
  sectionTemplate: document.getElementById("sectionTemplate"),
  tileTemplate: document.getElementById("tileTemplate")
};

render();
loadSharedState();

elements.editToggle.addEventListener("click", () => {
  const isEditing = document.body.classList.toggle("is-editing");
  elements.editToggle.setAttribute("aria-pressed", String(isEditing));
  elements.editToggle.querySelector("span:last-child").textContent = isEditing ? "Done" : "Edit";
});

elements.titleInput.addEventListener("input", () => {
  state.title = elements.titleInput.value.trim() || DEFAULT_STATE.title;
  persistAndRender();
});

elements.bannerInput.addEventListener("change", async () => {
  const [file] = elements.bannerInput.files;

  if (!file) {
    return;
  }

  state.banner = await resizeImage(file, 1600, 520);
  elements.bannerInput.value = "";
  persistAndRender();
});

elements.iconInput.addEventListener("change", async () => {
  const [file] = elements.iconInput.files;

  if (!file) {
    return;
  }

  state.icon = await resizeImage(file, 96, 96);
  elements.iconInput.value = "";
  persistAndRender();
});

elements.removeIcon.addEventListener("click", () => {
  state.icon = "";
  persistAndRender();
});

elements.removeBanner.addEventListener("click", () => {
  state.banner = "";
  persistAndRender();
});

elements.sectionForm.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    const title = elements.sectionTitle.value.trim() || `Section ${state.sections.length + 1}`;
    state.sections.push(createSection(title));
    elements.sectionForm.reset();
    clearStatus();
    persistAndRender();
  } catch (error) {
    showStatus(error);
  }
});

elements.tileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const [file] = elements.tileImage.files;

    if (!file) {
      return;
    }

    const section = findSection(elements.tileSection.value) || ensureSection();

    section.tiles.push({
      id: createId(),
      title: elements.tileTitle.value.trim(),
      url: normalizeUrl(elements.tileUrl.value.trim()),
      image: await resizeImage(file, 56, 56)
    });

    elements.tileForm.reset();
    elements.tileSection.value = section.id;
    clearStatus();
    persistAndRender();
  } catch (error) {
    showStatus(error);
  }
});

elements.sections.addEventListener("click", (event) => {
  const sectionButton = event.target.closest("button[data-section-action]");
  const tileButton = event.target.closest("button[data-action]");

  if (sectionButton) {
    handleSectionAction(sectionButton);
    return;
  }

  if (tileButton) {
    handleTileAction(tileButton);
  }
});

elements.sections.addEventListener("change", (event) => {
  const select = event.target.closest("select[data-action='move']");

  if (!select) {
    return;
  }

  const sectionNode = select.closest(".service-section");
  const tileNode = select.closest(".tile");
  const fromSection = findSection(sectionNode.dataset.sectionId);
  const toSection = findSection(select.value);
  const tileIndex = Number(tileNode.dataset.index);

  if (!fromSection || !toSection || fromSection.id === toSection.id) {
    return;
  }

  const [tile] = fromSection.tiles.splice(tileIndex, 1);
  toSection.tiles.push(tile);
  persistAndRender();
});

function render() {
  elements.pageTitle.textContent = state.title || DEFAULT_STATE.title;
  elements.pageIcon.src = state.icon || DEFAULT_PAGE_ICON;
  document.title = state.title || DEFAULT_STATE.title;
  elements.titleInput.value = state.title || DEFAULT_STATE.title;
  elements.hero.style.backgroundImage = state.banner
    ? `linear-gradient(135deg, rgba(16, 18, 20, 0.88), rgba(16, 18, 20, 0.22)), url("${state.banner}")`
    : "";

  renderSectionOptions();
  elements.sections.replaceChildren(...state.sections.map(createSectionElement));
}

function renderSectionOptions() {
  const current = elements.tileSection.value;
  const options = state.sections.map(createSectionOption);

  if (options.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Services";
    options.push(option);
  }

  elements.tileSection.replaceChildren(...options);
  elements.tileSection.value = findSection(current) ? current : state.sections[0]?.id || "";
}

function createSectionElement(section, sectionIndex) {
  const fragment = elements.sectionTemplate.content.cloneNode(true);
  const sectionNode = fragment.querySelector(".service-section");
  const title = fragment.querySelector(".service-section__title");
  const tiles = fragment.querySelector(".tiles");

  sectionNode.dataset.sectionId = section.id;
  sectionNode.dataset.sectionIndex = String(sectionIndex);
  title.textContent = section.title;
  tiles.replaceChildren(...section.tiles.map((tile, tileIndex) => createTile(tile, tileIndex, section)));

  fragment.querySelector('[data-section-action="up"]').disabled = sectionIndex === 0;
  fragment.querySelector('[data-section-action="down"]').disabled = sectionIndex === state.sections.length - 1;

  return fragment;
}

function createTile(tile, index, section) {
  const fragment = elements.tileTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".tile");
  const link = fragment.querySelector(".tile__link");
  const image = fragment.querySelector(".tile__image");
  const title = fragment.querySelector(".tile__title");
  const moveSelect = fragment.querySelector(".tile__move");

  item.dataset.index = String(index);
  link.href = tile.url;
  image.src = tile.image;
  image.alt = "";
  title.textContent = tile.title;
  moveSelect.replaceChildren(...state.sections.map(createSectionOption));
  moveSelect.value = section.id;

  fragment.querySelector('[data-action="up"]').disabled = index === 0;
  fragment.querySelector('[data-action="down"]').disabled = index === section.tiles.length - 1;

  return fragment;
}

function createSectionOption(section) {
  const option = document.createElement("option");
  option.value = section.id;
  option.textContent = section.title;
  return option;
}

function handleSectionAction(button) {
  const sectionNode = button.closest(".service-section");
  const sectionIndex = Number(sectionNode.dataset.sectionIndex);
  const section = state.sections[sectionIndex];
  const action = button.dataset.sectionAction;

  if (!section) {
    return;
  }

  if (action === "delete") {
    if (section.tiles.length > 0 && !confirm(`Delete "${section.title}" and its tiles?`)) {
      return;
    }

    state.sections.splice(sectionIndex, 1);
  }

  if (action === "up" && sectionIndex > 0) {
    swapItems(state.sections, sectionIndex, sectionIndex - 1);
  }

  if (action === "down" && sectionIndex < state.sections.length - 1) {
    swapItems(state.sections, sectionIndex, sectionIndex + 1);
  }

  persistAndRender();
}

function handleTileAction(button) {
  const sectionNode = button.closest(".service-section");
  const tileNode = button.closest(".tile");
  const section = findSection(sectionNode.dataset.sectionId);
  const index = Number(tileNode.dataset.index);
  const action = button.dataset.action;

  if (!section) {
    return;
  }

  if (action === "delete") {
    section.tiles.splice(index, 1);
  }

  if (action === "up" && index > 0) {
    swapItems(section.tiles, index, index - 1);
  }

  if (action === "down" && index < section.tiles.length - 1) {
    swapItems(section.tiles, index, index + 1);
  }

  persistAndRender();
}

function swapItems(items, from, to) {
  const [item] = items.splice(from, 1);
  items.splice(to, 0, item);
}

function ensureSection() {
  if (state.sections.length === 0) {
    state.sections.push(createSection(DEFAULT_SECTION_TITLE));
  }

  return state.sections[0];
}

function createSection(title) {
  return {
    id: createId(),
    title,
    tiles: []
  };
}

function findSection(sectionId) {
  return state.sections.find((section) => section.id === sectionId);
}

function persistAndRender() {
  saveLocalState();
  render();
  scheduleSharedSave();
}

function saveLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function loadSharedState() {
  try {
    const response = await fetch("api/state", { cache: "no-store" });

    if (!response.ok) return;

    const sharedState = normalizeSavedState(await response.json());

    replaceState(sharedState);
    saveLocalState();
    render();
  } catch {
    // Static file usage falls back to localStorage.
  }
}

function scheduleSharedSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveSharedState, 250);
}

async function saveSharedState() {
  try {
    const response = await fetch("api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    showStatus(`Could not save to the server (${error.message}). Changes are saved in this browser only.`);
    // Static file usage falls back to localStorage.
  }
}

function replaceState(nextState) {
  state.title = nextState.title;
  state.icon = nextState.icon;
  state.banner = nextState.banner;
  state.sections = nextState.sections;
}

function clearStatus() {
  elements.formStatus.textContent = "";
}

function showStatus(error) {
  elements.formStatus.textContent = typeof error === "string"
    ? error
    : error?.message || "Something went wrong. Please try again.";
}

function loadState() {
  try {
    return normalizeSavedState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return { ...DEFAULT_STATE, sections: [] };
  }
}

function normalizeSavedState(saved) {
  if (!saved) {
    return { ...DEFAULT_STATE, sections: [] };
  }

  if (Array.isArray(saved.sections)) {
    return {
      ...DEFAULT_STATE,
      ...saved,
      sections: saved.sections.map(normalizeSection).filter(Boolean)
    };
  }

  if (Array.isArray(saved.tiles)) {
    return {
      ...DEFAULT_STATE,
      ...saved,
      sections: [createSectionFromTiles(DEFAULT_SECTION_TITLE, saved.tiles)]
    };
  }

  return { ...DEFAULT_STATE, sections: [] };
}

function normalizeSection(section) {
  if (!section || !section.title || !Array.isArray(section.tiles)) {
    return null;
  }

  return {
    id: section.id || createId(),
    title: section.title,
    tiles: section.tiles.filter(isValidTile)
  };
}

function createSectionFromTiles(title, tiles) {
  return {
    id: createId(),
    title,
    tiles: tiles.filter(isValidTile)
  };
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const randomPart = Math.random().toString(36).slice(2, 10);
  return `id-${Date.now().toString(36)}-${randomPart}`;
}

function isValidTile(tile) {
  return tile && tile.title && tile.url && tile.image;
}

function normalizeUrl(url) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `https://${url}`;
}

function resizeImage(file, width, height) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      image.src = reader.result;
    });

    reader.addEventListener("error", () => reject(reader.error));

    image.addEventListener("load", () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const sourceRatio = image.width / image.height;
      const targetRatio = width / height;
      let sourceWidth = image.width;
      let sourceHeight = image.height;
      let sourceX = 0;
      let sourceY = 0;

      if (sourceRatio > targetRatio) {
        sourceWidth = image.height * targetRatio;
        sourceX = (image.width - sourceWidth) / 2;
      } else {
        sourceHeight = image.width / targetRatio;
        sourceY = (image.height - sourceHeight) / 2;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
      resolve(canvas.toDataURL("image/webp", 0.86));
    });

    image.addEventListener("error", () => reject(new Error("Could not read that image.")));
    reader.readAsDataURL(file);
  });
}
