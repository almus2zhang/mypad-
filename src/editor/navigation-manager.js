/**
 * Manages view navigation history (Back / Forward) per file tab.
 */
export class NavigationManager {
  constructor() {
    /** 
     * Map of tabId -> { history: Array<{line: number, col: number}>, currentIndex: number }
     */
    this.histories = new Map();
    
    // Callbacks to update toolbar button states
    this.onChange = () => {};
  }

  setCallback(onChange) {
    this.onChange = onChange;
  }

  _getOrCreate(tabId) {
    if (!this.histories.has(tabId)) {
      this.histories.set(tabId, { history: [], currentIndex: -1 });
    }
    return this.histories.get(tabId);
  }

  /**
   * Pushes a new state to the history if it's far enough from the current one.
   */
  pushState(tabId, line, col) {
    if (!tabId) return;
    const state = this._getOrCreate(tabId);
    
    // Don't push if it's too close to the current state (e.g., within 5 lines)
    if (state.currentIndex >= 0 && state.currentIndex < state.history.length) {
      const current = state.history[state.currentIndex];
      if (Math.abs(current.line - line) < 5) {
        return; // Too close, ignore
      }
    }

    // If we're not at the end of the history, truncate the future
    if (state.currentIndex < state.history.length - 1) {
      state.history = state.history.slice(0, state.currentIndex + 1);
    }

    state.history.push({ line, col });
    state.currentIndex = state.history.length - 1;
    
    // Limit history size to 50
    if (state.history.length > 50) {
      state.history.shift();
      state.currentIndex--;
    }

    this.onChange(this.canGoBack(tabId), this.canGoForward(tabId));
  }

  canGoBack(tabId) {
    if (!tabId) return false;
    const state = this._getOrCreate(tabId);
    return state.currentIndex > 0;
  }

  canGoForward(tabId) {
    if (!tabId) return false;
    const state = this._getOrCreate(tabId);
    return state.currentIndex < state.history.length - 1;
  }

  /**
   * @returns { {line: number, col: number} | null }
   */
  goBack(tabId) {
    if (!this.canGoBack(tabId)) return null;
    const state = this._getOrCreate(tabId);
    state.currentIndex--;
    this.onChange(this.canGoBack(tabId), this.canGoForward(tabId));
    return state.history[state.currentIndex];
  }

  /**
   * @returns { {line: number, col: number} | null }
   */
  goForward(tabId) {
    if (!this.canGoForward(tabId)) return null;
    const state = this._getOrCreate(tabId);
    state.currentIndex++;
    this.onChange(this.canGoBack(tabId), this.canGoForward(tabId));
    return state.history[state.currentIndex];
  }

  /**
   * Called when a tab is closed.
   */
  removeTab(tabId) {
    this.histories.delete(tabId);
  }
}
