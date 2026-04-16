  // ─── Voice command listeners ───────────────────────────────────────────────
  // Shell-level navigation only. Table/list commands (TABLE_*) and message
  // action commands (MSG_*) are handled by the individual page components
  // that mount their own listeners on the PATHSCRIBE_ events.
  //
  // Components should also call:
  //   mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST)
  // on mount so the registry only matches context-appropriate commands.
  useEffect(() => {
    // ── Page navigation ────────────────────────────────────────────────────
    const openMessages     = () => setPortalOpen(true);
    const openWorklist     = () => navigate('/worklist');
    const openConfig       = () => navigate('/configuration');
    const openSearch       = () => navigate('/search');
    const openAudit        = () => navigate('/audit');
    const openContribution = () => navigate('/contribution');

    // ── Browser history ────────────────────────────────────────────────────
    // navigate(-1)/navigate(1) stays within React Router's history stack.
    // Matches Alt+ArrowLeft / Alt+ArrowRight browser behaviour on Windows.
    const goBack    = () => navigate(-1);
    const goForward = () => navigate(1);

    // ── Case navigation ────────────────────────────────────────────────────
    // Re-dispatched as generic events — page components listen for these
    // and implement prev/next against their own case list.
    const nextCase     = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_NAV_NEXT_CASE'));
    const previousCase = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_NAV_PREVIOUS_CASE'));

    // ── Messages drawer close ─────────────────────────────────────────────
    const closeMessages = () => {
      setPortalOpen(false);
      sessionStorage.removeItem('ps_drawer_open');
    };

    window.addEventListener('PATHSCRIBE_OPEN_MESSAGES',      openMessages);
    window.addEventListener('PATHSCRIBE_OPEN_WORKLIST',      openWorklist);
    window.addEventListener('PATHSCRIBE_OPEN_CONFIGURATION', openConfig);
    window.addEventListener('PATHSCRIBE_OPEN_SEARCH',        openSearch);
    window.addEventListener('PATHSCRIBE_OPEN_AUDIT',         openAudit);
    window.addEventListener('PATHSCRIBE_OPEN_CONTRIBUTION',  openContribution);
    window.addEventListener('PATHSCRIBE_GO_BACK',            goBack);
    window.addEventListener('PATHSCRIBE_GO_FORWARD',         goForward);
    window.addEventListener('PATHSCRIBE_NEXT_CASE',          nextCase);
    window.addEventListener('PATHSCRIBE_PREVIOUS_CASE',      previousCase);
    window.addEventListener('PATHSCRIBE_MSG_CLOSE',          closeMessages);

    return () => {
      window.removeEventListener('PATHSCRIBE_OPEN_MESSAGES',      openMessages);
      window.removeEventListener('PATHSCRIBE_OPEN_WORKLIST',      openWorklist);
      window.removeEventListener('PATHSCRIBE_OPEN_CONFIGURATION', openConfig);
      window.removeEventListener('PATHSCRIBE_OPEN_SEARCH',        openSearch);
      window.removeEventListener('PATHSCRIBE_OPEN_AUDIT',         openAudit);
      window.removeEventListener('PATHSCRIBE_OPEN_CONTRIBUTION',  openContribution);
      window.removeEventListener('PATHSCRIBE_GO_BACK',            goBack);
      window.removeEventListener('PATHSCRIBE_GO_FORWARD',         goForward);
      window.removeEventListener('PATHSCRIBE_NEXT_CASE',          nextCase);
      window.removeEventListener('PATHSCRIBE_PREVIOUS_CASE',      previousCase);
      window.removeEventListener('PATHSCRIBE_MSG_CLOSE',          closeMessages);
    };
  }, [navigate, setPortalOpen]);
