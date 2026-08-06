import * as apiClient from '../api-client';
import type { ApiItem, ApiList, ItemCategory } from '../api-client';
import { distanceKm, formatKm } from '../geo';

// All user content is rendered via textContent — never innerHTML — so titles,
// notes, and comments cannot inject markup.

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string,
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

const KIND_BADGE: Record<ApiList['kind'], string> = {
    travel: '✈️',
    squat: '🍑',
    generic: '📋',
};

/** Category art: [gradient, emoji] — used when an item has no image. */
const CATEGORY_ART: Record<string, [string, string]> = {
    resort: ['linear-gradient(135deg, #8fa3c8, #52688f)', '🏔️'],
    onsen: ['linear-gradient(135deg, #e0704f, #a83a24)', '♨️'],
    food: ['linear-gradient(135deg, #d9a441, #a8722a)', '🍜'],
    other: ['linear-gradient(135deg, #9a8f7d, #6b6152)', '📍'],
};
const FILTERS: Array<'all' | ItemCategory> = ['all', 'resort', 'onsen', 'food', 'other'];

/** Auto-near radius: items within this distance join a hub's orbit unless overridden. */
const NEAR_RADIUS_KM = 30;

function hasCoords(i: ApiItem): i is ApiItem & { lat: number; lng: number } {
    return i.lat !== null && i.lng !== null;
}

/** A hub's orbit: manual overrides pointing at it + auto (unoverridden, within radius). */
function orbitOf(hub: ApiItem): Array<{ item: ApiItem; km: number | null }> {
    return currentItems
        .filter((i) => i.id !== hub.id)
        .flatMap((i) => {
            if (i.nearItemId === hub.id) {
                const km = hasCoords(i) && hasCoords(hub) ? distanceKm(i, hub) : null;
                return [{ item: i, km }];
            }
            if (i.nearItemId === null && hasCoords(i) && hasCoords(hub)) {
                const km = distanceKm(i, hub);
                if (km <= NEAR_RADIUS_KM) return [{ item: i, km }];
            }
            return [];
        })
        .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
}

interface DetailContext {
    listId: string;
    myUserId: string;
}
let currentFilter: 'all' | ItemCategory = 'all';
let currentItems: ApiItem[] = [];
let currentListRole: 'owner' | 'member' | null = null;
let openItemId: string | null = null;

// ── overview ───────────────────────────────────────────────────────
export async function renderListsOverview(): Promise<void> {
    const container = document.getElementById('lists-container')!;
    container.textContent = 'Loading lists…';
    try {
        const { lists } = await apiClient.getLists();
        container.textContent = '';
        if (lists.length === 0) {
            container.append(el('p', 'lists-empty', 'No lists yet — make the first one!'));
            return;
        }
        for (const list of lists) {
            const row = el('div', 'list-row');
            const link = el('a', 'list-link', `${KIND_BADGE[list.kind] ?? '📋'} ${list.name}`);
            link.href = `#/list/${list.id}`;
            row.append(link);
            if (!list.isMember) {
                const join = el('button', 'join-button', 'Join');
                join.addEventListener('click', () => {
                    void apiClient.joinList(list.id).then(() => {
                        window.location.hash = `#/list/${list.id}`;
                    });
                });
                row.append(join);
            }
            container.append(row);
        }
    } catch {
        container.textContent = 'Could not load lists.';
    }
}

export function initListCreate(): void {
    const nameInput = document.getElementById('new-list-name') as HTMLInputElement;
    document.getElementById('new-list-create')?.addEventListener('click', () => {
        const name = nameInput.value.trim();
        if (!name) return;
        void apiClient.createList(name, 'travel').then(({ list }) => {
            nameInput.value = '';
            window.location.hash = `#/list/${list.id}`;
        });
    });
}

