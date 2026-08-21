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
  import Strikes from './States/Strikes/Strikes.svelte';




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

    if (window.electronAPI && window.electronAPI.onWindowFocusChange) {
      const unsub = window.electronAPI.onWindowFocusChange(({ isFocused }) => {
        if (isFocused) {
          document.body.classList.remove('window-inactive');
        } else {
          document.body.classList.add('window-inactive');
        }
      });
      return unsub;
    }
  });

  function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (
      activeEl.tagName === 'INPUT' || 
      activeEl.tagName === 'TEXTAREA' || 
      activeEl.tagName === 'SELECT' || 
      activeEl.isContentEditable
    );

    const isAnyModalOpen = (
      store.isTaskModalOpen || 
      store.isHelpModalOpen || 
      store.isDebugModalOpen || 
      store.isConfigModalOpen || 
      store.isTagManagerOpen || 
      store.isStrikeModalOpen ||
      Boolean(document.querySelector('.modal-overlay, .modal-backdrop, .task-window-overlay, .detail-overlay, .dialog-overlay, .strike-modal-backdrop, .custom-modal-backdrop'))
    );
    
    // Ctrl+? or Ctrl+/ for Quick User Guide
    if ((e.ctrlKey || e.metaKey) && (e.key === '?' || e.key === '/')) {
      e.preventDefault();
      const wasOpen = store.isHelpModalOpen;
      store.closeAllModals();
      store.isHelpModalOpen = !wasOpen;
      return;
    }

    // Ctrl+F or '/' (when not typing and no modal open) to focus search bar immediately
    if (((e.ctrlKey || e.metaKey) && key === 'f') || (e.key === '/' && !isInputFocused && !isAnyModalOpen)) {
      e.preventDefault();
      const searchInput = getSearchInput();
      if (searchInput) {
        searchInput.focus();
        if (searchInput.select) searchInput.select();
      }
      return;
    }

    // Escape key handling: smart layered dismissal (pickers -> inputs -> task windows -> modals)
    if (e.key === 'Escape') {
      // 1. If an open calendar picker or dropdown exists in DOM, dismiss it
      const openPicker = document.querySelector('.calendar-2x-container, .dropdown-menu');
      if (openPicker) {
        document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }

      // 2. If an input is focused, clear search & blur
      if (isInputFocused) {
        if (activeEl && activeEl.classList.contains('search-input')) {
          activeEl.value = '';
          activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        activeEl.blur();
        return;
      }

      // 3. Topmost open task window or custom dialog close button
      const activeWindowCloseBtn = document.querySelector('.btn-close-window, .btn-close-deploy, .close-modal-btn, .btn-deploy-cancel');
      if (activeWindowCloseBtn) {
        activeWindowCloseBtn.click();
        return;
      }

      // 4. Store modals dismissal
      if (store.isStrikeModalOpen) { store.isStrikeModalOpen = false; return; }
      if (store.isTaskModalOpen) { store.isTaskModalOpen = false; return; }
      if (store.isConfigModalOpen) { store.isConfigModalOpen = false; return; }
      if (store.isTagManagerOpen) { store.isTagManagerOpen = false; return; }
      if (store.isDebugModalOpen) { store.isDebugModalOpen = false; return; }
      if (store.isHelpModalOpen) { store.isHelpModalOpen = false; return; }
    }

    // Tab key handling: single key cycling between tabs only when not inside form elements and no modal is open
    if (e.key === 'Tab' && !isInputFocused && !isAnyModalOpen) {
      e.preventDefault();
      const tabs = ['EXECUTION', 'ARSENAL', 'BREACH', 'ARCHIVED', 'STRIKES'];
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

    // Ctrl+1..5 for Tab switching (1: Execution, 2: Arsenal, 3: Breach, 4: Archive, 5: Strikes)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      if (key === '1') { e.preventDefault(); store.activeTab = 'EXECUTION'; return; }
      if (key === '2') { e.preventDefault(); store.activeTab = 'ARSENAL'; return; }
      if (key === '3') { e.preventDefault(); store.activeTab = 'BREACH'; return; }
      if (key === '4') { e.preventDefault(); store.activeTab = 'ARCHIVED'; return; }
      if (key === '5') { e.preventDefault(); store.activeTab = 'STRIKES'; return; }
    }

    // Ctrl+Shift+C to open Workspace & Database Configuration Popup
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'c') {
      e.preventDefault();
      const wasOpen = store.isConfigModalOpen;
      store.closeAllModals();
      store.isConfigModalOpen = !wasOpen;
      return;
    }

    // Ctrl+Shift+T to open Tag Manager Popup Window
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 't') {
      e.preventDefault();
      const wasOpen = store.isTagManagerOpen;
      store.closeAllModals();
      store.isTagManagerOpen = !wasOpen;
      return;
    }

    // Ctrl+Shift+K to open Strike Directive Dispatch Creation Modal
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'k') {
      e.preventDefault();
      const wasOpen = store.isStrikeModalOpen;
      store.closeAllModals();
      store.isStrikeModalOpen = !wasOpen;
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
      const wasOpen = store.isDebugModalOpen;
      store.closeAllModals();
      store.isDebugModalOpen = !wasOpen;
      return;
    }

    // Ctrl+Shift+S to trigger force sync with Strategies directory
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 's') {
      e.preventDefault();
      store.forceSync();
      return;
    }

    // Ctrl+N for Quick Context-Aware Creation
    if ((e.ctrlKey || e.metaKey) && key === 'n') {
      e.preventDefault();
      store.closeAllModals();
      if (store.activeTab === 'STRIKES') {
        store.isStrikeModalOpen = true;
      } else {
        store.isTaskModalOpen = true;
      }
      return;
    }

    // High-Speed Card Navigation & Actions (when not typing in an input and no modal open)
    if (!isInputFocused && !isAnyModalOpen && store.activeTab !== 'STRIKES') {
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

    // Ctrl+Enter or Ctrl+S -> Confirm / Save inside the active modal or dialog (#9)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || key === 's')) {
      const activeModal = document.querySelector('.dialog-overlay, .modal-overlay, .modal-backdrop, .task-window-overlay, .strike-modal-backdrop, .custom-modal-backdrop');
      const root = activeModal || document;
      const confirmBtns = Array.from(root.querySelectorAll('.btn-save, .btn-dispatch, .btn-deploy-confirm, .btn-reschedule-confirm, .btn-confirm-reschedule, .btn-confirm-purge, .btn-archive-confirm'));
      const visibleBtn = confirmBtns.find(b => !b.disabled && b.offsetParent !== null);
      if (visibleBtn) {
        e.preventDefault();
        visibleBtn.click();
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
    const activePane = document.querySelector('.content-area > .tab-pane:not(.hidden)');
    if (!activePane) return;

    const cards = Array.from(activePane.querySelectorAll('.task-card, .grid-strike-card, .compact-three-day-card, .strike-card'));
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
      {#if store.activeTab === 'STRIKES'}
        <div class="tab-pane">
          <Strikes />
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
    border-color: rgba(245, 158, 11, 0.9) !important;
    box-shadow: 0 0 25px rgba(245, 158, 11, 0.45), inset 0 0 10px rgba(245, 158, 11, 0.15) !important;
    transform: translateY(-2px);
  }
</style>
