<script>
  import { onMount } from 'svelte';
  import { store } from './lib/store.svelte.js';
  
  import Navbar from './components/Navbar.svelte';
  import LoadingScreen from './components/LoadingScreen.svelte';
  import Toast from './components/Toast.svelte';
  import DebugConsoleModal from './components/DebugConsoleModal.svelte';
  import ArsenalTaskCreation from './States/Arsenal/ArsenalTaskCreation/ArsenalTaskCreation.svelte';

  import HelpGuideModal from './components/HelpGuideModal.svelte';
  import StorageConfigModal from './components/StorageConfigModal.svelte';
  import TagManagerModal from './components/TagManagerModal.svelte';

  // State Views
  import Execution from './States/Execution/Execution.svelte';
  import Arsenal from './States/Arsenal/Arsenal.svelte';
  import Breach from './States/Breach/Breach.svelte';
  import Archive from './States/Archive/Archive.svelte';

  import { Plus } from 'lucide-svelte';

  // Cached DOM reference to avoid querySelector on every keypress
  let _cachedSearchInput = null;
  function getSearchInput() {
    if (!_cachedSearchInput || !document.contains(_cachedSearchInput)) {
      _cachedSearchInput = document.querySelector('.search-input');
    }
    return _cachedSearchInput;
  }

  let _cachedCards = null;
  let _cachedCardsActiveTab = null;

  // Invalidate card cache when tasks update
  $effect(() => {
    void store.tasks.length;
    _cachedCards = null;
  });

  onMount(() => {
    store.init();
  });

  function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (
      activeEl.tagName === 'INPUT' || 
      activeEl.tagName === 'TEXTAREA' || 
      activeEl.isContentEditable
    );
    
    // Ctrl+? or Ctrl+/ for Quick User Guide
    if ((e.ctrlKey || e.metaKey) && (e.key === '?' || e.key === '/')) {
      e.preventDefault();
      store.isHelpModalOpen = !store.isHelpModalOpen;
      return;
    }

    // Ctrl+F or '/' (when not typing) to focus search bar immediately
    if (((e.ctrlKey || e.metaKey) && key === 'f') || (e.key === '/' && !isInputFocused)) {
      e.preventDefault();
      const searchInput = getSearchInput();
      if (searchInput) {
        searchInput.focus();
        if (searchInput.select) searchInput.select();
      }
      return;
    }

    // Escape key handling: clear search input & blur or close modals
    if (e.key === 'Escape') {
      if (isInputFocused) {
        if (activeEl && activeEl.classList.contains('search-input')) {
          activeEl.value = '';
          activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        activeEl.blur();
        return;
      }
    }

    // Tab key handling: single key cycling between tabs when not typing
    if (e.key === 'Tab' && !isInputFocused && !store.isTaskModalOpen && !store.isHelpModalOpen && !store.isDebugModalOpen && !store.isConfigModalOpen && !store.isTagManagerOpen) {
      e.preventDefault();
      const tabs = ['EXECUTION', 'ARSENAL', 'BREACH', 'ARCHIVED'];
      const curIdx = tabs.indexOf(store.activeTab);
      let nextIdx;
      if (e.shiftKey) {
        nextIdx = curIdx <= 0 ? tabs.length - 1 : curIdx - 1;
      } else {
        nextIdx = (curIdx + 1) % tabs.length;
      }
      store.activeTab = tabs[nextIdx];
      return;
    }

    if ((e.ctrlKey && e.altKey && key === 'r') || (e.ctrlKey && key === 'r') || e.key === 'F5') {
      e.preventDefault();
      store.triggerFullReload();
      return;
    }

    // Ctrl+1..4 for Tab switching (1: Execution, 2: Arsenal, 3: Breach, 4: Archive)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      if (key === '1') { e.preventDefault(); store.activeTab = 'EXECUTION'; return; }
      if (key === '2') { e.preventDefault(); store.activeTab = 'ARSENAL'; return; }
      if (key === '3') { e.preventDefault(); store.activeTab = 'BREACH'; return; }
      if (key === '4') { e.preventDefault(); store.activeTab = 'ARCHIVED'; return; }
    }

    // Ctrl+Shift+C to open Workspace & Database Configuration Popup
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'c') {
      e.preventDefault();
      store.isConfigModalOpen = !store.isConfigModalOpen;
      return;
    }

    // Ctrl+Shift+T to open Tag Manager Popup Window
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 't') {
      e.preventDefault();
      store.isTagManagerOpen = !store.isTagManagerOpen;
      return;
    }

    // Ctrl+Shift+D to open SQLite Database File Location in File Explorer
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'd') {
      e.preventDefault();
      store.openDbLocation();
      return;
    }

    // Ctrl+Shift+E to toggle Tactical Debug Console
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'e') {
      e.preventDefault();
      store.isDebugModalOpen = !store.isDebugModalOpen;
      return;
    }

    // Ctrl+Shift+S to trigger force sync with Strategies directory
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 's') {
      e.preventDefault();
      store.forceSync();
      return;
    }

    // Ctrl+N for Quick Task Creation
    if ((e.ctrlKey || e.metaKey) && key === 'n') {
      e.preventDefault();
      store.isTaskModalOpen = true;
      return;
    }

    // High-Speed Card Navigation & Actions (when not typing in an input and no modal open)
    if (!isInputFocused && !store.isTaskModalOpen && !store.isHelpModalOpen && !store.isDebugModalOpen) {
      const focusedCard = document.querySelector('.task-card-nav-focused');

      // 'J' or Down Arrow -> Next Card
      if (key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        navigateTaskCards(1);
        return;
      }
      // 'K' or Up Arrow -> Prev Card
      if (key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigateTaskCards(-1);
        return;
      }

      // 'M' or 'S' -> Move Raw Intel card to Strategizing
      if (key === 'm' || key === 's') {
        if (focusedCard) {
          const moveBtn = focusedCard.querySelector('.action-btn.strategize');
          if (moveBtn) {
            e.preventDefault();
            moveBtn.click();
            return;
          }
        }
      }

      // 'B' -> Move Strategizing card Back to Raw Intel
      if (key === 'b') {
        if (focusedCard) {
          const backBtn = focusedCard.querySelector('.action-btn.back');
          if (backBtn) {
            e.preventDefault();
            backBtn.click();
            return;
          }
        }
      }

      // 'P' -> Trigger Purge on Raw Intel card
      if (key === 'p' && !(e.ctrlKey || e.metaKey)) {
        if (focusedCard) {
          const purgeBtn = focusedCard.querySelector('.action-btn-purge');
          if (purgeBtn) {
            e.preventDefault();
            purgeBtn.click();
            return;
          }
        }
      }

      // 'D' -> Trigger Deployment modal
      if (key === 'd' && !(e.ctrlKey || e.metaKey)) {
        if (focusedCard) {
          const deployBtn = focusedCard.querySelector('.btn-deploy, .action-btn.deploy');
          if (deployBtn) {
            e.preventDefault();
            deployBtn.click();
            return;
          }
        }
      }

      // 'E' or Enter -> Open focused task card
      if (key === 'e' || e.key === 'Enter') {
        if (focusedCard) {
          e.preventDefault();
          focusedCard.click();
          return;
        }
      }

      // Ctrl+P -> Cycle Priority Filter (ALL -> HIGH -> MEDIUM -> LOW)
      if ((e.ctrlKey || e.metaKey) && key === 'p') {
        e.preventDefault();
        cyclePriorityFilter();
        return;
      }
    }

    // Ctrl+Enter or Ctrl+S -> Confirm / Save inside any active modal or dialog
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || key === 's')) {
      const confirmBtn = document.querySelector('.btn-dispatch, .btn-deploy-confirm, .btn-reschedule-confirm, .btn-confirm-purge, .btn-archive-confirm');
      if (confirmBtn && !confirmBtn.disabled) {
        e.preventDefault();
        confirmBtn.click();
        return;
      }
    }
  }

  function cyclePriorityFilter() {
    const pills = Array.from(document.querySelectorAll('.priority-pills .pill, .priority-group .pill-btn'));
    if (!pills || pills.length === 0) return;
    const activeIdx = pills.findIndex(p => p.classList.contains('active'));
    const nextIdx = (activeIdx + 1) % pills.length;
    pills[nextIdx].click();
  }

  function navigateTaskCards(direction) {
    // Re-query cards only when tab changes
    if (_cachedCards === null || _cachedCardsActiveTab !== store.activeTab) {
      _cachedCards = Array.from(document.querySelectorAll('.task-card'));
      _cachedCardsActiveTab = store.activeTab;
    }
    const cards = _cachedCards;
    if (!cards || cards.length === 0) return;

    let currentIdx = cards.findIndex(c => c.classList.contains('task-card-nav-focused'));
    cards.forEach(c => c.classList.remove('task-card-nav-focused'));

    if (currentIdx === -1) {
      currentIdx = direction > 0 ? 0 : cards.length - 1;
    } else {
      currentIdx += direction;
      if (currentIdx < 0) currentIdx = cards.length - 1;
      if (currentIdx >= cards.length) currentIdx = 0;
    }

    const targetCard = cards[currentIdx];
    if (targetCard) {
      targetCard.classList.add('task-card-nav-focused');
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<main class="app-layout">
  <Navbar />
  <Toast />
  <DebugConsoleModal />
  <HelpGuideModal />
  <StorageConfigModal />
  <TagManagerModal />
  <ArsenalTaskCreation />

  {#if store.isLoading || !store.isConfigured}
    <LoadingScreen />
  {:else}
    <div class="content-area">
      <!-- Daily high-frequency views: kept warm in RAM for instant switching -->
      <div class="tab-pane" class:hidden={store.activeTab !== 'EXECUTION'}>
        <Execution />
      </div>
      <div class="tab-pane" class:hidden={store.activeTab !== 'ARSENAL'}>
        <Arsenal />
      </div>
      
      <!-- Low-frequency views: rendered on-demand only when active to save RAM & CPU -->
      {#if store.activeTab === 'BREACH'}
        <div class="tab-pane">
          <Breach />
        </div>
      {/if}
      {#if store.activeTab === 'ARCHIVED'}
        <div class="tab-pane">
          <Archive />
        </div>
      {/if}
    </div>
  {/if}
</main>

<style>
  .app-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background: var(--bg-dark);
    color: var(--text-main);
    overflow: hidden;
    position: relative;
    font-family: var(--font-heavy);
  }

  .content-area {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .tab-pane {
    height: 100%;
    width: 100%;
  }

  .tab-pane.hidden {
    display: none !important;
  }

  :global(.task-card-nav-focused) {
    border-color: rgba(168, 85, 247, 0.85) !important;
    box-shadow: 0 0 24px rgba(168, 85, 247, 0.5) !important;
    transform: translateY(-2px);
  }
</style>
