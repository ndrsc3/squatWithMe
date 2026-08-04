import * as apiClient from '../api-client';
import type { ApiItem, ApiList } from '../api-client';

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

// ── detail ─────────────────────────────────────────────────────────
export async function renderListDetail(listId: string, myUserId: string): Promise<void> {
    const title = document.getElementById('list-title')!;
    const container = document.getElementById('items-container')!;
    container.textContent = 'Loading…';

    const { lists } = await apiClient.getLists();
    const list = lists.find((l) => l.id === listId);
    if (!list) {
        title.textContent = 'List not found';
        container.textContent = '';
        return;
    }
    title.textContent = `${KIND_BADGE[list.kind] ?? '📋'} ${list.name}`;

    if (!list.isMember) {
        container.textContent = '';
        const join = el('button', 'primary-button', `Join "${list.name}" to see it`);
        join.addEventListener('click', () => {
            void apiClient.joinList(listId).then(() => renderListDetail(listId, myUserId));
        });
        container.append(join);
        document.getElementById('add-item-form')!.classList.add('hidden');
        return;
    }
    document.getElementById('add-item-form')!.classList.remove('hidden');

    const { items } = await apiClient.getItems(listId);
    container.textContent = '';
    if (items.length === 0) {
        container.append(el('p', 'lists-empty', 'Nothing here yet — add the first item!'));
    }
    for (const item of items) {
        container.append(renderItem(item, listId, myUserId));
    }
}

export function initAddItemForm(getContext: () => { listId: string; myUserId: string } | null): void {
    document.getElementById('add-item-submit')?.addEventListener('click', () => {
        const context = getContext();
        if (!context) return;
        const titleInput = document.getElementById('add-item-title') as HTMLInputElement;
        const categoryInput = document.getElementById('add-item-category') as HTMLInputElement;
        const urlInput = document.getElementById('add-item-url') as HTMLInputElement;
        const noteInput = document.getElementById('add-item-note') as HTMLInputElement;
        const title = titleInput.value.trim();
        if (!title) return;
        void apiClient
            .addItem(context.listId, {
                title,
                category: categoryInput.value.trim() || undefined,
                url: urlInput.value.trim() || undefined,
                note: noteInput.value.trim() || undefined,
            })
            .then(() => {
                titleInput.value = categoryInput.value = urlInput.value = noteInput.value = '';
                void renderListDetail(context.listId, context.myUserId);
            });
    });
}

function renderItem(item: ApiItem, listId: string, myUserId: string): HTMLElement {
    const card = el('div', 'item-card');

    const header = el('div', 'item-header');
    header.append(el('span', 'item-title', item.title));
    if (item.category) header.append(el('span', 'item-category', item.category));
    card.append(header);

    if (item.url) {
        const link = el('a', 'item-url', item.url);
        link.href = item.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        card.append(link);
    }
    if (item.note) card.append(el('p', 'item-note', item.note));

    // Reactions: aggregate by emoji; click a chip to toggle yours; input adds any emoji.
    const reactionsRow = el('div', 'reactions-row');
    const byEmoji = new Map<string, string[]>();
    for (const r of item.reactions) {
        byEmoji.set(r.emoji, [...(byEmoji.get(r.emoji) ?? []), r.userId]);
    }
    const refresh = () => void renderListDetail(listId, myUserId);
    for (const [emoji, userIds] of byEmoji) {
        const mine = userIds.includes(myUserId);
        const chip = el('button', `reaction-chip${mine ? ' mine' : ''}`, `${emoji} ${userIds.length}`);
        chip.addEventListener('click', () => {
            void (mine ? apiClient.removeReaction(item.id, emoji) : apiClient.addReaction(item.id, emoji)).then(refresh);
        });
        reactionsRow.append(chip);
    }
    const emojiInput = el('input', 'emoji-input') as HTMLInputElement;
    emojiInput.placeholder = '😀';
    emojiInput.maxLength = 8;
    const emojiAdd = el('button', 'reaction-chip add', '+');
    emojiAdd.addEventListener('click', () => {
        const emoji = emojiInput.value.trim();
        if (!emoji) return;
        void apiClient.addReaction(item.id, emoji).then(refresh);
    });
    reactionsRow.append(emojiInput, emojiAdd);
    card.append(reactionsRow);

    // Comments: flat thread + composer.
    const commentsBlock = el('div', 'comments-block');
    for (const comment of item.comments) {
        commentsBlock.append(el('p', 'comment', comment.body));
    }
    const commentInput = el('input', 'comment-input') as HTMLInputElement;
    commentInput.placeholder = 'Add a comment…';
    commentInput.maxLength = 2000;
    const commentPost = () => {
        const body = commentInput.value.trim();
        if (!body) return;
        void apiClient.addComment(item.id, body).then(refresh);
    };
    commentInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') commentPost();
    });
    const commentButton = el('button', 'comment-post', 'Post');
    commentButton.addEventListener('click', commentPost);
    const composer = el('div', 'comment-composer');
    composer.append(commentInput, commentButton);
    commentsBlock.append(composer);
    card.append(commentsBlock);

    return card;
}
