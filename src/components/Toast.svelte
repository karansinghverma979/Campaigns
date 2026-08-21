<script>
  import { store } from '../lib/store.svelte.js';
  import { AlertTriangle, Info, AlertOctagon, CheckCircle2, X } from 'lucide-svelte';
</script>

{#if store.toast.show}
  <div class="toast-banner {store.toast.type}" role="alert">
    <div class="toast-content">
      {#if store.toast.type === 'warning'}
        <AlertTriangle size={18} class="toast-icon" />
      {:else if store.toast.type === 'danger'}
        <AlertOctagon size={18} class="toast-icon" />
      {:else if store.toast.type === 'success'}
        <CheckCircle2 size={18} class="toast-icon" />
      {:else}
        <Info size={18} class="toast-icon" />
      {/if}
      <span class="toast-msg">{store.toast.message}</span>
    </div>
    <div class="toast-right">
      {#if store.toast.action}
        <button
          type="button"
          class="toast-action-btn"
          onclick={() => { if (store.toast.action) store.toast.action(); store.toast.show = false; }}
        >{store.toast.actionLabel}</button>
      {/if}
      <button type="button" class="close-btn" onclick={() => store.toast.show = false} aria-label="Close Notification">
        <X size={14} />
      </button>
    </div>
    <div class="toast-progress-bar"></div>
  </div>
{/if}

<style>
  .toast-banner {
    position: fixed;
    overflow: hidden;
    top: 76px;
    right: 24px;
    z-index: 100000;
    max-width: 520px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 22px 14px 22px;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.03em;
    word-spacing: 0.08em;
    line-height: 1.6;
    border-radius: 9999px;
    border: 1.5px solid rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(24px);
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.85);
    animation: toastIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes toastIn {
    from { opacity: 0; transform: translateY(-12px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .toast-banner.warning {
    background: rgba(26, 18, 6, 0.95);
    color: #fde68a;
    border-color: rgba(245, 158, 11, 0.65);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 24px rgba(245, 158, 11, 0.35);
  }

  .toast-banner.danger {
    background: rgba(30, 8, 8, 0.95);
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.65);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 24px rgba(239, 68, 68, 0.35);
  }

  .toast-banner.info {
    background: rgba(8, 18, 34, 0.95);
    color: #93c5fd;
    border-color: rgba(59, 130, 246, 0.65);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 24px rgba(59, 130, 246, 0.35);
  }

  .toast-banner.success {
    background: rgba(4, 24, 18, 0.95);
    color: #a7f3d0;
    border-color: rgba(16, 185, 129, 0.65);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 24px rgba(16, 185, 129, 0.35);
  }

  .toast-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  :global(.toast-icon) {
    flex-shrink: 0;
  }

  .toast-msg {
    line-height: 1.6;
    word-spacing: 0.08em;
  }

  .toast-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .toast-action-btn {
    padding: 3px 11px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: inherit;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.08em;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s ease;
    white-space: nowrap;
  }
  .toast-action-btn:hover { background: rgba(255, 255, 255, 0.25); }

  .close-btn {
    color: inherit;
    opacity: 0.75;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }

  .close-btn:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.1);
  }


  .toast-progress-bar {
    position: absolute;
    bottom: 2px;
    left: 20px;
    right: 20px;
    height: 2.5px;
    border-radius: 9999px;
    background: currentColor;
    opacity: 0.5;
    animation: toast-countdown 4s linear forwards;
  }

  @keyframes toast-countdown {
    from { width: calc(100% - 40px); }
    to   { width: 0%; }
  }
</style>
