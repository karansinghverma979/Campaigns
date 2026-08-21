<script>
  import { store } from '../lib/store.svelte.js';
  import { Tag as TagIcon, Plus, Trash2, X, Sparkles, Check, Edit2 } from 'lucide-svelte';

  let newTagName = $state('');
  let tagSearchQuery = $state('');
  let editingTagName = $state(null);
  let editInputVal = $state('');

  // Extract system tag statistics (name + count of tasks using it)
  const systemTagStats = $derived.by(() => {
    const counts = {};
    if (store.tasks) {
      for (const task of store.tasks) {
        if (task.tags && Array.isArray(task.tags)) {
          for (const t of task.tags) {
            const name = t.tag_name ? t.tag_name.toUpperCase() : '';
            if (name) {
              counts[name] = (counts[name] || 0) + 1;
            }
          }
        }
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  });

  const filteredTags = $derived.by(() => {
    const q = tagSearchQuery.trim().toUpperCase();
    if (!q) return systemTagStats;
    return systemTagStats.filter(t => t.name.includes(q));
  });

  function handleOverlayKeyDown(e) {
    if (e.key === 'Escape') {
      if (editingTagName) {
        cancelEditTag();
      } else {
        store.isTagManagerOpen = false;
      }
    }
  }

  function startEditTag(name) {
    editingTagName = name;
    editInputVal = name;
  }

  function cancelEditTag() {
    editingTagName = null;
    editInputVal = '';
  }

  async function handleSaveRename(oldName) {
    const formatted = editInputVal.trim().toUpperCase();
    if (!formatted || formatted === oldName) {
      cancelEditTag();
      return;
    }
    try {
      if (window.electronAPI && window.electronAPI.renameTag) {
        const res = await window.electronAPI.renameTag({ oldName, newName: formatted });
        if (res && res.success) {
          if (store.tasks) {
            for (const task of store.tasks) {
              if (task.tags && Array.isArray(task.tags)) {
                for (const t of task.tags) {
                  if (t.tag_name && t.tag_name.toUpperCase() === oldName.toUpperCase()) {
                    t.tag_name = formatted;
                  }
                }
              }
            }
          }
          store.rebuildBuckets();
          store.showToast(`Tag renamed to "${formatted}".`, 'info');
          cancelEditTag();
          return;
        }
      }
      await store.loadAllData();
      cancelEditTag();
    } catch (e) {
      store.showToast('Failed to rename tag: ' + e.message, 'danger');
    }
  }

  async function handleAddNewTag() {
    const formatted = newTagName.trim().toUpperCase();
    if (!formatted) {
      store.showToast('Tag name cannot be empty.', 'warning');
      return;
    }
    const exists = systemTagStats.some(t => t.name === formatted);
    if (exists) {
      store.showToast(`Tag "${formatted}" already exists in system.`, 'warning');
      newTagName = '';
      return;
    }

    // Attach to first available Raw Intel task if one exists so it immediately saves in DB
    const firstTask = store.tasks && store.tasks.length > 0 ? store.tasks[0] : null;
    if (firstTask && window.electronAPI && window.electronAPI.addTag) {
      try {
        const res = await window.electronAPI.addTag({ taskId: firstTask.id, tagName: formatted });
        if (res && res.success) {
          if (!firstTask.tags) firstTask.tags = [];
          firstTask.tags.push(res.tag);
          store.rebuildBuckets();
          store.showToast(`Tag "${formatted}" registered live in database.`, 'info');
          newTagName = '';
          return;
        }
      } catch (err) {
        store.logError('Add tag error: ' + err.message, 'Medium');
      }
    }

    store.showToast(`Classification Tag "${formatted}" ready.`, 'info');
    newTagName = '';
  }

  async function handleDeleteTag(tagName) {
    try {
      if (window.electronAPI && window.electronAPI.deleteTagByName) {
        const res = await window.electronAPI.deleteTagByName(tagName);
        if (res && res.success) {
          if (store.tasks) {
            for (const task of store.tasks) {
              if (task.tags && Array.isArray(task.tags)) {
                task.tags = task.tags.filter(t => t.tag_name.toUpperCase() !== tagName.toUpperCase());
              }
            }
          }
          store.rebuildBuckets();
          store.showToast(`Tag "${tagName}" deleted across all campaigns.`, 'info');
          return;
        }
      }
      await store.loadAllData();
    } catch (e) {
      store.showToast('Failed to remove tag: ' + e.message, 'danger');
    }
  }

  async function handlePurgeAllTags() {
    try {
      if (window.electronAPI && window.electronAPI.purgeAllTags) {
        const res = await window.electronAPI.purgeAllTags();
        if (res && res.success) {
          if (store.tasks) {
            for (const task of store.tasks) {
              task.tags = [];
            }
          }
          store.rebuildBuckets();
          store.showToast('Purged all classification tags across all campaigns.', 'info');
          return;
        }
      }
      await store.loadAllData();
    } catch (e) {
      store.showToast('Failed to purge tags: ' + e.message, 'danger');
    }
  }
</script>

{#if store.isTagManagerOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="modal-overlay" 
    onkeydown={handleOverlayKeyDown}
  >
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      
      <!-- Header -->
      <div class="modal-header">
        <div class="title-wrap">
          <div class="icon-box">
            <TagIcon size={22} class="header-icon" />
          </div>
          <div>
            <h3>SYSTEM CLASSIFICATION TAGS MANAGER</h3>
            <span class="subtitle">VIEW, CREATE, RENAME & PURGE CLASSIFICATION TAGS ACROSS ALL CAMPAIGNS</span>
          </div>
        </div>
        <button type="button" class="close-btn" onclick={() => store.isTagManagerOpen = false} aria-label="Close modal">
          <X size={18} />
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body">
        
        <!-- Add New Tag Input Box -->
        <div class="add-tag-bar">
          <input 
            type="text" 
            placeholder="Enter new classification tag name..." 
            bind:value={newTagName}
            onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewTag())}
            class="tag-input"
          />
          <button type="button" class="btn-add-tag" onclick={handleAddNewTag}>
            <Plus size={16} strokeWidth={2.5} />
            <span>CREATE TAG</span>
          </button>
        </div>

        <!-- Filter Tags Search & Purge Bar -->
        <div class="search-wrap">
          <input 
            type="text" 
            placeholder="Filter system tags..." 
            bind:value={tagSearchQuery}
            class="tag-search-input"
          />
          {#if systemTagStats.length > 0}
            <button type="button" class="btn-purge-all-tags" onclick={handlePurgeAllTags} title="Remove all classification tags from all campaigns">
              <Trash2 size={13} />
              <span>PURGE ALL TAGS</span>
            </button>
          {/if}
        </div>

        <!-- System Tags Grid -->
        <div class="tags-grid-container">
          {#if filteredTags.length === 0}
            <div class="empty-tags-state">
              <Sparkles size={28} class="empty-icon" />
              <span>No classification tags found. Create tags to organize campaigns.</span>
            </div>
          {:else}
            {#each filteredTags as t (t.name)}
              <div class="tag-chip-item">
                <TagIcon size={12} class="chip-icon" />
                {#if editingTagName === t.name}
                  <!-- svelte-ignore a11y_autofocus -->
                  <input
                    type="text"
                    class="tag-rename-input"
                    bind:value={editInputVal}
                    onkeydown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(t.name);
                      if (e.key === 'Escape') cancelEditTag();
                    }}
                    autofocus
                  />
                  <button 
                    type="button" 
                    class="btn-save-tag" 
                    onclick={() => handleSaveRename(t.name)}
                    title="Save rename"
                  >
                    <Check size={12} />
                  </button>
                  <button 
                    type="button" 
                    class="btn-cancel-tag" 
                    onclick={cancelEditTag}
                    title="Cancel"
                  >
                    <X size={12} />
                  </button>
                {:else}
                  <span class="chip-name">{t.name}</span>
                  <span class="chip-count-badge">{t.count}</span>
                  <button 
                    type="button" 
                    class="btn-edit-tag" 
                    onclick={() => startEditTag(t.name)}
                    title="Rename tag across all campaigns"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button 
                    type="button" 
                    class="btn-delete-tag" 
                    onclick={() => handleDeleteTag(t.name)}
                    title="Purge tag from all campaigns"
                  >
                    <Trash2 size={12} />
                  </button>
                {/if}
              </div>
            {/each}
          {/if}
        </div>

      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <span class="footer-note">
          KEYBOARD SHORTCUT: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd> TO TOGGLE
        </span>
        <button type="button" class="btn-close-modal" onclick={() => store.isTagManagerOpen = false}>
          CLOSE
        </button>
      </div>

    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 64px;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 8000;
    background: rgba(4, 7, 14, 0.88);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.97); }
    to   { opacity: 1; transform: scale(1); }
  }

  .modal-card {
    width: 100%;
    max-width: 680px;
    background: rgba(12, 17, 29, 0.98);
    border: 1px solid rgba(139, 92, 246, 0.45);
    border-radius: 26px;
    box-shadow: 0 28px 72px rgba(0, 0, 0, 0.95), 0 0 40px rgba(139, 92, 246, 0.22);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px 30px;
    background: rgba(139, 92, 246, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  .title-wrap {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .icon-box {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(139, 92, 246, 0.18);
    border: 1px solid rgba(139, 92, 246, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  :global(.header-icon) { color: #c4b5fd; }

  .title-wrap h3 {
    font-size: 15.5px;
    font-weight: 900;
    letter-spacing: 0.06em;
    word-spacing: 0.06em;
    color: #f3e8ff;
    margin: 0;
  }

  .subtitle {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    word-spacing: 0.06em;
    color: var(--text-muted);
  }

  .close-btn {
    width: 36px; height: 36px; border-radius: 50% !important;
    background: rgba(255, 255, 255, 0.06); border: 1.5px solid rgba(255, 255, 255, 0.14);
    color: #94a3b8; display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  .close-btn:hover {
    background: rgba(239, 68, 68, 0.25); color: #fca5a5; border-color: rgba(239, 68, 68, 0.7);
    transform: rotate(90deg) scale(1.08); box-shadow: 0 0 16px rgba(239, 68, 68, 0.45);
  }

  .modal-body {
    padding: 24px 30px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 480px;
    overflow-y: auto;
  }

  .add-tag-bar {
    display: flex;
    gap: 10px;
  }

  .tag-input {
    flex: 1;
    padding: 11px 18px;
    font-size: 13.5px;
    font-weight: 700;
    word-spacing: 0.06em;
    color: #ffffff;
    background: rgba(6, 10, 18, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 9999px;
    outline: none;
  }
  .tag-input:focus { border-color: rgba(139, 92, 246, 0.65); box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.20); }

  .btn-add-tag {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 11px 22px; font-size: 11.5px; font-weight: 900; letter-spacing: 0.06em; word-spacing: 0.06em;
    color: #ffffff; background: linear-gradient(135deg, #8b5cf6, #6366f1);
    border: 1px solid rgba(196, 181, 253, 0.4); border-radius: 9999px; cursor: pointer; transition: all 0.15s ease;
  }
  .btn-add-tag:hover { background: linear-gradient(135deg, #9333ea, #4f46e5); box-shadow: 0 0 16px rgba(139, 92, 246, 0.4); }

  .search-wrap { display: flex; gap: 10px; align-items: center; }
  .tag-search-input {
    flex: 1; padding: 9px 18px; font-size: 12px; font-weight: 700; word-spacing: 0.06em;
    color: var(--text-main); background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 9999px; outline: none;
  }
  .btn-purge-all-tags {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 9px 18px; font-size: 10.5px; font-weight: 900; letter-spacing: 0.05em; word-spacing: 0.06em;
    color: #fca5a5; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.38);
    border-radius: 9999px; cursor: pointer; transition: all 0.15s ease; flex-shrink: 0;
  }
  .btn-purge-all-tags:hover {
    background: rgba(239, 68, 68, 0.30); border-color: rgba(239, 68, 68, 0.65);
    color: #ffffff; box-shadow: 0 0 14px rgba(239, 68, 68, 0.35);
  }

  .tags-grid-container {
    display: flex; flex-wrap: wrap; gap: 10px; min-height: 120px; max-height: 260px; overflow-y: auto;
    padding: 14px; background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px;
  }

  .empty-tags-state {
    width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
    color: var(--text-dim); font-size: 12px; font-weight: 600; padding: 40px 0;
  }
  :global(.empty-icon) { color: rgba(139, 92, 246, 0.4); }

  .tag-chip-item {
    display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px;
    background: rgba(139, 92, 246, 0.14); border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 9999px; transition: all 0.15s ease;
  }
  .tag-chip-item:hover { background: rgba(139, 92, 246, 0.28); border-color: rgba(168, 85, 247, 0.65); }
  :global(.chip-icon) { color: #c4b5fd; }
  .chip-name { font-size: 11.5px; font-weight: 800; color: #ddd6fe; letter-spacing: 0.04em; }
  .chip-count-badge { font-size: 10px; font-weight: 900; background: rgba(255, 255, 255, 0.15); color: #ffffff; padding: 1px 7px; border-radius: 9999px; }

  .btn-delete-tag {
    background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 3px; display: flex; align-items: center; border-radius: 50%; transition: all 0.12s ease;
  }
  .btn-delete-tag:hover { color: #f87171; background: rgba(239, 68, 68, 0.25); transform: scale(1.1); }

  .btn-edit-tag {
    background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 3px; display: flex; align-items: center; border-radius: 50%; transition: all 0.12s ease;
  }
  .btn-edit-tag:hover { color: #c4b5fd; background: rgba(139, 92, 246, 0.25); transform: scale(1.1); }

  .tag-rename-input {
    background: rgba(6, 10, 18, 0.95);
    border: 1px solid rgba(139, 92, 246, 0.6);
    border-radius: 6px;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 800;
    color: #fff;
    outline: none;
    width: 90px;
  }

  .btn-save-tag {
    background: rgba(34, 197, 94, 0.2);
    border: 1px solid rgba(34, 197, 94, 0.4);
    color: #86efac;
    cursor: pointer;
    padding: 3px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    transition: all 0.12s ease;
  }
  .btn-save-tag:hover { background: rgba(34, 197, 94, 0.4); }

  .btn-cancel-tag {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.35);
    color: #fca5a5;
    cursor: pointer;
    padding: 3px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    transition: all 0.12s ease;
  }
  .btn-cancel-tag:hover { background: rgba(239, 68, 68, 0.3); }

  .modal-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 30px; background: rgba(0, 0, 0, 0.4); border-top: 1px solid rgba(255, 255, 255, 0.08); flex-shrink: 0;
  }

  .footer-note { font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; word-spacing: 0.06em; color: var(--text-dim); display: flex; align-items: center; gap: 4px; }
  kbd { background: rgba(139, 92, 246, 0.20); border: 1px solid rgba(139, 92, 246, 0.45); color: #ddd6fe; font-family: inherit; font-size: 10px; font-weight: 900; padding: 2px 8px; border-radius: 9999px; }

  .btn-close-modal {
    padding: 10px 24px; font-size: 11.5px; font-weight: 900; letter-spacing: 0.06em; word-spacing: 0.06em;
    color: #f3e8ff; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 9999px; cursor: pointer; transition: all 0.15s ease;
  }
  .btn-close-modal:hover { background: rgba(255, 255, 255, 0.12); border-color: rgba(255, 255, 255, 0.25); }
</style>