// ── detail page (gallery) ──────────────────────────────────────────
export async function renderListDetail(listId: string, myUserId: string): Promise<void> {
    const title = document.getElementById('list-title')!;
    const container = document.getElementById('items-container')!;
    const addButton = document.getElementById('add-item-open')!;
    container.textContent = 'Loading…';

    const { lists } = await apiClient.getLists();
    const list = lists.find((l) => l.id === listId);
    if (!list) {
        title.textContent = 'List not found';
        container.textContent = '';
        return;
    }
    title.textContent = `${KIND_BADGE[list.kind] ?? '📋'} ${list.name}`;
    currentListRole = list.role;

    if (!list.isMember) {
        container.textContent = '';
        addButton.classList.add('hidden');
        document.getElementById('list-filters')!.textContent = '';
        const join = el('button', 'primary-button', `Join "${list.name}" to see it`);
        join.addEventListener('click', () => {
            void apiClient.joinList(listId).then(() => renderListDetail(listId, myUserId));
        });
        container.append(join);
        return;
    }
    addButton.classList.remove('hidden');

    const { items } = await apiClient.getItems(listId);
    currentItems = items;
    renderFilters(listId, myUserId);
    renderCards(listId, myUserId);

    // If the detail dialog is open (approve/comment refresh), refill it.
    if (openItemId) {
        const open = currentItems.find((i) => i.id === openItemId);
        if (open) fillItemDialog(open, { listId, myUserId });
    }
}

function renderFilters(listId: string, myUserId: string): void {
    const bar = document.getElementById('list-filters')!;
    bar.textContent = '';
    for (const f of FILTERS) {
        const b = el('button', `filter-chip${currentFilter === f ? ' on' : ''}`);
        b.textContent = f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1);
        b.addEventListener('click', () => {
            currentFilter = f;
            renderFilters(listId, myUserId);
            renderCards(listId, myUserId);
        });
        bar.append(b);
    }
}

function renderCards(listId: string, myUserId: string): void {
    const container = document.getElementById('items-container')!;
    container.textContent = '';
    const visible = currentItems.filter(
        (i) => currentFilter === 'all' || (i.category ?? 'other') === currentFilter,
    );
    if (visible.length === 0) {
        container.append(
            el('p', 'lists-empty', currentItems.length === 0 ? 'Nothing here yet — add the first thing!' : 'Nothing in this category yet.'),
        );
        return;
    }
    const grid = el('div', 'card-grid');
    for (const item of visible) {
        grid.append(renderCard(item, { listId, myUserId }));
    }
    container.append(grid);
}

function makeImgbox(item: ApiItem, className: string): HTMLElement {
    const [gradient, emoji] = CATEGORY_ART[item.category ?? 'other'] ?? CATEGORY_ART.other;
    const box = el('div', className);
    box.style.background = gradient;
    if (item.imageUrl) {
        const img = el('img') as HTMLImageElement;
        img.src = item.imageUrl;
        img.alt = '';
        img.loading = 'lazy';
        img.addEventListener('error', () => {
            img.remove();
            box.append(el('span', undefined, emoji));
        });
        box.append(img);
    } else {
        box.append(el('span', undefined, emoji));
    }
    return box;
}

function renderCard(item: ApiItem, context: DetailContext): HTMLElement {
    const card = el('div', 'item-card');
    card.append(makeImgbox(item, 'card-imgbox'));

    const body = el('div', 'card-body');
    body.append(el('div', 'card-title', item.title));
    if (item.region) body.append(el('div', 'card-region', item.region));
    if (item.note) body.append(el('p', 'card-blurb', item.note));
    const counts = el('div', 'card-counts');
    counts.append(
        el('span', undefined, `🐙 ${item.approvals.length}`),
        el('span', undefined, `💬 ${item.comments.length}`),
    );
    body.append(counts);
    card.append(body);

    card.addEventListener('click', () => openItemDialog(item, context));
    return card;
}

// ── detail dialog ──────────────────────────────────────────────────
function openItemDialog(item: ApiItem, context: DetailContext): void {
    openItemId = item.id;
    fillItemDialog(item, context);
    (document.getElementById('item-dialog') as HTMLDialogElement).showModal();
}

