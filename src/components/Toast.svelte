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
    <button type="button" class="close-btn" onclick={() => store.toast.show = false} aria-label="Close Notification">
      <X size={14} />
    </button>
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
    max-width: 480px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 13px 20px;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.03em;
    word-spacing: 0.04em;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(20px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65);
    animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes toastIn {
    from { opacity: 0; transform: translateY(-12px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .toast-banner.warning {
    background: rgba(30, 23, 8, 0.92);
    color: #fde68a;
    border-color: rgba(245, 158, 11, 0.5);
    box-shadow: 0 12px 32px rgba(245, 158, 11, 0.25);
  }

  .toast-banner.danger {
    background: rgba(36, 10, 10, 0.92);
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.5);
    box-shadow: 0 12px 32px rgba(239, 68, 68, 0.25);
  }

  .toast-banner.info {
    background: rgba(10, 24, 41, 0.92);
    color: #93c5fd;
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 12px 32px rgba(59, 130, 246, 0.25);
  }

  .toast-banner.success {
    background: rgba(6, 30, 20, 0.92);
    color: #a7f3d0;
    border-color: rgba(16, 185, 129, 0.5);
    box-shadow: 0 12px 32px rgba(16, 185, 129, 0.25);
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
    line-height: 1.4;
  }

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
  }

  .close-btn:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.2);
  }
  .toast-progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    border-radius: 0 0 14px 14px;
    background: currentColor;
    opacity: 0.4;
    animation: toast-countdown 4s linear forwards;
  }

  @keyframes toast-countdown {
    from { width: 100%; }
    to   { width: 0%; }
  }
</style>
