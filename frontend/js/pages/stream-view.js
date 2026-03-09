(() => {
  /* ── NAVBAR SCROLL SHADOW ── */
  const topNav = document.getElementById('topNav');
  window.addEventListener('scroll', () => {
    topNav.classList.toggle('scrolled', window.scrollY > 8);
  });

  /* ── LIKE BUTTON TOGGLE ── */
  const likeBtn = document.getElementById('likeBtn');
  const likeCount = document.getElementById('likeCount');
  let likeBase = 24100;
  let liked = false;

  likeBtn?.addEventListener('click', () => {
    liked = !liked;
    likeBtn.classList.toggle('liked', liked);
    likeBase += liked ? 1 : -1;
    if (likeCount) {
      likeCount.textContent = likeBase >= 1000
        ? (likeBase / 1000).toFixed(1) + 'K'
        : likeBase;
    }
  });

  /* ── FOLLOW BUTTON TOGGLE ── */
  const followBtn = document.getElementById('followBtn');
  let following = false;

  followBtn?.addEventListener('click', () => {
    following = !following;
    followBtn.classList.toggle('following', following);
    followBtn.textContent = following ? '✓ Following' : '+ Follow';
  });

  /* ── COMMENT SEND ── */
  const commentInput = document.getElementById('commentInput');
  const sendBtn = document.getElementById('sendCommentBtn');
  const commentsList = document.getElementById('commentsList');

  function sendComment() {
    const text = commentInput?.value.trim();
    if (!text) return;

    const li = document.createElement('li');
    li.className = 'comment-item';
    li.innerHTML = `
      <div class="comment-avatar">
        <img src="../assets/icons/player-dashboard-icons/user-profile.png" alt=""
             onerror="this.style.background='rgba(124,58,237,0.3)'" />
      </div>
      <div class="comment-body">
        <span class="comment-username">You</span>
        <p class="comment-text">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>
    `;

    commentsList?.appendChild(li);
    commentInput.value = '';
    /* scroll to bottom */
    if (commentsList) commentsList.scrollTop = commentsList.scrollHeight;
  }

  sendBtn?.addEventListener('click', sendComment);
  commentInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendComment();
  });

  /* ── GIFT BUTTON ── (stub — future: trigger gift transaction modal) ── */
  const giftBtn = document.getElementById('giftBtn');
  giftBtn?.addEventListener('click', () => {
    console.log('[Gift] — gift transaction system not yet implemented');
  });

  /* ── SHARE BUTTON ── (stub) ── */
  const shareBtn = document.getElementById('shareBtn');
  shareBtn?.addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({ title: document.title, url: location.href });
    } else {
      navigator.clipboard?.writeText(location.href);
    }
  });

  /* ── KEYBOARD SHORTCUT: Ctrl/Cmd+K focuses search ── */
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('searchInput')?.focus();
    }
  });
})();