function fillItemDialog(item: ApiItem, context: DetailContext): void {
    const imgbox = document.getElementById('detail-imgbox')!;
    imgbox.replaceWith(Object.assign(makeImgbox(item, 'detail-imgbox'), { id: 'detail-imgbox' }));

    document.getElementById('detail-title')!.textContent = item.title;
    document.getElementById('detail-region')!.textContent = [item.region, item.category]
        .filter(Boolean)
        .join(' · ');
    document.getElementById('detail-note')!.textContent = item.note ?? '';

    const url = document.getElementById('detail-url') as HTMLAnchorElement;
    if (item.url) {
        url.href = item.url;
        url.textContent = `🌐 ${new URL(item.url).hostname.replace(/^www\./, '')}`;
        url.classList.remove('hidden');
    } else {
        url.classList.add('hidden');
    }

    // Maps link: a pasted Google Maps URL links directly; a legacy postal address (or
    // nothing) falls back to a Maps search on address / title + region.
    const map = document.getElementById('detail-map') as HTMLAnchorElement;
    if (item.address && /^https?:\/\//i.test(item.address)) {
        map.href = item.address;
        map.textContent = '📍 Map';
    } else {
        const mapQuery = item.address ?? [item.title, item.region].filter(Boolean).join(' ');
        map.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
        map.textContent = item.address ? `📍 ${item.address}` : '📍 Map';
    }

    const remove = document.getElementById('detail-remove')!;
    const canRemove = currentListRole === 'owner' || item.createdBy === context.myUserId;
    remove.classList.toggle('hidden', !canRemove);

    renderNearby(item, context);

    const mine = item.approvals.some((a) => a.userId === context.myUserId);
    const approve = document.getElementById('detail-approve')!;
    approve.classList.toggle('mine', mine);
    document.getElementById('detail-approve-count')!.textContent = String(item.approvals.length);
    document.getElementById('detail-who')!.textContent =
        item.approvals.length > 0
            ? `approved by ${item.approvals.map((a) => a.username).join(', ')}`
            : 'no approvals yet';

    const comments = document.getElementById('detail-comments')!;
    comments.textContent = '';
    for (const comment of item.comments) {
        const p = el('p', 'detail-comment');
        p.append(el('b', undefined, comment.username ?? 'someone'), document.createTextNode(' ' + comment.body));
        comments.append(p);
    }

    document.getElementById('detail-composer')!.classList.add('hidden');
    (document.getElementById('detail-comment-input') as HTMLInputElement).value = '';
    void context;
}

/** Proximity block in the detail dialog — hub orbit for resorts, near-hub line for the rest. */
function renderNearby(item: ApiItem, context: DetailContext): void {
    const box = document.getElementById('detail-nearby')!;
    box.textContent = '';
    const emojiOf = (i: ApiItem) => (CATEGORY_ART[i.category ?? 'other'] ?? CATEGORY_ART.other)[1];

    if (item.category === 'resort') {
        const orbit = orbitOf(item);
        if (orbit.length === 0) return;
        box.append(el('h3', 'nearby-heading', 'Nearby'));
        for (const { item: near, km } of orbit) {
            const row = el('button', 'nearby-row');
            row.append(
                el('span', undefined, `${emojiOf(near)} ${near.title}`),
                el('span', 'nearby-km', km !== null ? formatKm(km) : 'attached'),
            );
            row.addEventListener('click', () => {
                fillItemDialog(near, context);
                openItemId = near.id;
            });
            box.append(row);
        }
        return;
    }

    // Non-hub: show nearest resort (computed or overridden) + the override selector.
    const resorts = currentItems.filter((i) => i.category === 'resort' && i.id !== item.id);
    if (resorts.length === 0) return;

    const row = el('div', 'near-hub-row');
    const overridden = item.nearItemId
        ? resorts.find((r) => r.id === item.nearItemId)
        : undefined;
    const nearest = hasCoords(item)
        ? resorts
              .filter(hasCoords)
              .map((r) => ({ r, km: distanceKm(item, r) }))
              .sort((a, b) => a.km - b.km)[0]
        : undefined;

    const label = overridden
        ? `🏔️ Near ${overridden.title} (set by hand)`
        : nearest && nearest.km <= NEAR_RADIUS_KM
          ? `🏔️ Near ${nearest.r.title} — ${formatKm(nearest.km)}`
          : nearest
            ? `🏔️ Nearest resort: ${nearest.r.title} — ${formatKm(nearest.km)}`
            : '🏔️ No location found for this item';
    row.append(el('span', 'near-hub-label', label));

    const select = el('select', 'near-select') as HTMLSelectElement;
    const autoOption = el('option', undefined, 'Auto (by distance)') as HTMLOptionElement;
    autoOption.value = '';
    select.append(autoOption);
    for (const resort of resorts) {
        const option = el('option', undefined, `Attach to ${resort.title}`) as HTMLOptionElement;
        option.value = resort.id;
        select.append(option);
    }
    select.value = item.nearItemId ?? '';
    select.addEventListener('change', () => {
        void apiClient
            .setItemNear(item.id, select.value || null)
            .then(() => renderListDetail(context.listId, context.myUserId));
    });
    row.append(select);
    box.append(row);
}

