<script module>
  let lastUsedTags = $state([]);
</script>

<script>
  import { store } from '../../../lib/store.svelte.js';
  import { Plus, X, Tag as TagIcon, Target, ShieldAlert, Sparkles, Check, Flame, AlertTriangle, Eye, Loader2, AlertCircle } from 'lucide-svelte';

  let title = $state('');
  let priority = $state('Medium');
  let tagInput = $state('');
  let tags = $state([]); // Array of attached tag strings (0 to 7)
  let isTagSearchOpen = $state(false);
  let isSubmitting = $state(false);

  // Pre-fill last used tags when opening creation modal if tags are empty
  let wasModalOpen = false;
  $effect(() => {
    if (store.isTaskModalOpen && !wasModalOpen) {
      if (tags.length === 0 && lastUsedTags.length > 0) {
        tags = [...lastUsedTags];
      }
    }
    wasModalOpen = store.isTaskModalOpen;
  });

  // Maximum allowed tags per task
  const MAX_TAGS = 7;

  // 3 PRIORITIES: HIGH (RED), MEDIUM (AMBER), LOW (BLUE)
  const priorityCards = [
    { 
      value: 'High',   
      label: 'HIGH PRIORITY',   
      sub: 'ELEVATED STRATEGIC VALUE',
      color: '#ef4444', 
      glow: 'rgba(239, 68, 68, 0.35)', 
      bg: 'rgba(239, 68, 68, 0.12)', 
      border: 'rgba(239, 68, 68, 0.50)',
      icon: Flame
    },
    { 
      value: 'Medium', 
      label: 'MEDIUM PRIORITY', 
      sub: 'STANDARD INTEL PROTOCOL',
      color: '#f59e0b', 
      glow: 'rgba(245, 158, 11, 0.35)', 
      bg: 'rgba(245, 158, 11, 0.12)', 
      border: 'rgba(245, 158, 11, 0.50)',
      icon: AlertTriangle
    },
    { 
      value: 'Low',    
      label: 'LOW PRIORITY',    
      sub: 'ROUTINE OBSERVATION',
      color: '#3b82f6', 
      glow: 'rgba(59, 130, 246, 0.35)', 
      bg: 'rgba(59, 130, 246, 0.12)', 
      border: 'rgba(59, 130, 246, 0.50)',
      icon: Eye
    }
  ];

  // Extract all unique existing tag names across system
  const allSystemTags = $derived.by(() => {
    const set = new Set();
    if (store.tasks) {
      store.tasks.forEach(t => {
        if (t.tags) t.tags.forEach(tag => set.add(tag.tag_name.toUpperCase()));
      });
    }
    return Array.from(set).sort();
  });

  // Filter existing system tags based on search input
  const filteredTagSuggestions = $derived.by(() => {
    const q = tagInput.trim().toUpperCase();
    const available = allSystemTags.filter(t => !tags.includes(t));
    if (!q) return available;
    return available.filter(t => t.includes(q));
  });

  // Check if typed tag exists in attached tags
  const isDuplicateTag = $derived.by(() => {
    const q = tagInput.trim().toUpperCase();
    if (!q) return false;
    return tags.includes(q);
  });

  // Check if typed tag exists exactly in system tags or attached tags
  const exactMatchExists = $derived.by(() => {
    const q = tagInput.trim().toUpperCase();
    if (!q) return true;
    return allSystemTags.includes(q) || tags.includes(q);
  });

  let detectedPriority = $state(null);

  function handleTitleInput(val) {
    title = val;
    const matches = Array.from(val.matchAll(/#(high|med|medium|low)\b/gi));
    if (matches.length > 0) {
      const lastTag = matches[matches.length - 1][1].toLowerCase();
      if (lastTag === 'high') {
        priority = 'High';
        detectedPriority = 'High';
      } else if (lastTag === 'med' || lastTag === 'medium') {
        priority = 'Medium';
        detectedPriority = 'Medium';
      } else if (lastTag === 'low') {
        priority = 'Low';
        detectedPriority = 'Low';
      }
    } else {
      detectedPriority = null;
    }
  }

  function focusTitleInput(node) {
    setTimeout(() => {
      node.focus();
      node.select?.();
    }, 50);
  }

  function attachTag(tagToAdd) {
    const formatted = tagToAdd.trim().toUpperCase();
    if (!formatted) return;

    if (tags.includes(formatted)) {
      store.showToast(`Classification tag "${formatted}" is already attached.`, 'warning');
      tagInput = '';
      isTagSearchOpen = false;
      return;
    }

    if (tags.length >= MAX_TAGS) {
      store.showToast(`Maximum limit of ${MAX_TAGS} classification tags reached.`, 'warning');
      return;
    }

    tags = [...tags, formatted];
    tagInput = '';
    isTagSearchOpen = false;
  }

  function removeTag(tagToRemove) {
    tags = tags.filter(t => t !== tagToRemove);
  }

  function handleTagInputKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = tagInput.trim().toUpperCase();
      if (query) {
        attachTag(query);
      }
    }
  }

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting) return;

    const cleanedTitle = title
      .replace(/#(?:high|med|medium|low)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    const finalTitle = cleanedTitle || title.trim();

    if (!finalTitle) {
      store.showToast('Campaign Title is required.', 'warning');
      return;
    }

    isSubmitting = true;
    try {
      const success = await store.createArsenalTask({
        title: finalTitle,
        priority,
        tags: [...tags]
      });

      if (success) {
        if (tags.length > 0) {
          lastUsedTags = [...tags];
        }
        title = '';
        priority = 'Medium';
        detectedPriority = null;
        tags = [];
        tagInput = '';
        isTagSearchOpen = false;
        store.isTaskModalOpen = false;
      }
    } catch (err) {
      store.showToast('Dispatch failed: ' + err.message, 'danger');
      store.logError(err.message, 'High');
    } finally {
      isSubmitting = false;
    }
  }

  function handleOverlayClick() {
    isTagSearchOpen = false;
    store.isTaskModalOpen = false;
  }

  function handleModalClick(e) {
    e.stopPropagation();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      store.isTaskModalOpen = false;
      return;
    }
    const active = document.activeElement;
    const isInputFocused = active && (
      active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable
    );
    if (!isInputFocused) {
      if (e.key === '1') { e.preventDefault(); priority = 'High'; }
      else if (e.key === '2') { e.preventDefault(); priority = 'Medium'; }
      else if (e.key === '3') { e.preventDefault(); priority = 'Low'; }
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if store.isTaskModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay">
    <div class="modal-card" onclick={handleModalClick}>
      
      <!-- Minimalist Header -->
      <div class="modal-header">
        <div class="header-title-block">
          <div class="header-icon-box">
            <Target size={22} strokeWidth={2.5} class="header-target-icon" />
          </div>
          <div>
            <h2 class="modal-title-text">LOG NEW CAMPAIGN</h2>
            <p class="modal-subtitle">Add tactical intel task to the Arsenal command panel</p>
          </div>
        </div>
        
        <button 
          type="button" 
          class="close-btn" 
          onclick={() => store.isTaskModalOpen = false} 
          title="Close (Esc)"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>
      </div>

      <form onsubmit={handleSubmit} class="form-body">
        
        <!-- Field 1: Campaign Title -->
        <div class="field-group">
          <div class="label-row">
            <label for="campaign-title">CAMPAIGN TITLE <span class="req-star">*</span></label>
            <span class="field-hint">MANDATORY IDENTIFIER</span>
          </div>
          <input 
            id="campaign-title"
            type="text" 
            placeholder="e.g. OPERATION ZERO TRUST INGESTION #High" 
            bind:value={title} 
            oninput={(e) => handleTitleInput(e.target.value)}
            use:focusTitleInput
            required 
            autocomplete="off"
            class="tactical-input"
          />
          {#if detectedPriority}
            <div class="inline-syntax-feedback-bar">
              <span class="syntax-pill priority-{detectedPriority.toLowerCase()}">
                ⚡ PRIORITY DETECTED: {detectedPriority.toUpperCase()}
              </span>
            </div>
          {/if}
        </div>

        <!-- Field 2: Tactical Priority Cards (High: Red, Medium: Gold, Low: Blue) -->
        <div class="field-group">
          <div class="label-row">
            <span class="label-heading">CLASSIFICATION PRIORITY LEVEL</span>
            <span class="field-hint">SELECT STATUS</span>
          </div>

          <div class="priority-cards-grid">
            {#each priorityCards as pCard}
              {@const IconComp = pCard.icon}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div 
                class="priority-card"
                class:active={priority === pCard.value}
                style="--p-color: {pCard.color}; --p-glow: {pCard.glow}; --p-bg: {pCard.bg}; --p-border: {pCard.border};"
                onclick={() => priority = pCard.value}
              >
                <div class="p-card-header">
                  <IconComp size={16} class="p-icon" />
                  <span class="p-card-title">{pCard.label}</span>
                  {#if priority === pCard.value}
                    <Check size={14} class="p-check-icon" />
                  {/if}
                </div>
                <span class="p-card-sub">{pCard.sub}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Field 3: Tags Search & Auto-Suggest (Max 7, Min 0) with Dedicated Scrollbar -->
        <div class="field-group">
          <div class="label-row">
            <label for="tag-search-input">TAGS & CLASSIFICATION ASSIGNMENTS</label>
            
            <div class="slots-visual">
              <span class="slot-text">SLOTS:</span>
              <div class="slot-dots-row">
                {#each Array(MAX_TAGS) as _, i}
                  <span class="slot-dot" class:filled={i < tags.length}></span>
                {/each}
              </div>
              <span class="slot-counter-text" class:maxed={tags.length >= MAX_TAGS}>
                [{tags.length}/{MAX_TAGS}]
              </span>
            </div>
          </div>

          <!-- Tag Search Input -->
          <div class="tag-search-box">
            <div class="input-icon-wrap">
              <TagIcon size={15} class="tag-search-icon" />
              <input 
                id="tag-search-input"
                type="text" 
                placeholder={tags.length >= MAX_TAGS ? "MAXIMUM 7 TAGS ASSIGNED" : "Search existing tags or type new tag & press Enter..."} 
                bind:value={tagInput}
                disabled={tags.length >= MAX_TAGS}
                onfocus={() => { isTagSearchOpen = true; }}
                oninput={() => { isTagSearchOpen = true; }}
                onkeydown={handleTagInputKeyDown}
                autocomplete="off"
                class="tag-input-element"
                class:input-error={isDuplicateTag}
              />
              {#if tagInput.trim()}
                <button type="button" class="clear-input-btn" onclick={() => tagInput = ''}>
                  <X size={12} />
                </button>
              {/if}
            </div>

            <!-- Live Duplicate Tag Warning Banner -->
            {#if isDuplicateTag}
              <div class="inline-tag-error">
                <AlertCircle size={13} />
                <span>TAG "{tagInput.trim().toUpperCase()}" IS ALREADY ATTACHED TO THIS MANIFEST</span>
              </div>
            {/if}

            <!-- Tag Search Dropdown Popover -->
            {#if isTagSearchOpen && tags.length < MAX_TAGS}
              <div class="tag-suggestions-popover">
                
                <!-- Matching existing tags list -->
                {#if filteredTagSuggestions.length > 0}
                  <div class="popover-section-header">
                    <Sparkles size={11} /> EXISTING CLASSIFICATIONS
                  </div>
                  <div class="suggestions-chips-grid">
                    {#each filteredTagSuggestions.slice(0, 8) as sug}
                      <button 
                        type="button" 
                        class="tag-sug-chip" 
                        onclick={() => attachTag(sug)}
                      >
                        <TagIcon size={11} />
                        <span>{sug}</span>
                        <span class="chip-add-symbol">+</span>
                      </button>
                    {/each}
                  </div>
                {/if}

                <!-- Option to confirm and create new tag if typed tag doesn't match exact existing tag -->
                {#if tagInput.trim() && !exactMatchExists}
                  {#if filteredTagSuggestions.length > 0}
                    <div class="popover-divider"></div>
                  {/if}
                  <button 
                    type="button" 
                    class="create-new-tag-btn" 
                    onclick={() => attachTag(tagInput.trim())}
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>CREATE NEW TAG: <strong>"{tagInput.trim().toUpperCase()}"</strong></span>
                  </button>
                {/if}

                {#if isDuplicateTag}
                  <div class="duplicate-tag-popover-warning">
                    <AlertCircle size={13} />
                    Tag "{tagInput.trim().toUpperCase()}" is already assigned to this campaign.
                  </div>
                {:else if filteredTagSuggestions.length === 0 && (!tagInput.trim() || exactMatchExists)}
                  <div class="empty-tag-popover">
                    Type tag name & press Enter to attach new classification tag.
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <!-- Attached Tags Wrapper: THE ONLY SCROLLBAR IN THE ENTIRE WINDOW -->
          <div class="attached-tags-wrapper">
            {#if tags.length === 0}
              <div class="no-tags-notice">
                <span>NO TAGS ATTACHED (0 TO 7 CLASSIFICATIONS ALLOWED)</span>
              </div>
            {:else}
              <div class="tag-badges-grid">
                {#each tags as t}
                  <span class="attached-tag-badge">
                    <TagIcon size={11} />
                    <span class="tag-name-text">{t}</span>
                    <button 
                      type="button" 
                      class="remove-tag-btn" 
                      onclick={() => removeTag(t)}
                      title="Detach Tag"
                    >
                      <X size={12} />
                    </button>
                  </span>
                {/each}
              </div>
            {/if}
          </div>

          {#if lastUsedTags.length > 0 && tags.length > 0 && tags.length === lastUsedTags.length && tags.every(t => lastUsedTags.includes(t))}
            <div class="last-used-hint">
              <span>↩ Tags remembered from previous campaign</span>
              <button type="button" class="clear-last-tags-btn" onclick={() => tags = []}>Clear all</button>
            </div>
          {/if}

          {#if tags.length >= MAX_TAGS}
            <div class="max-limit-warning">
              <ShieldAlert size={14} />
              <span>MAXIMUM TAG LIMIT REACHED (7/7 SLOTS FILLED)</span>
            </div>
          {/if}
        </div>

        <!-- Footer Action Controls -->
        <div class="modal-footer">
          <button 
            type="button" 
            class="btn-abort" 
            onclick={() => store.isTaskModalOpen = false}
            disabled={isSubmitting}
          >
            CANCEL DISPATCH
          </button>
          
          <button 
            type="submit" 
            class="btn-dispatch" 
            disabled={isSubmitting}
          >
            {#if isSubmitting}
              <Loader2 size={18} class="btn-spin" />
              <span>DISPATCHING LOG...</span>
            {:else}
              <Plus size={18} strokeWidth={3} />
              <span>DISPATCH INTEL LOG</span>
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  /* Positioned STRICTLY in app area below the 64px Navbar */
  .modal-overlay {
    position: fixed;
    top: 64px;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 8000;
    background: rgba(4, 7, 14, 0.86);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  /* EXPANDED SPACIOUS MINIMALIST WINDOW (800px Width, 640px Fixed Height) */
  .modal-card {
    position: relative;
    width: 800px;
    max-width: 94vw;
    height: auto;
    max-height: calc(100vh - 90px);
    background: rgba(12, 17, 29, 0.98);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(139, 92, 246, 0.38);
    border-radius: 26px;
    box-shadow: 0 28px 72px rgba(0, 0, 0, 0.95), 0 0 40px rgba(139, 92, 246, 0.20);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: manifestIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes manifestIn {
    from { opacity: 0; transform: scale(0.95) translateY(12px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  /* Header with Spacing */
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px 36px;
    background: rgba(139, 92, 246, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  .header-title-block {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .header-icon-box {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: rgba(139, 92, 246, 0.18);
    border: 1px solid rgba(139, 92, 246, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 18px rgba(139, 92, 246, 0.25);
    flex-shrink: 0;
  }

  :global(.header-target-icon) {
    color: #c4b5fd;
  }

  .modal-title-text {
    font-size: 17.5px;
    font-weight: 900;
    letter-spacing: 0.08em;
    word-spacing: 0.12em;
    color: #f3e8ff;
    margin: 0;
  }

  .modal-subtitle {
    font-size: 12.5px;
    font-weight: 600;
    letter-spacing: 0.03em;
    word-spacing: 0.06em;
    color: var(--text-muted);
    margin-top: 3px;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    border-radius: 50% !important;
    background: rgba(255, 255, 255, 0.06);
    border: 1.5px solid rgba(255, 255, 255, 0.14);
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  .close-btn:hover {
    background: rgba(239, 68, 68, 0.25);
    border-color: rgba(239, 68, 68, 0.7);
    color: #fca5a5;
    transform: rotate(90deg) scale(1.08);
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.45);
  }

  /* Form Body */
  .form-body {
    flex: 1;
    min-height: 0;
    padding: 26px 36px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 20px;
    overflow-y: auto;
  }
  .form-body::-webkit-scrollbar { width: 6px; }
  .form-body::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.45); border-radius: 99px; }
  .form-body::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
  }

  .label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  label, .label-heading {
    font-size: 11.5px;
    font-weight: 900;
    letter-spacing: 0.09em;
    word-spacing: 0.10em;
    color: var(--text-muted);
  }

  .req-star { color: #ef4444; font-weight: 900; }

  .field-hint {
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.07em;
    word-spacing: 0.08em;
    color: var(--text-dim);
  }

  .tactical-input {
    width: 100%;
    padding: 13.5px 20px;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.03em;
    word-spacing: 0.05em;
    background: rgba(6, 10, 18, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    color: var(--text-main);
    box-sizing: border-box;
    transition: all 0.18s ease;
  }
  .tactical-input:focus {
    border-color: rgba(139, 92, 246, 0.65);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.20), 0 0 20px rgba(139, 92, 246, 0.15);
    outline: none;
  }

  .inline-syntax-feedback-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    animation: fadeIn 0.15s ease;
  }
  .syntax-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.05em;
  }
  .syntax-pill.priority-high {
    background: rgba(239, 68, 68, 0.18);
    border: 1px solid rgba(239, 68, 68, 0.5);
    color: #fca5a5;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.25);
  }
  .syntax-pill.priority-medium {
    background: rgba(245, 158, 11, 0.18);
    border: 1px solid rgba(245, 158, 11, 0.5);
    color: #fde68a;
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.25);
  }
  .syntax-pill.priority-low {
    background: rgba(59, 130, 246, 0.18);
    border: 1px solid rgba(59, 130, 246, 0.5);
    color: #93c5fd;
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.25);
  }

  /* Priority Cards Grid */
  .priority-cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .priority-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12.5px 16px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    background: rgba(255, 255, 255, 0.03);
    cursor: pointer;
    transition: all 0.18s ease;
    position: relative;
    overflow: hidden;
  }
  .priority-card:hover {
    background: var(--p-bg);
    border-color: var(--p-border);
    transform: translateY(-2px);
  }

  .priority-card.active {
    background: var(--p-bg);
    border-color: var(--p-color);
    box-shadow: 0 0 20px var(--p-glow), inset 0 0 12px var(--p-bg);
  }

  .p-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :global(.p-icon) {
    color: var(--p-color);
  }

  .p-card-title {
    font-size: 11.5px;
    font-weight: 900;
    letter-spacing: 0.07em;
    word-spacing: 0.08em;
    color: var(--p-color);
  }

  :global(.p-check-icon) {
    margin-left: auto;
    color: var(--p-color);
  }

  .p-card-sub {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.05em;
    word-spacing: 0.06em;
    color: var(--text-muted);
    opacity: 0.85;
  }

  /* Tag Slot Visual Progress */
  .slots-visual {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .slot-text {
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.08em;
    word-spacing: 0.08em;
    color: var(--text-dim);
  }

  .slot-dots-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .slot-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.15s ease;
  }
  .slot-dot.filled {
    background: #a855f7;
    border-color: #c084fc;
    box-shadow: 0 0 8px #a855f7;
  }

  .slot-counter-text {
    font-size: 10.5px;
    font-weight: 900;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }
  .slot-counter-text.maxed {
    color: #ef4444;
  }

  /* Tag Search Box */
  .tag-search-box {
    position: relative;
  }

  .input-icon-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  :global(.tag-search-icon) {
    position: absolute;
    left: 14px;
    color: var(--text-muted);
    pointer-events: none;
  }

  .tag-input-element {
    width: 100%;
    padding: 12px 38px 12px 40px;
    font-size: 13.5px;
    font-weight: 700;
    letter-spacing: 0.03em;
    word-spacing: 0.06em;
    background: rgba(6, 10, 18, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    color: var(--text-main);
    box-sizing: border-box;
    transition: all 0.18s ease;
  }
  .tag-input-element:focus {
    border-color: rgba(139, 92, 246, 0.65);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.18);
    outline: none;
  }
  .tag-input-element.input-error {
    border-color: rgba(239, 68, 68, 0.65);
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.20);
  }
  .tag-input-element:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background: rgba(0, 0, 0, 0.4);
  }

  .clear-input-btn {
    position: absolute;
    right: 14px;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 4px;
  }
  .clear-input-btn:hover { color: var(--text-main); }

  .inline-tag-error {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 5px;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.06em;
    color: #f87171;
  }

  /* Tag Popover Suggestions Grid */
  .tag-suggestions-popover {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    z-index: 10000;
    background: rgba(8, 12, 22, 0.98);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(139, 92, 246, 0.40);
    border-radius: 14px;
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.9);
    padding: 12px;
    max-height: 200px;
    overflow-y: auto;
  }

  .popover-section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 9.5px;
    font-weight: 900;
    letter-spacing: 0.10em;
    word-spacing: 0.08em;
    color: #c4b5fd;
    margin-bottom: 10px;
  }

  .suggestions-chips-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tag-sug-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 9999px;
    background: rgba(139, 92, 246, 0.15);
    border: 1px solid rgba(139, 92, 246, 0.35);
    color: #ddd6fe;
    font-size: 11.5px;
    font-weight: 800;
    letter-spacing: 0.04em;
    word-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .tag-sug-chip:hover {
    background: rgba(139, 92, 246, 0.35);
    border-color: rgba(139, 92, 246, 0.70);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
    transform: translateY(-1px);
  }

  .chip-add-symbol {
    font-weight: 900;
    color: #c4b5fd;
  }

  .popover-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    margin: 10px 0;
  }

  .create-new-tag-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 16px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.28), rgba(99, 102, 241, 0.20));
    border: 1px solid rgba(139, 92, 246, 0.55);
    border-radius: 12px;
    color: #ede9fe;
    font-size: 11.5px;
    font-weight: 800;
    letter-spacing: 0.05em;
    word-spacing: 0.08em;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
  }
  .create-new-tag-btn:hover {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.50), rgba(99, 102, 241, 0.35));
    border-color: rgba(139, 92, 246, 0.85);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.35);
  }

  .duplicate-tag-popover-warning {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: #f87171;
    padding: 8px 12px;
    background: rgba(239, 68, 68, 0.12);
    border-radius: 8px;
  }

  .empty-tag-popover {
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.04em;
    word-spacing: 0.06em;
    color: var(--text-dim);
    padding: 12px;
    text-align: center;
  }

  /* Attached Tags Container: THE ONLY SCROLLBAR IN THE ENTIRE WINDOW */
  .attached-tags-wrapper {
    margin-top: 4px;
    height: 95px;
    max-height: 95px;
    overflow-y: auto; /* DEDICATED TAG SCROLLBAR ONLY */
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    box-sizing: border-box;
  }

  /* Custom scrollbar styling for tags container */
  .attached-tags-wrapper::-webkit-scrollbar {
    width: 5px;
  }
  .attached-tags-wrapper::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }
  .attached-tags-wrapper::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.4);
    border-radius: 99px;
  }

  .no-tags-notice {
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.08em;
    word-spacing: 0.08em;
    color: var(--text-dim);
    padding: 16px 10px;
    text-align: center;
    width: 100%;
  }

  .tag-badges-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
  }

  .attached-tag-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(99, 102, 241, 0.18));
    color: #ede9fe;
    border: 1px solid rgba(139, 92, 246, 0.45);
    padding: 6px 14px;
    font-size: 11.5px;
    font-weight: 800;
    letter-spacing: 0.05em;
    word-spacing: 0.06em;
    border-radius: 9999px;
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.2);
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .attached-tag-badge:hover {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.45), rgba(99, 102, 241, 0.35));
    border-color: rgba(168, 85, 247, 0.75);
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.4);
    transform: translateY(-1.5px) scale(1.02);
  }
  .attached-tag-badge:active {
    transform: translateY(0) scale(0.96);
  }

  .tag-name-text {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove-tag-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: #c4b5fd;
    cursor: pointer;
    padding: 2px;
    border-radius: 50%;
    transition: all 0.12s ease;
  }
  .remove-tag-btn:hover {
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.30);
  }

  .last-used-hint {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 4px;
    padding: 6px 12px;
    background: rgba(139, 92, 246, 0.10);
    border: 1px dashed rgba(139, 92, 246, 0.35);
    border-radius: 10px;
    color: #c4b5fd;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.03em;
  }

  .clear-last-tags-btn {
    background: transparent;
    border: none;
    color: #f87171;
    font-size: 10.5px;
    font-weight: 800;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
    transition: opacity 0.15s ease;
  }
  .clear-last-tags-btn:hover { opacity: 0.8; }

  .max-limit-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    padding: 8px 14px;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.40);
    border-radius: 12px;
    color: #fca5a5;
    font-size: 10.5px;
    font-weight: 900;
    letter-spacing: 0.07em;
    word-spacing: 0.08em;
  }

  /* Footer Action Controls */
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 14px;
    padding-top: 18px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  .btn-abort {
    padding: 12px 26px;
    font-size: 11.5px;
    font-weight: 900;
    letter-spacing: 0.09em;
    word-spacing: 0.10em;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-abort:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-main);
    border-color: rgba(255, 255, 255, 0.20);
  }

  .btn-dispatch {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 12px 30px;
    font-size: 12.5px;
    font-weight: 900;
    letter-spacing: 0.09em;
    word-spacing: 0.10em;
    color: #ffffff;
    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
    border: 1px solid rgba(196, 181, 253, 0.60);
    border-radius: 9999px;
    box-shadow: 0 0 26px rgba(139, 92, 246, 0.50);
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .btn-dispatch:hover:not(:disabled) {
    background: linear-gradient(135deg, #9333ea 0%, #4f46e5 100%);
    border-color: rgba(255, 255, 255, 0.80);
    box-shadow: 0 0 36px rgba(139, 92, 246, 0.70);
    transform: translateY(-1px);
  }
  .btn-dispatch:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  :global(.btn-spin) {
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { 100% { transform: rotate(360deg); } }
</style>