/** One-time wiring for the two dialogs. `getContext` supplies the live list/user ids. */
export function initListDetailUI(getContext: () => DetailContext | null): void {
    const itemDialog = document.getElementById('item-dialog') as HTMLDialogElement;
    const addDialog = document.getElementById('add-dialog') as HTMLDialogElement;

    const refresh = () => {
        const context = getContext();
        if (context) void renderListDetail(context.listId, context.myUserId);
    };

    document.getElementById('item-dialog-close')?.addEventListener('click', () => itemDialog.close());
    itemDialog.addEventListener('close', () => {
        openItemId = null;
    });

    document.getElementById('detail-approve')?.addEventListener('click', () => {
        if (!openItemId) return;
        void apiClient.toggleApproval(openItemId).then(refresh);
    });
    document.getElementById('detail-comment-btn')?.addEventListener('click', () => {
        document.getElementById('detail-composer')!.classList.remove('hidden');
        (document.getElementById('detail-comment-input') as HTMLInputElement).focus();
    });
    const postComment = () => {
        const input = document.getElementById('detail-comment-input') as HTMLInputElement;
        const body = input.value.trim();
        if (!body || !openItemId) return;
        void apiClient.addComment(openItemId, body).then(refresh);
    };
    document.getElementById('detail-comment-post')?.addEventListener('click', postComment);
    document.getElementById('detail-comment-input')?.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') postComment();
    });
    document.getElementById('detail-remove')?.addEventListener('click', () => {
        if (!openItemId) return;
        const item = currentItems.find((i) => i.id === openItemId);
        if (!window.confirm(`Remove "${item?.title ?? 'this item'}" from the list?`)) return;
        void apiClient.deleteItem(openItemId).then(() => {
            itemDialog.close();
            refresh();
        });
    });

    // add-item dialog
    document.getElementById('add-item-open')?.addEventListener('click', () => addDialog.showModal());
    document.getElementById('add-item-cancel')?.addEventListener('click', () => addDialog.close());
    document.getElementById('add-item-submit')?.addEventListener('click', () => {
        const context = getContext();
        if (!context) return;
        const titleInput = document.getElementById('add-item-title') as HTMLInputElement;
        const categorySelect = document.getElementById('add-item-category') as HTMLSelectElement;
        const regionInput = document.getElementById('add-item-region') as HTMLInputElement;
        const urlInput = document.getElementById('add-item-url') as HTMLInputElement;
        const addressInput = document.getElementById('add-item-address') as HTMLInputElement;
        const noteInput = document.getElementById('add-item-note') as HTMLTextAreaElement;
        const errorEl = document.getElementById('add-item-error')!;

        const title = titleInput.value.trim();
        if (!title) {
            errorEl.textContent = 'A name is required';
            errorEl.classList.remove('hidden');
            return;
        }
        errorEl.classList.add('hidden');
        const submit = document.getElementById('add-item-submit') as HTMLButtonElement;
        submit.disabled = true;
        submit.textContent = 'Adding…';
        void apiClient
            .addItem(context.listId, {
                title,
                category: categorySelect.value as ItemCategory,
                region: regionInput.value.trim() || undefined,
                url: urlInput.value.trim() || undefined,
                address: addressInput.value.trim() || undefined,
                note: noteInput.value.trim() || undefined,
            })
            .then(() => {
                titleInput.value = regionInput.value = urlInput.value = addressInput.value = noteInput.value = '';
                categorySelect.value = 'resort';
                addDialog.close();
                refresh();
            })
            .catch(() => {
                errorEl.textContent = 'Could not add — try again';
                errorEl.classList.remove('hidden');
            })
            .finally(() => {
                submit.disabled = false;
                submit.textContent = 'Add it';
            });
    });
}
